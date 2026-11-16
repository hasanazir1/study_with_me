package com.sakin.study;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

public final class Alarms {
    static final String TIMER="com.sakin.study.TIMER", PRAYER="com.sakin.study.PRAYER", PRE="com.sakin.study.PRE";
    static AlarmManager manager(Context c) { return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE); }
    static PendingIntent pending(Context c,String action,int code,String name,long at) {
        return PendingIntent.getBroadcast(c,code,new Intent(c,AlarmReceiver.class).setAction(action).putExtra("name",name).putExtra("at",at),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    public static boolean exactAllowed(Context c) { return Build.VERSION.SDK_INT<31 || manager(c).canScheduleExactAlarms(); }
    public static boolean notificationsAllowed(Context c) {
        return (Build.VERSION.SDK_INT<33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)
            && ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled();
    }
    static void schedule(Context c,int type,long at,PendingIntent intent) {
        try {
            if(exactAllowed(c)) manager(c).setExactAndAllowWhileIdle(type,at,intent);
            else manager(c).setAndAllowWhileIdle(type,at,intent);
        } catch(SecurityException e) { manager(c).setAndAllowWhileIdle(type,at,intent); }
    }
    public static void scheduleTimer(Context c,TimerCore t) {
        cancelTimer(c);
        if(t.running()||t.waitingForBreak()) schedule(c,AlarmManager.ELAPSED_REALTIME_WAKEUP,t.waitingForBreak()?t.autoBreakElapsed:t.deadlineElapsed,pending(c,TIMER,10,"",0));
    }
    public static void cancelTimer(Context c) { manager(c).cancel(pending(c,TIMER,10,"",0)); }
    public static void schedulePrayer(Context c) {
        manager(c).cancel(pending(c,PRAYER,20,"",0));
        manager(c).cancel(pending(c,PRE,21,"",0));
        org.json.JSONObject s=AppStore.settings(c);
        if(!s.optBoolean("configured") || (!s.optBoolean("prayerAlerts")&&!s.optBoolean("pauseAtPrayer",true))) return;
        try {
            long now=System.currentTimeMillis();
            PrayerEngine.Event next=PrayerEngine.next(AppStore.prayers(c),now+1000);
            if(next==null) return;
            schedule(c,AlarmManager.RTC_WAKEUP,next.time,pending(c,PRAYER,20,next.name,next.time));
            if(s.optBoolean("prayerAlerts")&&s.optBoolean("prePrayer",true)&&next.time-300000>now)
                schedule(c,AlarmManager.RTC_WAKEUP,next.time-300000,pending(c,PRE,21,next.name,next.time));
        } catch(Exception ignored) { }
    }
    public static void channels(Context c) {
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel timer=new NotificationChannel("timer_v2","نهاية الجلسة — نغمة سَكَن",NotificationManager.IMPORTANCE_HIGH);
        timer.setSound(android.net.Uri.parse("android.resource://"+c.getPackageName()+"/raw/session_end"),new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        timer.setDescription("تنبيه خفيف عند انتهاء الدراسة أو الاستراحة");timer.enableVibration(false);
        nm.createNotificationChannel(timer);
        NotificationChannel quiet=new NotificationChannel("timer_quiet","نهاية الجلسة — بدون نغمة",NotificationManager.IMPORTANCE_HIGH);
        quiet.setSound(null,null);quiet.enableVibration(false);nm.createNotificationChannel(quiet);
        NotificationChannel prayer=new NotificationChannel("prayer","تنبيهات الصلاة",NotificationManager.IMPORTANCE_HIGH);
        prayer.setDescription("تنبيه عند الصلاة وقبلها بخمس دقائق"); prayer.enableVibration(true);
        nm.createNotificationChannel(prayer);
        NotificationChannel sound=new NotificationChannel("ambience","أصوات الدراسة",NotificationManager.IMPORTANCE_LOW);
        sound.setSound(null,null);sound.enableVibration(false);nm.createNotificationChannel(sound);
    }
    public static PendingIntent openApp(Context c) {
        return PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void notify(Context c,int id,String channel,String title,String body) {
        channels(c);
        if(!notificationsAllowed(c)) return;
        Notification n=new Notification.Builder(c,channel).setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body))
            .setContentIntent(openApp(c)).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER).build();
        ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id,n);
    }
    public static void timerFinished(Context c,boolean focus,boolean autoBreak) {
        boolean audible=AppStore.settings(c).optBoolean("completionSound",true);
        notify(c,40,audible?"timer_v2":"timer_quiet",focus?"أحسنت، خلصت جلستك 🌿":"انتهت الاستراحة",focus?(autoBreak?"راحتك تبدأ تلقائيًا بعد خمس ثوانٍ. تقدر تلغيها من التطبيق.":"خذ نفس وابدأ راحتك لما تكون جاهز."):"جاهز لجلسة جديدة؟ افتح سَكَن وابدأ.");
        if(audible&&!notificationsAllowed(c)&&MainActivity.visible)CompletionTone.play(c);
    }
    public static void prayer(Context c,String name,boolean before) {
        notify(c,before?42:41,"prayer",before?"باقي خمس دقائق على "+name:"حان وقت صلاة "+name,before?"فرصة تختم هالجزء وتجهز للصلاة.":"تقبّل الله. جلستك محفوظة، كمّل لما ترجع.");
    }
}
