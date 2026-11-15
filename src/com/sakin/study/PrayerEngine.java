package com.sakin.study;

import com.batoulapps.adhan.CalculationMethod;
import com.batoulapps.adhan.CalculationParameters;
import com.batoulapps.adhan.Coordinates;
import com.batoulapps.adhan.Madhab;
import com.batoulapps.adhan.PrayerTimes;
import com.batoulapps.adhan.data.DateComponents;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

public final class PrayerEngine {
    public static final String[] IDS = {"fajr", "dhuhr", "asr", "maghrib", "isha"};
    public static final String[] NAMES = {"الفجر", "الظهر", "العصر", "المغرب", "العشاء"};
    public static final class Event {
        public final String id, name, day;
        public final long time;
        Event(String id, String name, String day, long time) {
            this.id = id; this.name = name; this.day = day; this.time = time;
        }
    }
    public static List<Event> events(double lat, double lon, String zone, String method,
                                      boolean hanafi, double fajrAngle, double ishaAngle,
                                      int[] offsets, long wall) {
        if (!Double.isFinite(lat) || !Double.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
            throw new IllegalArgumentException("Invalid coordinates");
        CalculationParameters params;
        try { params = CalculationMethod.valueOf(method).getParameters(); }
        catch (IllegalArgumentException e) { params = CalculationMethod.MUSLIM_WORLD_LEAGUE.getParameters(); }
        if (method.equals("CUSTOM")) {
            params.fajrAngle = fajrAngle;
            params.ishaAngle = ishaAngle;
            params.ishaInterval = 0;
        }
        params.madhab = hanafi ? Madhab.HANAFI : Madhab.SHAFI;
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone(zone));
        calendar.setTimeInMillis(wall);
        List<Event> out = new ArrayList<>();
        for (int day = 0; day < 3; day++) {
            int year = calendar.get(Calendar.YEAR), month = calendar.get(Calendar.MONTH) + 1,
                date = calendar.get(Calendar.DAY_OF_MONTH);
            String key = String.format(java.util.Locale.US, "%04d-%02d-%02d", year, month, date);
            PrayerTimes times = new PrayerTimes(new Coordinates(lat, lon), new DateComponents(year, month, date), params);
            Date[] dates = {times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha};
            for (int i = 0; i < 5; i++) {
                if (dates[i] == null) throw new IllegalArgumentException("Prayer unavailable at this latitude");
                // The library rounds seconds but retains Calendar's construction milliseconds.
                long minute = Math.floorDiv(dates[i].getTime(), 60000L) * 60000L;
                out.add(new Event(IDS[i], NAMES[i], key, minute + offsets[i] * 60000L));
            }
            calendar.add(Calendar.DAY_OF_MONTH, 1);
        }
        out.sort((a,b) -> Long.compare(a.time,b.time));
        return out;
    }
    public static Event next(List<Event> events, long wall) {
        for (Event event : events) if (event.time > wall) return event;
        return null;
    }
}
