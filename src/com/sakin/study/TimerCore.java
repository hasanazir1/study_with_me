package com.sakin.study;

/** Pure monotonic-clock timer. Android persistence and notifications live outside this class. */
public final class TimerCore {
    public int focusMinutes = 25;
    public int breakMinutes = 5;
    public String phase = "focus";
    public String status = "ready";
    public long remainingMs = 25 * 60000L;
    public long durationMs = remainingMs;
    public long deadlineElapsed = 0;
    public long deadlineWall = 0;
    public long segmentStartElapsed = 0;
    public long segmentStartWall = 0;
    public long sessionFocusMs = 0;
    public int completedRounds = 0;
    public String message = "";
    public long autoBreakElapsed = 0;
    public long autoBreakWall = 0;
    public boolean prayerFit = false;

    public boolean running() { return status.equals("running"); }

    public long remaining(long elapsed) {
        return running() ? Math.max(0, deadlineElapsed - elapsed) : remainingMs;
    }

    public void configure(int focus, int rest) {
        if (focus < 1 || focus > 240 || rest < 1 || rest > 120)
            throw new IllegalArgumentException("Invalid timer duration");
        if (running() || status.equals("paused") || waitingForBreak())
            throw new IllegalStateException("Finish or reset the current timer first");
        focusMinutes = focus;
        breakMinutes = rest;
        phase = "focus";
        reset();
    }

    public void start(long elapsed, long wall) {
        if (running()) return;
        if (status.equals("finished")) next();
        if (remainingMs <= 0) remainingMs = durationMs;
        status = "running";
        deadlineElapsed = elapsed + remainingMs;
        deadlineWall = wall + remainingMs;
        segmentStartElapsed = elapsed;
        segmentStartWall = wall;
        message = "";
        cancelAutoBreak();
    }

    public long creditUntil(long elapsed) {
        if (!running() || !phase.equals("focus")) return 0;
        long end = Math.min(elapsed, deadlineElapsed);
        long delta = Math.max(0, end - segmentStartElapsed);
        sessionFocusMs += delta;
        segmentStartElapsed = end;
        segmentStartWall += delta;
        return delta;
    }

    public void pause(long elapsed) {
        if (!running()) return;
        remainingMs = remaining(elapsed);
        status = "paused";
    }

    public boolean finishIfDue(long elapsed) {
        if (!running() || elapsed < deadlineElapsed) return false;
        remainingMs = 0;
        status = "finished";
        if (phase.equals("focus")) completedRounds++;
        return true;
    }

    public void next() {
        phase = phase.equals("focus") ? "break" : "focus";
        reset();
    }

    public void reset() {
        cancelAutoBreak();
        prayerFit = false;
        status = "ready";
        durationMs = (phase.equals("focus") ? focusMinutes : breakMinutes) * 60000L;
        remainingMs = durationMs;
        deadlineElapsed = 0;
        deadlineWall = 0;
        sessionFocusMs = 0;
        message = "";
    }

    public void shortFocus(long milliseconds) {
        if (running() || status.equals("paused")) throw new IllegalStateException("Timer active");
        phase = "focus";
        reset();
        durationMs = Math.max(60000L, Math.min(focusMinutes * 60000L, milliseconds));
        remainingMs = durationMs;
        prayerFit = true;
    }

    public boolean waitingForBreak() { return status.equals("finished") && autoBreakElapsed > 0; }

    public void queueAutoBreak(long elapsed, long wall) {
        if (!status.equals("finished") || !phase.equals("focus") || prayerFit || waitingForBreak()) return;
        // Five seconds after the completion is delivered, even after a delayed alarm.
        autoBreakElapsed = elapsed + 5000;
        autoBreakWall = wall + 5000;
    }

    public void cancelAutoBreak() { autoBreakElapsed = 0; autoBreakWall = 0; }

    public boolean startBreakIfDue(long elapsed, long wall) {
        if (!waitingForBreak() || elapsed < autoBreakElapsed) return false;
        long start = autoBreakElapsed;
        next();
        start(start, wall - (elapsed - start));
        return true;
    }

    public void recoverAfterReboot(long wall) {
        cancelAutoBreak();
        if (!running()) return;
        remainingMs = Math.max(0, Math.min(durationMs, deadlineWall - wall));
        status = remainingMs > 0 ? "paused" : "finished";
        message = "توقفت الجلسة عند إعادة تشغيل الجوال";
        deadlineElapsed = 0;
    }
}
