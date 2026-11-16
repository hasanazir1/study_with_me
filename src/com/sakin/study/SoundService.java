package com.sakin.study;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.media.session.*;
import android.os.*;
import org.json.*;
import java.io.InputStream;
import java.util.concurrent.*;

/** A continuous native PCM stream: sample-clock loops, layers and fades outside WebView. */
public final class SoundService extends Service {
    static volatile boolean active=false,loading=false;
    private static volatile SoundService instance;
    private static volatile long sleepDeadline=0;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService loader=Executors.newSingleThreadExecutor(),output=Executors.newSingleThreadExecutor();
    private final PcmMixer mixer=new PcmMixer();
    private MediaSession session;
    private AudioManager audio;
    private AudioFocusRequest focus;
    private PowerManager.WakeLock wake;
    private volatile int epoch=0,request=0;
    private volatile boolean destroyed=false;
    private boolean streaming=false,resumeOnGain=false,ducked=false;
    private String current="",label="أصوات الدراسة";
    private String[] ids=new String[0];
    private short[][] samples=new short[0][];
    private JSONObject config;
    private long renewWakeAt=0,nextNotice=0;

    public static void play(Context c){c.startForegroundService(new Intent(c,SoundService.class).setAction("play"));}
    public static void stop(Context c){SoundService s=instance;if(s!=null)s.main.post(()->s.pausePlayback(true,true));}
    public static void volume(Context c){SoundService s=instance;if(s!=null)s.main.post(()->{if(active)s.select();});}
    public static long sleepRemaining(){return sleepDeadline==0?0:Math.max(0,sleepDeadline-SystemClock.elapsedRealtime());}
    public static void setSleep(Context c,int minutes){
        if(minutes<0||minutes>180)throw new IllegalArgumentException("مؤقّت الصوت من صفر إلى ١٨٠ دقيقة");
        sleepDeadline=minutes==0?0:SystemClock.elapsedRealtime()+minutes*60000L;
        SoundService s=instance;if(s!=null)s.main.post(s::publish);
    }
    private final BroadcastReceiver noisy=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){pausePlayback(true,true);}};
    private final Runnable tick=new Runnable(){@Override public void run(){
        if(destroyed||!active)return;
        AppStore.finishDue(SoundService.this);
        if(sleepDeadline>0&&SystemClock.elapsedRealtime()>=sleepDeadline){sleepDeadline=0;pausePlayback(true,true);return;}
        long now=SystemClock.elapsedRealtime();
        if(wake!=null&&(!wake.isHeld()||now>=renewWakeAt)){wake.acquire(2*3600000L);renewWakeAt=now+3600000L;}
        if(sleepDeadline>0&&now>=nextNotice){publish();nextNotice=now+60000;}
        main.postDelayed(this,1000);
    }};
    @Override public void onCreate(){
        super.onCreate();instance=this;audio=(AudioManager)getSystemService(AUDIO_SERVICE);
        wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"sakin:ambience");wake.setReferenceCounted(false);
        session=new MediaSession(this,"Sakin ambience");
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){startPlayback();}
            @Override public void onPause(){pausePlayback(true,true);}
            @Override public void onStop(){pausePlayback(false,true);}
        },main);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        String action=intent==null?"stop":intent.getAction();
        if("play".equals(action))startPlayback();else pausePlayback(!"stop".equals(action),true);
        return START_NOT_STICKY;
    }
    private void startPlayback(){
        if(destroyed)return;
        active=true;resumeOnGain=false;ducked=false;Alarms.channels(this);publish(); // Android 15: foreground before focus.
        if("silence".equals(AppStore.settings(this).optString("sound"))){pausePlayback(false,true);return;}
        if(focus==null){
            focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes()).setWillPauseWhenDucked(false).setOnAudioFocusChangeListener(change->{
                if(change==AudioManager.AUDIOFOCUS_LOSS)pausePlayback(true,true);
                else if(change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT){resumeOnGain=active;pausePlayback(true,false);}
                else if(change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK){ducked=true;applyLevels();}
                else if(change==AudioManager.AUDIOFOCUS_GAIN){ducked=false;if(resumeOnGain)startPlayback();else applyLevels();}
            },main).build();
            if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){error();return;}
        }
        wake.acquire(2*3600000L);renewWakeAt=SystemClock.elapsedRealtime()+3600000L;nextNotice=SystemClock.elapsedRealtime()+60000;
        AppStore.prefs(this).edit().putString("audioError","").apply();
        main.removeCallbacks(tick);main.post(tick);select();
    }
    private static AudioAttributes attributes(){return new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();}
    private void select(){
        if(!active||destroyed)return;
        String selected=AppStore.settings(this).optString("sound","rain");
        if(selected.equals("silence")){pausePlayback(true,true);return;}
        if(selected.equals(current)&&config!=null){request++;loading=false;applyLevels();ensureStream();publish();return;}
        final int token=++request;loading=true;
        loader.execute(()->{
            try{
                JSONObject next=AudioCatalog.get(this,selected);JSONArray layers=next.getJSONArray("layers");
                String[] nextIds=new String[layers.length()];short[][] nextSamples=new short[layers.length()][];
                for(int i=0;i<layers.length();i++){
                    String file=layers.getJSONObject(i).getString("file");
                    if(!file.matches("[a-z]+\\.wav"))throw new IllegalArgumentException("Invalid audio path");
                    nextIds[i]=selected+"_"+i;
                    try(InputStream in=getAssets().open("audio/"+file)){nextSamples[i]=PcmWave.read(in);}
                    if(token!=request||destroyed)return;
                }
                main.post(()->{if(token!=request||!active||destroyed)return;current=selected;config=next;ids=nextIds;samples=nextSamples;label=next.optString("name");loading=false;applyLevels();ensureStream();publish();});
            }catch(Exception e){main.post(()->{if(token==request&&!destroyed)error();});}
        });
    }
    private void applyLevels(){
        if(!active||config==null)return;
        JSONObject settings=AppStore.settings(this),saved=settings.optJSONObject("layerVolumes");
        JSONArray layers=config.optJSONArray("layers");float[] gains=new float[ids.length];
        for(int i=0;i<gains.length;i++){
            JSONObject l=layers.optJSONObject(i);
            gains[i]=(float)l.optDouble("gain",.7)*(saved==null?l.optInt("volume",70):saved.optInt(ids[i],l.optInt("volume",70)))/100f;
        }
        mixer.scene(ids,samples,gains);mixer.levels(ids,gains,settings.optInt("volume",48)/100f,ducked?.2f:1f);
    }
    private void ensureStream(){
        if(streaming||!active)return;streaming=true;final int token=++epoch;
        output.execute(()->{
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO);AudioTrack track=null;
            try{
                int minimum=AudioTrack.getMinBufferSize(PcmMixer.RATE,AudioFormat.CHANNEL_OUT_STEREO,AudioFormat.ENCODING_PCM_16BIT);
                if(minimum<=0)throw new IllegalStateException("Unsupported audio format");
                track=new AudioTrack.Builder().setAudioAttributes(attributes()).setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(PcmMixer.RATE).setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build()).setBufferSizeInBytes(Math.max(minimum*2,PcmMixer.RATE*4/8)).setTransferMode(AudioTrack.MODE_STREAM).build();
                if(track.getState()!=AudioTrack.STATE_INITIALIZED)throw new IllegalStateException("AudioTrack init");
                short[] buffer=new short[2048];track.play();
                while(token==epoch&&!destroyed){
                    mixer.render(buffer);int offset=0;
                    while(offset<buffer.length&&token==epoch){int written=track.write(buffer,offset,buffer.length-offset,AudioTrack.WRITE_BLOCKING);if(written<=0)throw new IllegalStateException("AudioTrack write");offset+=written;}
                }
            }catch(Exception e){main.post(()->{if(token==epoch&&!destroyed)error();});}
            finally{if(track!=null){try{track.pause();track.flush();}catch(Exception ignored){}track.release();}}
        });
    }
    private void pausePlayback(boolean keepNotification,boolean abandon){
        if(destroyed)return;
        active=false;loading=false;request++;sleepDeadline=0;mixer.fadeOut();main.removeCallbacks(tick);
        if(abandon){resumeOnGain=false;if(focus!=null){audio.abandonAudioFocusRequest(focus);focus=null;}}
        final int token=request;
        main.postDelayed(()->{
            if(destroyed||token!=request||active)return;
            streaming=false;epoch++;if(wake.isHeld())wake.release();if(!resumeOnGain)stopForeground(STOP_FOREGROUND_REMOVE);
            mixer.clear();current="";config=null;ids=new String[0];samples=new short[0][];
            if(keepNotification)publish();else stopSelf();
        },1350);
        session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_STOP).setState(PlaybackState.STATE_PAUSED,0,0).build());
    }
    private void error(){AppStore.prefs(this).edit().putString("audioError","تعذّر تشغيل الصوت. أوقفه وجرّب مرة ثانية.").apply();pausePlayback(false,true);}
    private PendingIntent control(String action,int code){
        Intent intent=new Intent(this,SoundService.class).setAction(action);
        return "play".equals(action)?PendingIntent.getForegroundService(this,code,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE):PendingIntent.getService(this,code,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    private void publish(){
        if(destroyed)return;
        session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,label).putString(MediaMetadata.METADATA_KEY_ARTIST,"سَكَن • مساحة هادئة").build());
        session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_STOP).setState(active?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,0,active?1:0).build());session.setActive(true);
        Notification n=new Notification.Builder(this,"ambience").setSmallIcon(R.drawable.ic_notification).setContentTitle("سَكَن • "+label).setContentText(active?(sleepDeadline>0?"الصوت يتوقف بعد "+Math.max(1,(sleepRemaining()+59999)/60000)+" دقيقة":"صوت هادئ، حتى والشاشة مسكّرة"):"الصوت متوقّف • اضغط تشغيل لتكمل").setContentIntent(Alarms.openApp(this)).setOngoing(active).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(new Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this,active?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play),active?"إيقاف مؤقّت":"تشغيل",control(active?"pause":"play",50)).build())
            .addAction(new Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this,android.R.drawable.ic_menu_close_clear_cancel),"إغلاق",control("stop",52)).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0,1)).build();
        if(active){if(Build.VERSION.SDK_INT>=29)startForeground(51,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(51,n);}
        else ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(51,n);
    }
    @Override public void onDestroy(){
        destroyed=true;active=false;loading=false;epoch++;request++;sleepDeadline=0;instance=null;main.removeCallbacksAndMessages(null);
        loader.shutdownNow();output.shutdownNow();if(wake!=null&&wake.isHeld())wake.release();
        if(focus!=null)audio.abandonAudioFocusRequest(focus);unregisterReceiver(noisy);
        session.setActive(false);session.release();((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).cancel(51);stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}
