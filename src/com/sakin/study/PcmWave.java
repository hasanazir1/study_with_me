package com.sakin.study;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;

/** Strict bounded reader for bundled PCM16 stereo. No decoder/encoder gaps. */
public final class PcmWave {
    static int littleInt(DataInputStream in)throws IOException{return Integer.reverseBytes(in.readInt());}
    static int littleShort(DataInputStream in)throws IOException{return Short.toUnsignedInt(Short.reverseBytes(in.readShort()));}
    public static short[] read(InputStream input)throws IOException {
        DataInputStream in=new DataInputStream(input);
        if(in.readInt()!=0x52494646)throw new IOException("Not RIFF");littleInt(in);
        if(in.readInt()!=0x57415645)throw new IOException("Not WAVE");
        boolean format=false;
        for(int chunks=0;chunks<32;chunks++){
            int id=in.readInt(),size=littleInt(in);
            if(size<0||size>32*1024*1024)throw new IOException("Invalid wave chunk");
            if(id==0x666d7420){
                if(size<16)throw new IOException("Short fmt");
                int encoding=littleShort(in),channels=littleShort(in),rate=littleInt(in);
                littleInt(in);int align=littleShort(in),bits=littleShort(in);
                if(encoding!=1||channels!=2||rate!=PcmMixer.RATE||bits!=16||align!=4)throw new IOException("Expected 32k stereo PCM16");
                format=true;skip(in,size-16);
            }else if(id==0x64617461){
                if(!format||size<4||size%4!=0)throw new IOException("Invalid PCM data");
                short[] pcm=new short[size/2];byte[] block=new byte[16384];int dest=0;
                while(dest<pcm.length){int count=Math.min(block.length,(pcm.length-dest)*2);in.readFully(block,0,count);
                    for(int i=0;i<count;i+=2)pcm[dest++]=(short)((block[i]&255)|(block[i+1]<<8));}
                return pcm;
            }else skip(in,size);
            if((size&1)!=0)skip(in,1);
        }
        throw new IOException("Missing PCM data");
    }
    private static void skip(DataInputStream in,int count)throws IOException{while(count>0){int n=in.skipBytes(count);if(n==0){in.readByte();n=1;}count-=n;}}
}
