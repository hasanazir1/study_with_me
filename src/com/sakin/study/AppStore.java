package com.sakin.study;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public final class AppStore {
    public static final Object LOCK = new Object();
    private static String prayerCacheKey = "";
    private static List<PrayerEngine.Event> prayerCache;
    public static SharedPreferences prefs(Context c) { return c.getSharedPreferences("sakin", Context.MODE_PRIVATE); }
    static JSONObject parse(String text) {
        try { return new JSONObject(text); } catch (Exception e) { return new JSONObject(); }
    }
    public static JSONObject settings(Context c) {
        JSONObject s = parse(prefs(c).getString("settings", "{}"));
        try {
            if (!s.has("configured")) s.put("configured", false);
            if (!s.has("city")) s.put("city", "");
            if (!s.has("timezone")) s.put("timezone", TimeZone.getDefault().getID());
            if (!s.has("method")) s.put("method", "MUSLIM_WORLD_LEAGUE");
            if (!s.has("keepScreen")) s.put("keepScreen", true);
            if (!s.has("pauseAtPrayer")) s.put("pauseAtPrayer", true);
            if (!s.has("stopSoundWithTimer")) s.put("stopSoundWithTimer", true);
            if (!s.has("prayerAlerts")) s.put("prayerAlerts", false);
            if (!s.has("prePrayer")) s.put("prePrayer", true);
            if (!s.has("volume")) s.put("volume", 48);
            if (!s.has("autoBreak")) s.put("autoBreak", true);
            if (!s.has("completionSound")) s.put("completionSound", true);
            if (!s.has("layerVolumes")) s.put("layerVolumes", new JSONObject());
            if (!s.has("sound")) s.put("sound", "rain");
            if (!s.has("visualScene")) s.put("visualScene", "rain");
            if (!s.has("theme")) s.put("theme", "light");
            if (!s.has("autoImmersive")) s.put("autoImmersive", true);
            if (!s.has("haptics")) s.put("haptics", true);
            if (!s.has("lightEffects")) s.put("lightEffects", false);
            if (!s.has("task")) s.put("task", "");
            if (!s.has("offsets")) s.put("offsets", new JSONArray("[0,0,0,0,0]"));
            if (!s.has("fajrAngle")) s.put("fajrAngle", 18);
            if (!s.has("ishaAngle")) s.put("ishaAngle", 17);
        } catch (Exception ignored) { }
        return s;
    }
    public static TimerCore loadTimer(Context c) {
        JSONObject j = parse(prefs(c).getString("timer", "{}"));
        TimerCore t = new TimerCore();
        t.focusMinutes = j.optInt("focusMinutes",25);
        t.breakMinutes = j.optInt("breakMinutes",5);
        t.phase = j.optString("phase","focus");
        t.status = j.optString("status","ready");
        t.remainingMs = j.optLong("remainingMs",1500000);
        t.durationMs = j.optLong("durationMs",1500000);
        t.deadlineElapsed = j.optLong("deadlineElapsed");
        t.deadlineWall = j.optLong("deadlineWall");
        t.segmentStartElapsed = j.optLong("segmentStartElapsed");
        t.segmentStartWall = j.optLong("segmentStartWall");
        t.sessionFocusMs = j.optLong("sessionFocusMs");
        t.completedRounds = j.optInt("completedRounds");
        t.message = j.optString("message","");
        t.autoBreakElapsed = j.optLong("autoBreakElapsed");
        t.autoBreakWall = j.optLong("autoBreakWall");
        t.prayerFit = j.optBoolean("prayerFit");
        return t;
    }
    static JSONObject timerJson(TimerCore t) {
        JSONObject j = new JSONObject();
        try {
            j.put("focusMinutes",t.focusMinutes).put("breakMinutes",t.breakMinutes)
             .put("phase",t.phase).put("status",t.status).put("remainingMs",t.remainingMs)
             .put("durationMs",t.durationMs).put("deadlineElapsed",t.deadlineElapsed)
             .put("deadlineWall",t.deadlineWall).put("segmentStartElapsed",t.segmentStartElapsed)
             .put("segmentStartWall",t.segmentStartWall).put("sessionFocusMs",t.sessionFocusMs)
             .put("completedRounds",t.completedRounds).put("message",t.message)
             .put("autoBreakElapsed",t.autoBreakElapsed).put("autoBreakWall",t.autoBreakWall).put("prayerFit",t.prayerFit);
        } catch (Exception ignored) { }
        return j;
    }
    static void saveTimer(Context c, TimerCore t) {
        // commit ensures an alarm or process restart sees the same state as the UI.
        prefs(c).edit().putString("timer",timerJson(t).toString()).commit();
    }
    static String dayKey(long wall) {
        return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date(wall));
    }
    static void credit(Context c, TimerCore t, long elapsed) {
        long start = t.segmentStartWall;
        long delta = t.creditUntil(elapsed);
        if (delta == 0) return;
        SharedPreferences p = prefs(c);
        SharedPreferences.Editor editor = p.edit();
        long end = start + delta;
        while (start < end) {
            Calendar boundary = Calendar.getInstance();
            boundary.setTimeInMillis(start);
            boundary.add(Calendar.DAY_OF_MONTH,1);
            boundary.set(Calendar.HOUR_OF_DAY,0); boundary.set(Calendar.MINUTE,0);
            boundary.set(Calendar.SECOND,0); boundary.set(Calendar.MILLISECOND,0);
            long chunkEnd = Math.min(end,boundary.getTimeInMillis());
            String key = "study." + dayKey(start);
            editor.putLong(key,p.getLong(key,0) + chunkEnd - start);
            start = chunkEnd;
        }
        editor.commit();
    }
    public static boolean finishDue(Context c) {
        synchronized (LOCK) {
            TimerCore t = loadTimer(c);
            long now = SystemClock.elapsedRealtime();
            if (t.startBreakIfDue(now,System.currentTimeMillis())) {
                saveTimer(c,t);
                Alarms.scheduleTimer(c,t);
            }
            if (!t.running() || now < t.deadlineElapsed) return false;
            credit(c,t,now);
            t.finishIfDue(now);
            if(settings(c).optBoolean("autoBreak",true)) t.queueAutoBreak(now,System.currentTimeMillis());
            if (t.phase.equals("focus")) {
                String key = "rounds." + dayKey(t.deadlineWall);
                prefs(c).edit().putInt(key,prefs(c).getInt(key,0)+1).commit();
            }
            saveTimer(c,t);
            Alarms.scheduleTimer(c,t);
            Alarms.timerFinished(c,t.phase.equals("focus"),t.waitingForBreak());
            Haptics.pulse(c,false);
            if (settings(c).optBoolean("stopSoundWithTimer",true)) SoundService.stop(c);
            return true;
        }
    }
    public static void command(Context c, String action, JSONObject data) throws Exception {
        synchronized (LOCK) {
            finishDue(c);
            TimerCore t = loadTimer(c);
            long elapsed = SystemClock.elapsedRealtime(), wall = System.currentTimeMillis();
            switch (action) {
                case "start": t.start(elapsed,wall); break;
                case "pause": credit(c,t,elapsed); t.pause(elapsed); break;
                case "reset": credit(c,t,elapsed); t.reset(); break;
                case "next": credit(c,t,elapsed); t.next(); break;
                case "cancelAutoBreak": t.cancelAutoBreak(); break;
                case "preset": t.configure(data.getInt("focus"),data.getInt("rest")); break;
                case "fit":
                    PrayerEngine.Event next = PrayerEngine.next(prayers(c),wall);
                    if (next == null || next.time-wall < 120000) throw new IllegalStateException("الصلاة قريبة؛ خذ استراحة وارجع بعدها");
                    t.shortFocus(next.time-wall-60000);
                    t.start(elapsed,wall);
                    break;
                case "prayed":
                    String id=data.getString("id"), day=data.getString("day");
                    if (!java.util.Arrays.asList(PrayerEngine.IDS).contains(id) || !day.matches("\\d{4}-\\d{2}-\\d{2}"))
                        throw new IllegalArgumentException("Invalid prayer");
                    prefs(c).edit().putBoolean("prayed."+day+"."+id,data.optBoolean("value")).commit();
                    return;
                default: throw new IllegalArgumentException("Unknown action");
            }
            saveTimer(c,t);
            Alarms.scheduleTimer(c,t);
            if ((action.equals("pause") || action.equals("reset") || action.equals("next")) && settings(c).optBoolean("stopSoundWithTimer",true)) SoundService.stop(c);
        }
    }
    public static List<PrayerEngine.Event> prayers(Context c) {
        JSONObject s=settings(c);
        if (!s.optBoolean("configured")) return java.util.Collections.emptyList();
        String zone=s.optBoolean("gps") ? TimeZone.getDefault().getID() : s.optString("timezone");
        SimpleDateFormat date = new SimpleDateFormat("yyyy-MM-dd",Locale.US);
        date.setTimeZone(TimeZone.getTimeZone(zone));
        String cache=s.toString()+date.format(new Date());
        if (cache.equals(prayerCacheKey) && prayerCache != null) return prayerCache;
        JSONArray offsets=s.optJSONArray("offsets");
        int[] minutes=new int[5];
        for (int i=0;i<5;i++) minutes[i]=offsets==null?0:offsets.optInt(i);
        List<PrayerEngine.Event> result=PrayerEngine.events(s.optDouble("latitude"),s.optDouble("longitude"),zone,s.optString("method"),s.optBoolean("hanafi"),s.optDouble("fajrAngle",18),s.optDouble("ishaAngle",17),minutes,System.currentTimeMillis());
        prayerCacheKey=cache; prayerCache=result;
        return result;
    }
    public static void saveSettings(Context c, JSONObject changes) throws Exception {
        synchronized (LOCK) {
            JSONObject s=settings(c);
            java.util.Iterator<String> keys=changes.keys();
            String allowed=" configured city timezone latitude longitude gps method hanafi offsets fajrAngle ishaAngle keepScreen pauseAtPrayer stopSoundWithTimer prayerAlerts prePrayer volume sound theme task autoImmersive haptics lightEffects autoBreak completionSound layerVolumes visualScene ";
            while(keys.hasNext()) { String k=keys.next(); if (allowed.contains(" "+k+" ")) s.put(k,changes.get(k)); }
            if(s.optBoolean("configured")) {
                double lat=s.optDouble("latitude"),lon=s.optDouble("longitude");
                if (!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) throw new IllegalArgumentException("الإحداثيات غير صحيحة");
                if (!java.util.Arrays.asList(TimeZone.getAvailableIDs()).contains(s.optString("timezone"))) throw new IllegalArgumentException("المنطقة الزمنية غير صحيحة");
            }
            if (s.optString("city").length()>80 || s.optString("task").length()>120) throw new IllegalArgumentException("النص طويل جدًا");
            if (s.optInt("volume")<0||s.optInt("volume")>100) throw new IllegalArgumentException("Invalid volume");
            if (!java.util.Arrays.asList("rain","ocean","stream","brown","silence").contains(s.optString("sound"))) throw new IllegalArgumentException("Invalid sound");
            if (!java.util.Arrays.asList("rain","nature","fire","cafe","night","quiet").contains(s.optString("visualScene"))) throw new IllegalArgumentException("Invalid visual scene");
            JSONObject layers=s.getJSONObject("layerVolumes");
            java.util.Iterator<String> layerKeys=layers.keys();
            while(layerKeys.hasNext()) {String key=layerKeys.next();if(!key.matches("(rain|ocean|stream|brown)_[01]")||layers.getInt(key)<0||layers.getInt(key)>100)throw new IllegalArgumentException("Invalid layer volume");}
            JSONArray offsets=s.getJSONArray("offsets");
            if (offsets.length()!=5) throw new IllegalArgumentException("Invalid offsets");
            for(int i=0;i<5;i++) if(Math.abs(offsets.getInt(i))>60) throw new IllegalArgumentException("التعديل المسموح من −٦٠ إلى ٦٠ دقيقة");
            if (s.optDouble("fajrAngle")<10||s.optDouble("fajrAngle")>23||s.optDouble("ishaAngle")<10||s.optDouble("ishaAngle")>23) throw new IllegalArgumentException("زاوية الحساب بين ١٠ و٢٣ درجة");
            prefs(c).edit().putString("settings",s.toString()).commit();
            if(!s.optBoolean("autoBreak",true)){TimerCore t=loadTimer(c);if(t.waitingForBreak()){t.cancelAutoBreak();saveTimer(c,t);Alarms.scheduleTimer(c,t);}}
            prayerCacheKey="";
            Alarms.schedulePrayer(c);
        }
    }
    public static void pauseForPrayer(Context c,String name) {
        synchronized (LOCK) {
            finishDue(c);
            TimerCore t=loadTimer(c);
            boolean pause=settings(c).optBoolean("pauseAtPrayer",true);
            if(t.waitingForBreak() && pause) {
                t.cancelAutoBreak();t.message="حان وقت "+name+". الراحة محفوظة، ابدأها لما ترجع.";
                saveTimer(c,t);Alarms.cancelTimer(c);
            }
            if(t.running() && pause) {
                long now=SystemClock.elapsedRealtime(); credit(c,t,now); t.pause(now);
                t.message="حان وقت "+name+". صلِّ، وكمّل جلستك لما ترجع.";
                saveTimer(c,t); Alarms.cancelTimer(c);
            }
            if(pause) SoundService.stop(c);
        }
    }
    public static String snapshot(Context c) {
        synchronized (LOCK) {
            finishDue(c);
            JSONObject result=new JSONObject();
            try {
                TimerCore t=loadTimer(c);
                JSONObject timer=timerJson(t);
                timer.put("remainingMs",t.remaining(SystemClock.elapsedRealtime()));
                timer.put("autoBreakRemainingMs",t.waitingForBreak()?Math.max(0,t.autoBreakElapsed-SystemClock.elapsedRealtime()):0);
                result.put("timer",timer);
                JSONObject s=settings(c); result.put("settings",s);
                result.put("now",System.currentTimeMillis());
                result.put("deviceTimezone",TimeZone.getDefault().getID());
                long total=prefs(c).getLong("study."+dayKey(System.currentTimeMillis()),0);
                if(t.running()&&t.phase.equals("focus")) {
                    long end=t.segmentStartWall+Math.max(0,Math.min(SystemClock.elapsedRealtime(),t.deadlineElapsed)-t.segmentStartElapsed);
                    Calendar boundary=Calendar.getInstance();
                    boundary.set(Calendar.HOUR_OF_DAY,0);boundary.set(Calendar.MINUTE,0);boundary.set(Calendar.SECOND,0);boundary.set(Calendar.MILLISECOND,0);
                    total+=Math.max(0,end-Math.max(t.segmentStartWall,boundary.getTimeInMillis()));
                }
                result.put("todayMs",total).put("todayRounds",prefs(c).getInt("rounds."+dayKey(System.currentTimeMillis()),0));
                result.put("soundPlaying",SoundService.active);
                result.put("soundLoading",SoundService.loading);
                result.put("sleepRemainingMs",SoundService.sleepRemaining());
                result.put("audioError",prefs(c).getString("audioError",""));
                result.put("exactAlarms",Alarms.exactAllowed(c));
                result.put("notifications",Alarms.notificationsAllowed(c));
                JSONArray all=new JSONArray();
                try {
                    for(PrayerEngine.Event e:prayers(c)) {
                        JSONObject j=new JSONObject().put("id",e.id).put("name",e.name).put("day",e.day).put("time",e.time)
                            .put("prayed",prefs(c).getBoolean("prayed."+e.day+"."+e.id,false));
                        all.put(j);
                    }
                } catch(Exception e) { result.put("prayerError","تعذّر حساب المواقيت لهذا الموقع. راجع الموقع وطريقة الحساب."); }
                result.put("prayers",all);
            } catch(Exception e) { }
            return result.toString();
        }
    }
}
