package com.sakin.study;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;

/** Foreground fallback only. Background delivery belongs to the notification channel. */
public final class CompletionTone {
    public static void play(Context context) {
        Context app=context.getApplicationContext();
        new Handler(Looper.getMainLooper()).post(()->{
            AudioManager audio=(AudioManager)app.getSystemService(Context.AUDIO_SERVICE);
            if(audio.getRingerMode()!=AudioManager.RINGER_MODE_NORMAL)return;
            MediaPlayer player=new MediaPlayer();
            try(android.content.res.AssetFileDescriptor fd=app.getResources().openRawResourceFd(R.raw.session_end)){
                player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                player.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());
                player.setOnCompletionListener(MediaPlayer::release);
                player.setOnErrorListener((p,w,e)->{p.release();return true;});
                player.setOnPreparedListener(MediaPlayer::start);player.prepareAsync();
            }catch(Exception ignored){player.release();}
        });
    }
}
