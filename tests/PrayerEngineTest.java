package com.sakin.study;

import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

public final class PrayerEngineTest {
    static long at(String zone,int y,int m,int d,int hour,int min) {
        Calendar c=Calendar.getInstance(TimeZone.getTimeZone(zone));c.clear();c.set(y,m-1,d,hour,min);return c.getTimeInMillis();
    }
    static void check(boolean result,String name){if(!result)throw new AssertionError(name);}
    static List<PrayerEngine.Event> forCity(double lat,double lon,String zone,long now,int[] offsets,boolean hanafi){return PrayerEngine.events(lat,lon,zone,"MUSLIM_WORLD_LEAGUE",hanafi,18,17,offsets,now);}
    public static void main(String[] args){
        int[] zero={0,0,0,0,0};
        long now=at("Asia/Hebron",2026,11,14,9,30);
        List<PrayerEngine.Event> times=forCity(31.5326,35.0998,"Asia/Hebron",now,zero,false);
        check(times.size()==15,"three days of five prayers");
        for(int i=1;i<times.size();i++)check(times.get(i).time>times.get(i-1).time,"chronological order");
        check(times.get(0).day.equals("2026-11-14"),"uses selected city's calendar date");
        check(PrayerEngine.next(times,now).id.equals("dhuhr"),"next prayer after morning is Dhuhr");
        check(times.get(1).time>at("Asia/Hebron",2026,11,14,11,0)&&times.get(1).time<at("Asia/Hebron",2026,11,14,12,0),"Dhuhr near local solar noon");
        PrayerEngine.Event tomorrow=PrayerEngine.next(times,times.get(4).time+1);
        check(tomorrow.id.equals("fajr")&&tomorrow.day.equals("2026-11-15"),"after Isha rolls to tomorrow's Fajr");
        List<PrayerEngine.Event> shifted=forCity(31.5326,35.0998,"Asia/Hebron",now,new int[]{2,-3,4,0,7},false);
        for(int i=0;i<5;i++)check(shifted.get(i).time-times.get(i).time==new int[]{2,-3,4,0,7}[i]*60000L,"manual offset for prayer "+i);
        for(PrayerEngine.Event e:times)check(e.time%60000==0,"prayer is at a stable minute boundary");
        List<PrayerEngine.Event> hanafi=forCity(31.5326,35.0998,"Asia/Hebron",now,zero,true);
        check(hanafi.get(2).time>times.get(2).time,"Hanafi affects Asr");
        check(hanafi.get(1).time==times.get(1).time,"Hanafi preserves Dhuhr");
        long nz=at("Pacific/Auckland",2026,11,15,0,20);
        List<PrayerEngine.Event> midnight=forCity(-36.8485,174.7633,"Pacific/Auckland",nz,zero,false);
        check(midnight.get(0).day.equals("2026-11-15"),"location date differs from UTC at midnight");
        List<PrayerEngine.Event> summer=forCity(51.5074,-.1278,"Europe/London",at("Europe/London",2026,6,21,10,0),zero,false);
        check(summer.size()==15&&PrayerEngine.next(summer,at("Europe/London",2026,6,21,10,0))!=null,"summer high-latitude calculations");
        boolean bad=false;try{forCity(100,35,"Asia/Hebron",now,zero,false);}catch(IllegalArgumentException e){bad=true;}
        check(bad,"rejects invalid coordinates");
        if(args.length>0&&args[0].equals("--fixture")){
            System.out.print("window.PRAYER_FIXTURE=[");
            for(int i=0;i<times.size();i++){PrayerEngine.Event e=times.get(i);if(i>0)System.out.print(',');System.out.print("{\"id\":\""+e.id+"\",\"name\":\""+e.name+"\",\"day\":\""+e.day+"\",\"time\":"+e.time+",\"prayed\":false}");}
            System.out.println("];");
        }else System.out.println("PASS: prayer dates, order, next prayer, midnight rollover, offsets, Asr, summer, validation");
    }
}
