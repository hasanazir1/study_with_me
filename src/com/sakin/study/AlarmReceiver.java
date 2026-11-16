package com.sakin.study;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent intent) {
        String action=intent.getAction();
        if(Alarms.TIMER.equals(action)) {
            if(!AppStore.finishDue(c)) Alarms.scheduleTimer(c,AppStore.loadTimer(c));
            TimerCore timer=AppStore.loadTimer(c);
            if(timer.waitingForBreak()){
                // AllowWhileIdle alarms have a per-app quota. Do not depend on another
                // such alarm only five seconds later: finish this short grace in-process.
                long delay=Math.max(0,Math.min(5100,timer.autoBreakElapsed-android.os.SystemClock.elapsedRealtime()+30));
                PendingResult pending=goAsync();
                android.os.PowerManager.WakeLock lock=((android.os.PowerManager)c.getSystemService(Context.POWER_SERVICE)).newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK,"sakin:rest-grace");
                lock.acquire(8000);
                Context app=c.getApplicationContext();
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(()->{
                    try{AppStore.finishDue(app);Alarms.scheduleTimer(app,AppStore.loadTimer(app));}
                    finally{if(lock.isHeld())lock.release();pending.finish();}
                },delay);
            }
        } else if(Alarms.PRAYER.equals(action)) {
            long lateness=System.currentTimeMillis()-intent.getLongExtra("at",0);
            if(lateness<15*60000L && lateness>=-2000) {
                String name=intent.getStringExtra("name");
                AppStore.pauseForPrayer(c,name==null?"الصلاة":name);
                if(AppStore.settings(c).optBoolean("prayerAlerts")) Alarms.prayer(c,name,false);
            }
            Alarms.schedulePrayer(c);
        } else if(Alarms.PRE.equals(action)) {
            long remaining=intent.getLongExtra("at",0)-System.currentTimeMillis();
            if(remaining>0&&remaining<=301000&&AppStore.settings(c).optBoolean("prayerAlerts")) Alarms.prayer(c,intent.getStringExtra("name"),true);
        }
    }
}
