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
           ├─ SoundService → PcmMixer + AudioTrack + MediaSession + mediaPlayback service
           └─ Haptics → optional native vibration
```

## Interface and bridge

- `assets/index.html`: complete RTL interface and bottom sheets.
- `assets/app.css`: single-screen portrait/landscape layouts, light/dark design, reduced motion and idle controls.
- `assets/app.js`: renders native snapshots and sends commands. It pauses its refresh loop when hidden; it is not the timer authority.
- `assets/fonts`: bundled Readex Pro and its OFL license.
- `assets/audio`: seven 60-second stereo PCM layers, source hashes and CC0 credits.

The bridge exposes `getSnapshot`, `command`, `saveSettings`, `requestNotifications`, `requestExactAlarms`, `requestLocation`, `getAudioCatalog` and `fullscreen`. `fullscreen` delegates to native presentation; it does not invoke a browser Fullscreen API. The WebView only serves intercepted packaged assets and blocks foreign navigation/file access.

## Timing and lifecycle

`TimerCore` uses monotonic elapsed time for active countdowns and stores deadline information for recovery. `AppStore` persists transitions, serializes completion and credits actual focus time. Android alarms handle completion when the UI is not running. A finished focus session can hold a five-second rest grace with persistent monotonic/wall deadlines. The grace can be cancelled; prayer-fit sessions never queue it, and reboot clears it. Rest starts automatically and catches up from its stored start; the next focus needs a user action. AppStore serializes transitions to prevent duplicate completion credit/cues. AlarmReceiver briefly uses goAsync plus a bounded partial wake lock for a background grace, since idle alarm quotas make a second five-second alarm unreliable. The Activity keeps presentation stable through the grace and releases orientation/keep-screen-on at rest completion or cancellation.

`NativePresentation` applies system/cutout/keyboard insets once at the native container. The WebView receives an already safe viewport. It uses native immersive bars with transient swipe access and sensor-landscape during sessions, and restores the system's orientation choice when leaving study mode.

## Background audio and prayer alerts

The phase-two `SoundService` is a native media-playback foreground service with one AudioTrack stream. `PcmWave` lazily reads the bundled PCM16 stereo loops off the main thread. `PcmMixer` mixes/fades/wraps the source arrays on a continuous sample clock; MediaSession, audio focus and a partial CPU wake lock are service-owned. A sound-only monotonic sleep deadline pauses playback. See AUDIO.md for files, sources, licensing and device-test limits.

`assets/scenes.json` remains the shared native audio-preset configuration. Phase three adds `room.js` and `room.css`: an original SVG room with six visual configurations, each containing colors, effect, optional existing audio-preset reference and a future character state. Two reused SVG layers crossfade; CSS handles motion. Hidden and inactive layers pause; reduced motion disables effects. Visual selection is native-persisted as `visualScene`, independently from sound. No character is implemented yet. UI commands `audioSleep` and `previewChime` control sleep and the native cue preview.

`Alarms` schedules local timer/prayer events. Exact-alarm access and notification access are separate. Without exact-alarm permission the fallback can be delayed; force-stop and device-specific battery restrictions remain relevant. No cloud push service is involved.

## Build and signing

`build.py` calls official SDK tools directly: AAPT2, javac, D8, zipalign and apksigner. The small Adhan JAR is vendored with its license. The owner keystore stays outside Git; official updates must retain it and package `com.sakin.study`.

`tests/` contains pure Java tests, static UI checks and a browser-preview bridge/fixture. Preview support is development-only and is never copied into APK assets.
