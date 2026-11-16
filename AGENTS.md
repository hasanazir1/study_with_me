# Sakin — instructions for contributors and AI agents

## Read first

1. `README.md`
2. `docs/PROGRESS.md` for the latest verified state and unfinished work
3. `docs/ROADMAP.md` for the accepted phased plan
4. `docs/ARCHITECTURE.md` before changing native or UI behavior

The current app milestone is phase two, Android 1.2.0 / versionCode 3. The user requested improved audio/motion, an audible completion cue and automatic rest after five seconds. Phase two is implemented and awaiting device feedback. Do not start phase three (visual scenes) until requested. Read docs/AUDIO.md for the native PCM engine and source licenses.

## Product constraints

- This is an **Android APK: a plain Java Activity with a local WebView**. It is not Capacitor, Cordova, a hosted website or a PWA.
- Keep the Arabic RTL interface, Sakin name and leaf identity, all existing timer/prayer/audio controls, and the single-screen main layout.
- Keep the app fully offline. Fonts, audio and prayer calculations are bundled. Do not add internet permissions, remote fonts, analytics, accounts or external runtime assets without an explicit requirement.
- Use native Activity APIs for immersive mode, orientation, safe insets and session-only keep-screen-on. Do not substitute browser fullscreen, Screen Orientation or web wake-lock tricks.
- Keep audio playback independent of the WebView lifecycle through a native media-playback foreground service and MediaSession.
- Do not remove features during a redesign. Put detail controls into accessible sheets.
- Stop after the requested phase and provide an APK plus a short real-device test checklist.

## Git workflow

- Inspect `git status` and the current branch before edits. Preserve unrelated user changes.
- Use a focused branch for new feature/fix work, for example `feat/phase-2-audio` or `fix/session-orientation`.
- Make small, meaningful commits after relevant checks pass. Record completed behavior and remaining issues in `docs/PROGRESS.md`; update `CHANGELOG.md` for user-visible changes.
- For requested work in this repository, saving validated changes in Git and pushing the intended branch is part of the user's requested workflow, unless they say otherwise.
- Do not rewrite published history, force-push, delete tags, merge unrelated work or change repository visibility without explicit authorization.
- Do not mark a milestone complete merely because compilation or browser preview succeeded. Distinguish pure tests, UI preview, APK validation and physical Android verification.

## Signing and releases

- Preserve package `com.sakin.study` and the original signing certificate for official updates.
- Increment `versionCode` for each APK version delivered to the user. Update `versionName`, changelog and progress together.
- Never commit or upload private signing keys, credentials, `.env` files, SDKs, generated build files or local user data. The `.gitignore` is intentional.
- The owner's original keystore is outside the repository. Use `--keystore` / `SAKIN_KEYSTORE` when needed. Do not generate a replacement key to work around missing access.
- Other contributors can inspect code and run tests without that key. Official signed APKs belong in GitHub Releases, not the source tree.
- Do not treat a build made with someone else's key as an update to the official APK.

## Checks

```text
python tests/run_tests.py
python tests/check_ui.py
python tests/check_audio.py
node --check assets/app.js
```

For native/build changes, also build using Android SDK Platform 35 / Build Tools 35.0.0 and JDK 17+, then verify APK signature/alignment and that the signing certificate matches the previous official release. Test relevant behavior on an Android device when one is available; report when it is not.
