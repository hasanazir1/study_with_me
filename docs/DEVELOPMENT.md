# Development and Git workflow

## Clone and inspect

```text
git clone https://github.com/hasanazir1/study_with_me.git
cd study_with_me
git status
```

Read `AGENTS.md` and `docs/PROGRESS.md` before a change. The latest milestone is phase two (1.2.1 / code 4), awaiting device feedback; future phases need the user's request to proceed.

## Requirements

- Python 3.10+.
- A JDK 17+ (`JAVA_HOME`), not just a JRE. Java tests need this; they do not need an Android SDK.
- Node.js 22+ for JavaScript syntax checks; there are no npm dependencies.
- For APK builds: official Android SDK Platform 35 and Build Tools 35.0.0. Set `ANDROID_SDK_ROOT` / `ANDROID_HOME`, or pass `--sdk`.
- The owner's original private keystore for official signed updates. It is deliberately not in this repository.
- NumPy, SciPy and ffmpeg only if regenerating/preparing audio. Existing loops are already bundled; see `docs/AUDIO.md` for precise sources and filenames.

The current build uses SDK tools directly. It is not an Android Studio/Gradle project; do not silently migrate the build system as part of unrelated work.

## Checks

```text
python tests/run_tests.py
python tests/check_ui.py
python tests/check_audio.py
node --check assets/app.js
```

On Windows, if a suitable JDK is not on PATH, set `JAVA_HOME` to its installation directory. On Linux/macOS the executable suffix is selected automatically. GitHub Actions runs these checks on Ubuntu without a signing key.

Optional browser UI checks use Playwright and a local mock bridge, not Android APIs:

```text
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser_ui.cjs
```

`PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` can select an existing installation; `SAKIN_SCREENSHOTS` optionally selects a screenshot directory. The test owns and stops its local preview server/browser. For manual preview run `python tests/preview_server.py` after the Java tests generate the prayer fixture. No preview code is packaged into APK.

## Build an official APK

```text
python build.py --sdk /path/to/android-sdk --java /path/to/jdk --keystore /private/path/to/sakin-local.p12 --out build/sakin-study.apk
```

Alternatively set `JAVA_HOME`, `ANDROID_SDK_ROOT` and `SAKIN_KEYSTORE`, then run `python build.py`. The original local layout also works: sibling `android-sdk/` and `signing/sakin-local.p12` directories.

The keystore alias and password expected by the existing build are part of the original local signing setup. The private key itself is not included. Do not create a new key to replace the owner's missing key; a differently signed APK cannot update the official installed app. Contributors without that key can still review code, modify it and run the checks. Ask the owner to build the official update.

## Work in small steps

```text
git switch main
git pull --ff-only
git switch -c fix/short-description
```

Make the requested change, run the relevant checks, then review:

```text
git diff --check
git diff
git status --short
git add path/to/changed-file
git commit -m "fix: describe the resulting behavior"
git push -u origin fix/short-description
```

Open a pull request for review when appropriate. Do not mix unrelated fixes into a phase. Commit messages should describe the result; use `feat:`, `fix:`, `docs:` or `chore:` consistently. Never force-push shared history.

## Milestones and releases

Before delivering a new APK:

1. Update `AndroidManifest.xml` versionCode/versionName for that delivery.
2. Update `CHANGELOG.md` and `docs/PROGRESS.md`, including actual verification limits.
3. Build with the original key, verify signature/alignment and compare the signing certificate with the previous official APK.
4. Run the relevant checks and the short Android device checklist.
5. Commit the result and create a version tag such as `v1.2.1`.
6. Publish the signed APK in GitHub Releases with concise changes and a checksum; do not commit APK/build outputs into Git.

## Sharing with another AI

Give it the repository URL and a concrete task. Suggested opening instruction:

> Read AGENTS.md, docs/PROGRESS.md and docs/ROADMAP.md, then inspect the current code. This is a native Android APK with a Java WebView bridge. Preserve existing features and signing/package identity. Work only on the requested stage, run appropriate checks, record the result in Git and stop for feedback at the phase boundary.

Sharing the repository is enough for code review and tests. It does not require sending private signing keys or credentials.
