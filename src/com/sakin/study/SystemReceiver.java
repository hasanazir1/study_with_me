package com.sakin.study;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class SystemReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent intent) {
        String a=intent.getAction();
        if(!Intent.ACTION_BOOT_COMPLETED.equals(a)&&!Intent.ACTION_TIME_CHANGED.equals(a)&&!Intent.ACTION_TIMEZONE_CHANGED.equals(a)&&!Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)&&!"android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(a)) return;
        synchronized(AppStore.LOCK) {
            TimerCore t=AppStore.loadTimer(c);
            if(Intent.ACTION_BOOT_COMPLETED.equals(a)) {
                t.recoverAfterReboot(System.currentTimeMillis());AppStore.saveTimer(c,t);
                AppStore.prefs(c).edit().putBoolean("soundPlaying",false).commit();
            }
            Alarms.scheduleTimer(c,t);Alarms.schedulePrayer(c);
        }
    }
}
