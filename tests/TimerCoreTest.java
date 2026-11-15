package com.sakin.study;

public final class TimerCoreTest {
    static void check(boolean result, String name) {
        if (!result) throw new AssertionError(name);
    }
    public static void main(String[] args) {
        TimerCore timer = new TimerCore();
        timer.configure(20, 15);
        timer.start(1000, 500000);
        check(timer.remaining(61000) == 19 * 60000L, "countdown uses monotonic time");
        check(timer.creditUntil(61000) == 60000, "credits a studied minute");
        timer.pause(61000);
        check(timer.remaining(900000) == 19 * 60000L, "pause freezes countdown");
        timer.start(1000000, 800000);
        long end = timer.deadlineElapsed;
        check(timer.creditUntil(end + 900000) == 19 * 60000L, "late alarm credits only actual session");
        check(timer.finishIfDue(end + 900000), "finishes after background delay");
        check(!timer.finishIfDue(end + 900001), "completion is idempotent");
        check(timer.completedRounds == 1 && timer.sessionFocusMs == 20 * 60000L, "resume preserves study total");
        timer.start(end + 1000000, 10000000);
        check(timer.phase.equals("break") && timer.remaining(end + 1000000) == 15 * 60000L, "completed focus starts break");
        check(timer.creditUntil(end + 1000001) == 0, "break is not counted as study");
        timer.pause(end + 1000010);
        timer.reset();
        timer.next();
        timer.shortFocus(180000);
        check(timer.durationMs == 180000, "short session before prayer");
        timer.start(100, 1000);
        timer.recoverAfterReboot(61000);
        check(timer.status.equals("paused") && timer.remainingMs == 120000, "reboot recovers paused remaining time");
        boolean rejected = false;
        try { timer.configure(0, 5); } catch (IllegalArgumentException e) { rejected = true; }
        check(rejected, "reject invalid durations");
        System.out.println("PASS: timer pause, resume, background, idempotence, breaks, prayer fit, reboot, validation");
    }
}
