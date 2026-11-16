package com.sakin.study;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

/** Audio presets and future scene settings come from the same bundled config as the UI. */
public final class AudioCatalog {
    private static JSONArray all;
    public static synchronized JSONArray all(Context c)throws Exception{
        if(all==null)try(java.io.InputStream in=c.getAssets().open("scenes.json")){
            java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] b=new byte[4096];int n;
            while((n=in.read(b))!=-1)bytes.write(b,0,n);
            all=new JSONArray(new String(bytes.toByteArray(),java.nio.charset.StandardCharsets.UTF_8));
        }
        return all;
    }
    public static JSONObject get(Context c,String id)throws Exception{
        JSONArray list=all(c);for(int i=0;i<list.length();i++)if(list.getJSONObject(i).getString("id").equals(id))return list.getJSONObject(i);
        throw new IllegalArgumentException("Unknown ambience");
    }
}
