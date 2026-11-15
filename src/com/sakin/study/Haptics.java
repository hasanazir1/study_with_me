package com.sakin.study;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.provider.Settings;

public final class Haptics {
    private Haptics() { }
    public static void pulse(Context context, boolean start) {
        if (!AppStore.settings(context).optBoolean("haptics",true)) return;
        if (Settings.System.getInt(context.getContentResolver(),Settings.System.HAPTIC_FEEDBACK_ENABLED,1)==0) return;
        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT>=31) {
                VibratorManager manager=(VibratorManager)context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator=manager==null?null:manager.getDefaultVibrator();
            } else vibrator=(Vibrator)context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator==null || !vibrator.hasVibrator()) return;
            vibrator.vibrate(VibrationEffect.createOneShot(start?14:28,45));
        } catch (RuntimeException ignored) { }
    }
}
