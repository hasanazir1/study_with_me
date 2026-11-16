package com.sakin.study;

import java.io.*;
import java.nio.file.*;

public final class AudioCoreTest {
    static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);}
    public static void main(String[] args)throws Exception{
        short[] leftRight={10000,-5000,20000,-10000};
        PcmMixer m=new PcmMixer();m.scene(new String[]{"a"},new short[][]{leftRight},new float[]{1});m.levels(new String[]{"a"},new float[]{1},1,1);
        short[] block=new short[64000*2];m.render(block);
        check(block[block.length-4]==8600&&block[block.length-3]==-4300,"stereo channels stay distinct at settled volume");
        check(block[block.length-2]==17200&&block[block.length-1]==-8600,"loop wraps without inserted frame or gap");
        m.fadeOut();short[] fade=new short[48000*2];m.render(fade);
        check(m.silent()&&m.layerCount()==0,"fade releases silent sources");
        check(fade[fade.length-1]==0,"fade reaches digital silence");
        int previous=Integer.MAX_VALUE;for(int i=0;i<fade.length;i+=4){int amplitude=fade[i];check(amplitude<=previous,"fade envelope is monotonic");previous=amplitude;}
        for(int i=0;i<8;i++)m.scene(new String[]{"rapid"+i},new short[][]{leftRight},new float[]{.8f});
        m.levels(new String[]{"rapid7"},new float[]{.8f},1,.2f);m.render(block);
        check(m.layerCount()==1,"rapid switches discard superseded sources after crossfade");
        for(String name:new String[]{"rain","window","ocean","stream","wind","brown","bubbles"}){
            try(InputStream in=Files.newInputStream(Paths.get("assets/audio/"+name+".wav"))){short[] pcm=PcmWave.read(in);check(pcm.length==PcmMixer.RATE*60*2,"full minute: "+name);}
        }
        boolean rejected=false;try{PcmWave.read(new ByteArrayInputStream(new byte[12]));}catch(IOException e){rejected=true;}check(rejected,"reject malformed wave");
        System.out.println("PASS: PCM stereo, exact loop wrap, smooth fade, rapid-switch cleanup, real bundled audio reader and invalid input");
    }
}
