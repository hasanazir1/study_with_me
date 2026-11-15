# Architecture

## Platform

Plain Android Java project with one Activity and a bundled HTML/CSS/JavaScript interface in a WebView. No Capacitor, Cordova, Gradle project, hosted frontend or runtime network dependency is currently used.

```text
assets/index.html + app.css + app.js
                │ window.Sakin (local JavaScript bridge)
                ▼
          MainActivity.java
           ├─ NativePresentation → Activity orientation, bars, insets, keep-screen-on
           ├─ AppStore → SharedPreferences, timer actions, prayer settings and totals
           │   ├─ TimerCore → pure Java monotonic timer
           │   └─ PrayerEngine → bundled Adhan Java library
           ├─ Alarms / AlarmReceiver / SystemReceiver → native local scheduling
           ├─ SoundService → MediaPlayer + MediaSession + mediaPlayback service
           └─ Haptics → optional native vibration
```

## Interface and bridge

- `assets/index.html`: complete RTL interface and bottom sheets.
- `assets/app.css`: single-screen portrait/landscape layouts, light/dark design, reduced motion and idle controls.
- `assets/app.js`: renders native snapshots and sends commands. It pauses its refresh loop when hidden; it is not the timer authority.
- `assets/fonts`: bundled Readex Pro and its OFL license.
- `assets/audio`: four bundled original procedural WAV loops.

The bridge exposes `getSnapshot`, `command`, `saveSettings`, `requestNotifications`, `requestExactAlarms`, `requestLocation` and `fullscreen`. `fullscreen` delegates to native presentation; it does not invoke a browser Fullscreen API. The WebView only serves intercepted packaged assets and blocks foreign navigation/file access.

## Timing and lifecycle

`TimerCore` uses monotonic elapsed time for active countdowns and stores deadline information for recovery. `AppStore` persists transitions, serializes completion and credits actual focus time. Android alarms handle completion when the UI is not running. The Activity also synchronizes visible presentation so completion or pause releases orientation and keep-screen-on.

`NativePresentation` applies system/cutout/keyboard insets once at the native container. The WebView receives an already safe viewport. It uses native immersive bars with transient swipe access and sensor-landscape during sessions, and restores the system's orientation choice when leaving study mode.

## Background audio and prayer alerts

The current `SoundService` is a native media-playback foreground service using MediaPlayer and MediaSession. Its playback is independent of JavaScript. Replacing the audio engine and assets is phase two, not completed work.

`Alarms` schedules local timer/prayer events. Exact-alarm access and notification access are separate. Without exact-alarm permission the fallback can be delayed; force-stop and device-specific battery restrictions remain relevant. No cloud push service is involved.

## Build and signing

`build.py` calls official SDK tools directly: AAPT2, javac, D8, zipalign and apksigner. The small Adhan JAR is vendored with its license. The owner keystore stays outside Git; official updates must retain it and package `com.sakin.study`.

`tests/` contains pure Java tests, static UI checks and a browser-preview bridge/fixture. Preview support is development-only and is never copied into APK assets.
