# Changelog

## 1.2.1 — Phase-two final build — 2026-11-16

- Removed per-sample ArrayList iterator creation in the continuous audio mixer; indexed loops avoid temporary allocations in render().
- VersionCode 4 updates both the previous installed app and the preliminary phase-two code-3 APK shared while repository upload was running. No sound asset or UI behavior change.

## 1.2.0 — Phase two — 2026-11-16

- Replaced 24-second mono synthetic ambience with seven distinct 60-second stereo layers: licensed CC0 rain/window/ocean/stream recordings and procedural wind/brown/bubbles.
- Native AudioTrack PCM mixer with sample-continuous loops, layer/master controls, lazy loading, 1.2-second fades and a sound-only sleep timer.
- Media playback foreground service, MediaSession play/pause/stop, audio focus, headphone-disconnect pause and playback-only CPU wake lock. Bundled offline assets; no internet permission.
- New two-note completion notification cue, in-app preview and sound toggle; respects Android notification volume/silent/DND behavior. Visible-app fallback when notification permission is denied.
- Automatically starts rest five seconds after focus completion, with visible countdown/cancel and an opt-out. Next focus remains manual. Prayer-fit sessions, prayer pause, reset and reboot cannot trigger an unwanted delayed rest.
- Short asynchronous receiver window keeps the five-second transition from relying on two closely spaced idle alarms. Stored deadlines recover elapsed break time after delays.
- Smoother digit/leaf/orbit/sheet motion; removed stacked blur layers and browser view-transition snapshots around native rotation. Hidden UI stops animation; reduced-motion remains supported.
- First press on dimmed controls performs its action. Orientation remains stable through the automatic rest grace.
- Added timer/audio/asset tests, responsive UI preview checks and documented source hashes/credits and Android test limits.
- Same package and original signing certificate; versionCode 3. Physical Android verification of this new version remains pending.

## 1.1.0 — Phase one

- Cream light interface and soft blue-green dark mode, with bundled Readex Pro.
- Circular progress timer, subtle digit changes, pill controls and bottom sheets.
- Fixed-height main interface with portrait/landscape layouts and fading session controls.
- Native immersive mode, Activity orientation, safe insets, session-only keep-screen-on and optional haptics.
- Preserved timer, break presets, prayer times, next-prayer countdown, prayer tracking, sounds and settings.
- Fixed duplicate SVG/control IDs affecting reset and volume controls.
- Kept package `com.sakin.study`; increased versionCode to 2 and retained the original signing certificate.

## 1.0.0 — Original baseline

- Offline Android study timer with configurable study/break durations.
- Local prayer calculations, next-prayer countdown, daily times and prayer tracking.
- Four bundled ambient loops, native foreground playback and local notifications.
- Arabic RTL interface, local settings and study totals.

## Repository setup — 2026-11-15

- Imported the two saved application snapshots into separate Git commits.
- Added contribution/AI instructions, architecture, progress, roadmap and Git workflow documentation.
- Added automatic timer/prayer/UI checks and made the test runner portable across Windows/Linux/macOS with a configured JDK.
- Added an explicit keystore path option while retaining the requirement for the original signing key.

The import commits were created when the repository was set up. They are saved-version imports, not a reconstruction of every earlier edit or its original commit date. Repository setup does not change the Android application milestone or start phase two.
