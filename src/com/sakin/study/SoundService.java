package com.sakin.study;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import org.json.JSONObject;

public final class SoundService extends Service {
    static volatile boolean active=false;
    private MediaPlayer player;
    private MediaSession session;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private String current="";
    public static void stop(Context c) { c.stopService(new Intent(c,SoundService.class)); }
    public static void play(Context c) {
        Intent i=new Intent(c,SoundService.class).setAction("play");
        c.startForegroundService(i);
    }
    public static void volume(Context c) {
        if(active)c.startService(new Intent(c,SoundService.class).setAction("volume"));
    }
    @Override public void onCreate() {
        super.onCreate();audio=(AudioManager)getSystemService(AUDIO_SERVICE);
        session=new MediaSession(this,"Sakin ambience");
        session.setCallback(new MediaSession.Callback(){@Override public void onStop(){stopSelf();}@Override public void onPause(){stopSelf();}});
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if(intent==null||"stop".equals(intent.getAction())) {stopSelf();return START_NOT_STICKY;}
        if("volume".equals(intent.getAction())&&player!=null) {applyVolume();return START_NOT_STICKY;}
        JSONObject s=AppStore.settings(this);
        String sound=s.optString("sound","rain");
        if(!java.util.Arrays.asList("rain","ocean","stream","brown").contains(sound)){stopSelf();return START_NOT_STICKY;}
        String label=sound.equals("rain")?"مطر هادئ":sound.equals("ocean")?"أمواج البحر":sound.equals("stream")?"خرير المياه":"ضجيج بني";
        Alarms.channels(this);
        PendingIntent stop=PendingIntent.getService(this,50,new Intent(this,SoundService.class).setAction("stop"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification n=new Notification.Builder(this,"ambience").setSmallIcon(R.drawable.ic_notification).setContentTitle("سَكَن • "+label)
            .setContentText("مساحة هادئة لدراستك").setContentIntent(Alarms.openApp(this)).setOngoing(true)
            .addAction(new Notification.Action.Builder(null,"إيقاف الصوت",stop).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0)).build();
        if(Build.VERSION.SDK_INT>=29)startForeground(51,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(51,n);
        if(sound.equals(current)&&player!=null){applyVolume();return START_NOT_STICKY;}
        releasePlayer();
        try {
            AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
            focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attrs).setOnAudioFocusChangeListener(change->{
                if(change==AudioManager.AUDIOFOCUS_LOSS||change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)stopSelf();
                else if(change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK&&player!=null)player.setVolume(.1f,.1f);
                else if(change==AudioManager.AUDIOFOCUS_GAIN)applyVolume();
            }).build();
            if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)throw new IllegalStateException("Audio focus unavailable");
            MediaPlayer created=new MediaPlayer();player=created;created.setAudioAttributes(attrs);created.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
            try(AssetFileDescriptor fd=getAssets().openFd("audio/"+sound+".wav")) {created.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());}
            created.setLooping(true);current=sound;
            created.setOnPreparedListener(p->{
                if(player!=p)return;
                applyVolume();p.start();active=true;
                AppStore.prefs(this).edit().putBoolean("soundPlaying",true).putString("audioError","").apply();
                session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_STOP|PlaybackState.ACTION_PAUSE).setState(PlaybackState.STATE_PLAYING,0,1).build());session.setActive(true);
            });
            created.setOnErrorListener((p,what,extra)->{AppStore.prefs(this).edit().putString("audioError","تعذّر تشغيل الصوت، جرّب مرة ثانية").apply();stopSelf();return true;});
            created.prepareAsync();
        }catch(Exception e){AppStore.prefs(this).edit().putString("audioError","تعذّر تشغيل الصوت، جرّب مرة ثانية").apply();stopSelf();}
        return START_NOT_STICKY;
    }
    void applyVolume(){if(player!=null){float v=AppStore.settings(this).optInt("volume",55)/100f;player.setVolume(v,v);}}
    void releasePlayer(){active=false;if(player!=null){player.release();player=null;}current="";if(focus!=null){audio.abandonAudioFocusRequest(focus);focus=null;}}
    @Override public void onDestroy(){releasePlayer();if(session!=null){session.setActive(false);session.release();}AppStore.prefs(this).edit().putBoolean("soundPlaying",false).apply();stopForeground(true);super.onDestroy();}
    @Override public IBinder onBind(Intent i){return null;}
}
