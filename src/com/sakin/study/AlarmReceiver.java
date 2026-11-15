package com.sakin.study;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent intent) {
        String action=intent.getAction();
        if(Alarms.TIMER.equals(action)) {
            if(!AppStore.finishDue(c)) Alarms.scheduleTimer(c,AppStore.loadTimer(c));
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
