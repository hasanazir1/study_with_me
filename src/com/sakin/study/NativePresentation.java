package com.sakin.study;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import org.json.JSONObject;

/** Activity-owned immersive mode, orientation, insets and session-only keep-awake. */
public final class NativePresentation {
    private final Activity activity;
    private final View root;
    private final WebView web;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private volatile boolean immersive=false;
    private volatile boolean orientationLocked=false;
    private boolean running=false, resumed=false;
    private volatile boolean awake=false;
    private String theme="";
    private final Runnable poll=new Runnable(){
        @Override public void run(){if(!resumed)return;AppStore.finishDue(activity);sync();handler.postDelayed(this,750);}
    };

    public NativePresentation(Activity activity,View root,WebView web) {
        this.activity=activity;this.root=root;this.web=web;
        Window window=activity.getWindow();
        if(Build.VERSION.SDK_INT>=30) window.setDecorFitsSystemWindows(false);
        window.setStatusBarColor(Color.TRANSPARENT);window.setNavigationBarColor(Color.TRANSPARENT);
        if(Build.VERSION.SDK_INT>=29)window.setNavigationBarContrastEnforced(false);
        WindowManager.LayoutParams attrs=window.getAttributes();
        attrs.rotationAnimation=WindowManager.LayoutParams.ROTATION_ANIMATION_SEAMLESS;
        if(Build.VERSION.SDK_INT>=28)attrs.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        window.setAttributes(attrs);
        root.setOnApplyWindowInsetsListener((view,insets)->applyInsets(insets));
        updateBars();
    }
    public void resume(){resumed=true;handler.removeCallbacks(poll);handler.post(poll);updateBars();}
    public void pause(){resumed=false;handler.removeCallbacks(poll);setAwake(false);}
    public void destroy(){pause();unlock();}
    public boolean isImmersive(){return immersive;}
    public void sync(){
        TimerCore timer=AppStore.loadTimer(activity);
        JSONObject settings=AppStore.settings(activity);
        boolean nextRunning=timer.running()||timer.waitingForBreak()||timer.status.equals("paused");
        if(nextRunning&&!running&&settings.optBoolean("autoImmersive",true))enter(true);
        else if(!nextRunning&&running)exit();
        if(orientationLocked&&!settings.optBoolean("autoImmersive",true))exit();
        running=nextRunning;
        setAwake(resumed&&(timer.running()||timer.waitingForBreak())&&settings.optBoolean("keepScreen",true));
        String nextTheme=settings.optString("theme","light");
        if(!nextTheme.equals(theme)){theme=nextTheme;int color=Color.parseColor(theme.equals("dark")?"#152C30":"#FAF7F2");root.setBackgroundColor(color);web.setBackgroundColor(color);updateBars();}
    }
    private void setAwake(boolean value){
        if(awake==value)return;awake=value;
        if(value)activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    public void manual(boolean enabled){if(enabled)enter(false);else exit();}
    private void enter(boolean session){
        immersive=true;
        // Orientation is an Activity operation, never a WebView Fullscreen API call.
        if(session){
            try{activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);orientationLocked=true;}
            catch(RuntimeException ignored){orientationLocked=false;}
        }
        updateBars();notifyWeb();
    }
    private void unlock(){
        if(!orientationLocked)return;
        orientationLocked=false;
        try{activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);}catch(RuntimeException ignored){ }
    }
    public void exit(){
        unlock();immersive=false;updateBars();notifyWeb();
    }
    public void focus(boolean focused){if(focused)updateBars();}
    public void configuration(Configuration configuration){root.requestApplyInsets();updateBars();notifyWeb();}
    private void updateBars(){
        boolean light=!theme.equals("dark");
        if(Build.VERSION.SDK_INT>=30){
            WindowInsetsController controller=activity.getWindow().getInsetsController();
            if(controller!=null){
                int appearance=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                controller.setSystemBarsAppearance(light?appearance:0,appearance);
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if(immersive)controller.hide(WindowInsets.Type.systemBars());else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            int flags=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if(immersive)flags|=View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            if(light){flags|=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;if(Build.VERSION.SDK_INT>=26)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;}
            activity.getWindow().getDecorView().setSystemUiVisibility(flags);
        }
        root.requestApplyInsets();
    }
    private WindowInsets applyInsets(WindowInsets insets){
        int left=0,top=0,right=0,bottom=0;
        if(Build.VERSION.SDK_INT>=30){
            android.graphics.Insets safe=insets.getInsets(immersive?WindowInsets.Type.displayCutout():WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
            left=safe.left;top=safe.top;right=safe.right;bottom=safe.bottom;
            if(immersive)bottom=Math.max(bottom,insets.getInsets(WindowInsets.Type.mandatorySystemGestures()).bottom);
            bottom=Math.max(bottom,insets.getInsets(WindowInsets.Type.ime()).bottom);
        } else {
            if(!immersive){left=insets.getSystemWindowInsetLeft();top=insets.getSystemWindowInsetTop();right=insets.getSystemWindowInsetRight();bottom=insets.getSystemWindowInsetBottom();}
            if(Build.VERSION.SDK_INT>=28){DisplayCutout c=insets.getDisplayCutout();if(c!=null){left=Math.max(left,c.getSafeInsetLeft());top=Math.max(top,c.getSafeInsetTop());right=Math.max(right,c.getSafeInsetRight());bottom=Math.max(bottom,c.getSafeInsetBottom());}}
            // On pre-30 Android a large bottom inset represents the soft keyboard.
            int keyboard=insets.getSystemWindowInsetBottom();
            if(keyboard>activity.getResources().getDisplayMetrics().heightPixels/4)bottom=Math.max(bottom,keyboard);
        }
        // Insets are applied exactly once here; the WebView receives a safe viewport.
        if(root.getPaddingLeft()!=left||root.getPaddingTop()!=top||root.getPaddingRight()!=right||root.getPaddingBottom()!=bottom)root.setPadding(left,top,right,bottom);
        return insets;
    }
    private void notifyWeb(){web.evaluateJavascript("window.sakinNativePresentation && window.sakinNativePresentation()",null);}
    public JSONObject snapshot(){
        JSONObject result=new JSONObject();
        try{result.put("immersive",immersive).put("orientationLocked",orientationLocked).put("awake",awake).put("nativeSafeArea",true);}catch(Exception ignored){ }
        return result;
    }
}
