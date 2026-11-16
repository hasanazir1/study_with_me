package com.sakin.study;

import java.util.ArrayList;

/** Pure sample-clock stereo mixer. No allocation, file IO or Android calls in render(). */
public final class PcmMixer {
    public static final int RATE=32000;
    private static final float STEP=1f/(RATE*1.2f);
    private final ArrayList<Layer> layers=new ArrayList<>();
    private float master=0, masterTarget=.48f, duck=1, duckTarget=1;
    private static final class Layer {
        final String id;final short[] pcm;int cursor;float gain,target;
        Layer(String id,short[] pcm){this.id=id;this.pcm=pcm;}
    }
    public synchronized void scene(String[] ids,short[][] pcm,float[] gains) {
        for(Layer l:layers)l.target=0;
        for(int i=0;i<ids.length;i++){
            Layer found=null;
            for(Layer l:layers)if(l.id.equals(ids[i])){found=l;break;}
            if(found==null){found=new Layer(ids[i],pcm[i]);layers.add(found);}
            found.target=clamp(gains[i]);
        }
    }
    public synchronized void levels(String[] ids,float[] gains,float volume,float attenuation) {
        masterTarget=clamp(volume)*.86f;
        duckTarget=clamp(attenuation);
        for(Layer l:layers){
            l.target=0;
            for(int i=0;i<ids.length;i++)if(l.id.equals(ids[i]))l.target=clamp(gains[i]);
        }
    }
    public synchronized void fadeOut(){for(Layer l:layers)l.target=0;masterTarget=0;}
    public synchronized void clear(){layers.clear();master=0;masterTarget=0;}
    public synchronized void render(short[] output) {
        for(int frame=0;frame<output.length;frame+=2){
            master=approach(master,masterTarget,STEP);duck=approach(duck,duckTarget,1f/(RATE*.2f));
            float left=0,right=0;
            for(int i=0;i<layers.size();i++){
                Layer l=layers.get(i);
                l.gain=approach(l.gain,l.target,STEP);
                left+=l.pcm[l.cursor]*l.gain;right+=l.pcm[l.cursor+1]*l.gain;
                l.cursor+=2;if(l.cursor>=l.pcm.length)l.cursor=0;
            }
            output[frame]=(short)Math.max(-32767,Math.min(32767,Math.round(left*master*duck)));
            output[frame+1]=(short)Math.max(-32767,Math.min(32767,Math.round(right*master*duck)));
        }
        // Old scenes release PCM after their fade, including rapid switching.
        for(int i=layers.size()-1;i>=0;i--){Layer l=layers.get(i);if(l.target==0&&l.gain==0)layers.remove(i);}
    }
    static float clamp(float x){return Math.max(0,Math.min(1,x));}
    static float approach(float x,float target,float step){return x<target?Math.min(target,x+step):Math.max(target,x-step);}
    public synchronized boolean silent(){return master==0&&masterTarget==0;}
    public synchronized int layerCount(){return layers.size();}
}
