# Sakin Study / سَكَن

A personal, offline Android study companion with Arabic RTL UI, a persistent monotonic focus timer, configurable breaks, local prayer calculations, next-prayer countdown, prayer tracking, ambient audio, and a landscape distance-display mode.

## Phase one — Android 1.1.0 / versionCode 2

This is a plain Java Activity + WebView project, not Capacitor or Cordova. The redesign uses bundled Readex Pro, a light cream default with a soft blue-green dark theme, a circular timer, fixed-height single-screen layouts, bottom sheets, and idle-fading controls. `NativePresentation` owns immersive system bars, Activity sensor-landscape orientation during sessions, cutout/keyboard insets, and session-only `FLAG_KEEP_SCREEN_ON`. Back exits immersive mode before leaving the Activity. Native `Haptics` is optional. There are no web fullscreen/orientation calls, PWA files, web hosting requirements, or runtime internet access.

The upgrade retains the package and original signing certificate. It preserves functional preferences and timer data; a one-time migration switches the appearance to light for the requested redesign. Existing ambient audio remains on the original native MediaPlayer foreground service; audio quality, layers and Media3 integration are deferred to phase two. Animated scenes, character states, and new prayer behavior remain later phases.

## Build

Requires JDK 17+ and official Android SDK Platform 35 / Build Tools 35.0.0. The only runtime library is `com.batoulapps.adhan:adhan:1.2.1`, included under its MIT license. No Gradle or runtime internet permission is needed.

```powershell
python build.py --sdk C:\path\to\android-sdk --java C:\path\to\jdk --out C:\path\to\sakin-study.apk
```

`JAVA_HOME` and `ANDROID_SDK_ROOT` are accepted. The script requires the original personal signing key in the parent folder's `signing/sakin-local.p12` and stops if it is missing. It does not create replacement keys. Preserve that key for future updates. The distributed source archive excludes private signing keys, generated build files, and tool caches.

Audio is original procedural PCM, generated with NumPy using `tools/generate_audio.py`. The four ready-to-use audio loops are already included. To regenerate:

```powershell
python tools/generate_audio.py
```

## Tests

```powershell
python tests/run_tests.py
python tests/check_ui.py
node --check assets/app.js
```

The test runner currently targets Windows; adjust the Java executable suffix for another platform. It checks timer pause/resume, late and duplicate completion, break durations, shortened sessions, reboot recovery, prayer ordering, next-day rollover, location calendar dates, per-prayer offsets, Asr rules, and summer calculations. It also generates an optional UTF-8 browser-preview fixture.

The APK was checked with `apksigner verify` and `zipalign -c`. The HTML/CSS/JS interface was exercised through a browser harness using the same app assets; that harness is **not** packaged into the APK. Native installation, media playback, Android permission flows, background alarms, and GPS were not run on a physical device or emulator.

Phase-one responsive checks covered actual CSS viewports 320×568, 396×806, 784×388 and 1151×791, with no main-screen scrolling or clipped controls. The fixture preview cannot verify Android orientation, system bars, notches, haptics or background media; use the Android checklist supplied with the APK for those checks.

## Behavior

- Requires Android 8.0+ with an updated Android System WebView.
- Timer uses `SystemClock.elapsedRealtime` and `ELAPSED_REALTIME_WAKEUP` alarms, so changing the wall clock does not change the countdown.
- Completion and state changes are serialized behind one lock; late alarm delivery credits at most the active study duration.
- A completed interval waits for a user action before starting the next phase.
- An Android media-playback foreground service handles bundled ambient loops and audio focus; timer alarms do not use a persistent service.
- Exact alarms and notifications are optional, requested only through explicit settings actions. Without exact-alarm access, alarms use the approximate idle-aware fallback and may be delayed in the background.
- Prayer times are computed on-device with the user-selected method, coordinates, timezone, Asr rule, and offsets. They must be compared with the local timetable. Umm al-Qura's fixed Isha interval needs a manual Ramadan adjustment where applicable.
- Prayer alerts use a system notification tone, not a full Adhan recording.
- The native WebView serves only packaged assets from a private intercepted HTTPS host, blocks other navigation, disables file/content access, and exposes a limited local bridge. There is no `INTERNET` permission, analytics, account, or backup service.
- Data is stored locally, Android backup is disabled, and uninstalling clears it.

See `ADHAN-LICENSE.txt` for the third-party license. Official references: [Adhan Java](https://github.com/batoulapps/adhan-kotlin/tree/java), [Android exact alarms](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms), [foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types).
