package com.sakin.study;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.util.TimeZone;

public final class MainActivity extends Activity {
    private WebView web;
    private NativePresentation presentation;
    private android.window.OnBackInvokedCallback backCallback;
    private final Handler handler=new Handler();
    private LocationListener listener;
    private LocationManager locations;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        // This requested visual refresh starts in light mode once; functional data stays intact.
        if(AppStore.prefs(this).getInt("designVersion",1)<2){
            try{JSONObject settings=AppStore.settings(this);settings.put("theme","light");AppStore.prefs(this).edit().putString("settings",settings.toString()).putInt("designVersion",2).commit();}catch(Exception ignored){ }
        }
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(250,247,242));
        web=new WebView(this);web.setBackgroundColor(Color.rgb(250,247,242));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings config=web.getSettings();config.setJavaScriptEnabled(true);config.setDomStorageEnabled(false);
        config.setAllowFileAccess(false);config.setAllowContentAccess(false);config.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        config.setSupportMultipleWindows(false);config.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(),"Sakin");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"appassets.sakin.local".equals(request.getUrl().getHost());}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if("https".equals(uri.getScheme())&&"appassets.sakin.local".equals(uri.getHost())){
                    String path=uri.getPath();if(path==null||path.contains(".."))return blocked();
                    if(path.equals("/"))path="/index.html";
                    String mime=path.endsWith(".css")?"text/css":path.endsWith(".js")?"application/javascript":path.endsWith(".ttf")?"font/ttf":path.endsWith(".txt")?"text/plain":path.endsWith(".wav")?"audio/wav":"text/html";
                    try{return new WebResourceResponse(mime,mime.startsWith("font/")||mime.startsWith("audio/")?null:"UTF-8",getAssets().open(path.substring(1)));}catch(Exception e){return blocked();}
                }
                return blocked();
            }
            WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
        });
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
        presentation=new NativePresentation(this,root,web);
        if(Build.VERSION.SDK_INT>=33){backCallback=()->handleBack();getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,backCallback);}
        web.loadUrl("https://appassets.sakin.local/index.html");
        Alarms.channels(this);Alarms.scheduleTimer(this,AppStore.loadTimer(this));Alarms.schedulePrayer(this);
        updateScreen();
    }
    @Override protected void onResume(){super.onResume();if(presentation!=null)presentation.resume();updateScreen();Alarms.scheduleTimer(this,AppStore.loadTimer(this));Alarms.schedulePrayer(this);}
    @Override protected void onPause(){if(presentation!=null)presentation.pause();super.onPause();}
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(presentation!=null)presentation.focus(focused);}
    @Override public void onConfigurationChanged(Configuration configuration){super.onConfigurationChanged(configuration);if(presentation!=null)presentation.configuration(configuration);}
    void updateScreen(){if(presentation!=null)presentation.sync();}
    void toast(String value){runOnUiThread(()->Toast.makeText(this,value,Toast.LENGTH_LONG).show());}
    public final class Bridge {
        @JavascriptInterface public String getSnapshot(){
            try{JSONObject snapshot=new JSONObject(AppStore.snapshot(MainActivity.this));if(presentation!=null)snapshot.put("presentation",presentation.snapshot());return snapshot.toString();}
            catch(Exception ignored){return AppStore.snapshot(MainActivity.this);}
        }
        @JavascriptInterface public String command(String action,String payload){
            try{
                boolean wasRunning=AppStore.loadTimer(MainActivity.this).running();
                if(action.equals("playSound")){
                    SoundService.play(MainActivity.this);
                }else if(action.equals("sound")){
                    if(SoundService.active)SoundService.stop(MainActivity.this);else SoundService.play(MainActivity.this);
                }else AppStore.command(MainActivity.this,action,new JSONObject(payload));
                if((action.equals("start")||action.equals("fit"))&&!wasRunning&&AppStore.loadTimer(MainActivity.this).running())Haptics.pulse(MainActivity.this,true);
                if((action.equals("start")||action.equals("fit")||action.equals("sound")||action.equals("playSound"))&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED&&!AppStore.prefs(MainActivity.this).getBoolean("notificationRequested",false)){
                    AppStore.prefs(MainActivity.this).edit().putBoolean("notificationRequested",true).apply();requestNotifications();
                }
                runOnUiThread(()->updateScreen());
                return "";
            }catch(Exception e){return e.getMessage()==null?"تعذّر تنفيذ الطلب":e.getMessage();}
        }
        @JavascriptInterface public String saveSettings(String payload){
            try{AppStore.saveSettings(MainActivity.this,new JSONObject(payload));runOnUiThread(()->updateScreen());SoundService.volume(MainActivity.this);return "";}
            catch(Exception e){return e.getMessage()==null?"راجع الإعدادات":e.getMessage();}
        }
        @JavascriptInterface public void requestNotifications(){runOnUiThread(()->{
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},4);
            else if(!((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).areNotificationsEnabled())startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));
            else Toast.makeText(MainActivity.this,"التنبيهات مفعّلة",Toast.LENGTH_SHORT).show();
        });}
        @JavascriptInterface public void requestExactAlarms(){runOnUiThread(()->{
            try{if(Build.VERSION.SDK_INT>=31&&!Alarms.exactAllowed(MainActivity.this))startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));else Toast.makeText(MainActivity.this,"التوقيت الدقيق مفعّل",Toast.LENGTH_SHORT).show();}
            catch(Exception e){toast("افتح إعدادات التطبيق واسمح بالمنبّهات والتذكيرات");}
        });}
        @JavascriptInterface public void requestLocation(){runOnUiThread(()->{
            if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED&&checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.ACCESS_FINE_LOCATION},5);
            else locate();
        });}
        @JavascriptInterface public void fullscreen(boolean enabled){runOnUiThread(()->{if(presentation!=null)presentation.manual(enabled);});}
    }
    void locate(){
        try{
            locations=(LocationManager)getSystemService(LOCATION_SERVICE);
            if(listener!=null)locations.removeUpdates(listener);
            Criteria criteria=new Criteria();criteria.setAccuracy(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED?Criteria.ACCURACY_FINE:Criteria.ACCURACY_COARSE);
            String provider=locations.getBestProvider(criteria,true);
            if(provider==null){toast("فعّل خدمة الموقع أو اختَر مدينتك يدويًا");return;}
            Location last=locations.getLastKnownLocation(provider);
            if(last!=null&&System.currentTimeMillis()-last.getTime()<15*60000){saveLocation(last);return;}
            listener=new LocationListener(){
                @Override public void onLocationChanged(Location location){if(listener!=null){locations.removeUpdates(this);listener=null;saveLocation(location);}}
                @Override public void onProviderDisabled(String p){}
                @Override public void onProviderEnabled(String p){}
                @Override public void onStatusChanged(String p,int status,Bundle extras){}
            };
            locations.requestLocationUpdates(provider,0,0,listener);
            toast("جاري تحديد الموقع…");
            LocationListener request=listener;
            handler.postDelayed(()->{if(listener==request){locations.removeUpdates(request);listener=null;toast("ما قدرنا نحدد موقعك. اختَر المدينة يدويًا أو جرّب بمكان مفتوح.");}},30000);
        }catch(Exception e){toast("اختَر مدينتك يدويًا من الإعدادات");}
    }
    void saveLocation(Location l){
        try{AppStore.saveSettings(this,new JSONObject().put("configured",true).put("gps",true).put("city","موقعي الحالي").put("latitude",l.getLatitude()).put("longitude",l.getLongitude()).put("timezone",TimeZone.getDefault().getID()));toast("تم ضبط الموقع. راجع المواقيت مع تقويم مسجدك.");}
        catch(Exception e){toast("تعذّر حفظ الموقع");}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==5){if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED)locate();else toast("تقدر تختار مدينتك يدويًا بدون إذن الموقع");}}
    @Override public void onBackPressed(){handleBack();}
    void handleBack(){web.evaluateJavascript("window.sakinBack ? window.sakinBack() : false",value->{if(!"true".equals(value)){if(presentation!=null&&presentation.isImmersive()){presentation.exit();return;}new AlertDialog.Builder(this).setTitle("تطلع من سَكَن؟").setMessage("المؤقّت والصوت بيكملوا إذا كانوا شغالين.").setPositiveButton("خروج",(d,w)->finish()).setNegativeButton("بضل هون",null).show();}});}
    @Override protected void onDestroy(){if(Build.VERSION.SDK_INT>=33&&backCallback!=null)getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);if(presentation!=null)presentation.destroy();if(listener!=null&&locations!=null)locations.removeUpdates(listener);if(web!=null){web.removeJavascriptInterface("Sakin");web.destroy();}super.onDestroy();}
}
