# سَكَن · Sakin

غرفة دراسة صغيرة على أندرويد: مؤقّت تركيز، الصلاة الجاية مع عدّ تنازلي، وأصوات هادئة — بدون حساب أو إنترنت.

**Native Android APK · Java + local WebView · Arabic RTL · Offline**

[تحميل التطبيق من الإصدارات](https://github.com/hasanazir1/study_with_me/releases/latest) · [التقدّم الحالي](docs/PROGRESS.md) · [الخطة](docs/ROADMAP.md) · [تعليمات التطوير](docs/DEVELOPMENT.md)

![سَكَن — معاينة واجهة المرحلة الأولى](docs/phase1-landscape.jpg)

*معاينة لنفس ملفات الواجهة، بمواقيت توضيحية. ليست صورة من جهاز أندرويد فعلي.*

## وين وصلنا؟

أحدث مرحلة للتطبيق **1.1.0 / versionCode 2**: تصميم فاتح ودافئ، مظهر داكن ناعم، خط عربي محلي، حلقة للمؤقت، وشاشة واحدة مع تفاصيل في sheets. العرض الغامر والاتجاه وإبقاء الشاشة صاحية والاهتزاز موصولون بأندرويد الأصلي.

**المرحلة الأولى مسلّمة، وبانتظار ملاحظات تجربة الجوال. المرحلة الثانية للصوت لم تبدأ.**

الريبو يحفظ نسختين سابقتين كنقطتي بداية، ثم تجهيزات Git والتوثيق والفحوص. التاريخ الأولي مستورد من نسخ محفوظة؛ ليس سجلًا لكل تعديل قديم على حدة. من الآن نسجّل التعديلات بcommits صغيرة وواضحة.

## ماذا يعمل الآن؟

- مؤقّت دراسة واستراحة: 25/5، 50/10، 20/15 أو مدد مخصّصة، مع إيقاف واستكمال وإعادة ضبط.
- الصلاة القادمة وموعدها والمتبقي، اختيار المدينة، طريقة الحساب والمذهب، وتعديل الدقائق.
- مواقيت اليوم وعلامة «صليت»، وزر «جلسة قبل الصلاة».
- أربعة أصوات محفوظة داخل التطبيق، وتشغيل أصلي بالخلفية مع MediaSession.
- إعدادات محلية، هدف للجلسة وسجل تركيز يومي، وحركات أخف وخيارات اهتزاز.

المؤقّت وحساب الصلاة لهما اختبارات، وتم بناء APK وفحص توقيعه. **التثبيت والتدوير والنوتش والاهتزاز والصوت بالخلفية لم تُختبر بعد على جهاز فعلي أو محاكي**؛ التفاصيل في [سجل التقدم](docs/PROGRESS.md) و[قائمة تجربة أندرويد](docs/ANDROID_TEST_CHECKLIST_AR.md).

## ابدأ بالكود

```text
git clone https://github.com/hasanazir1/study_with_me.git
cd study_with_me
```

هذا مشروع **Java Activity + WebView عادي**، وليس Capacitor أو Cordova أو تطبيق ويب مستضاف. لا يوجد PWA أو service worker. كل الخطوط والأصوات وحساب الصلاة محلي داخل APK، ولا توجد صلاحية إنترنت.

```text
AndroidManifest.xml       الحزمة وإصدار أندرويد والصلاحيات
src/com/sakin/study/      المؤقّت والصلاة والخدمات والجسر الأصلي
assets/                  الواجهة العربية والخط والأصوات
res/                     هوية التطبيق وموارد أندرويد
libs/                    مكتبة الصلاة المرخّصة
tests/                   اختبارات المؤقّت والصلاة والواجهة
tools/                   توليد الأصوات الحالية
docs/                    التقدم والخطة والتطوير والبنية
build.py                 بناء APK بأدوات Android SDK مباشرة
AGENTS.md                تعليمات أي شخص أو AI يكمل المشروع
```

## الاختبارات

تحتاج Python 3.10+ وJDK 17+، وNode.js لفحص JavaScript. لا تحتاج مفتاح التوقيع أو Android SDK لتشغيل هذه الفحوص:

```text
python tests/run_tests.py
python tests/check_ui.py
node --check assets/app.js
```

تعمل الفحوص تلقائيًا عبر [GitHub Actions](https://github.com/hasanazir1/study_with_me/actions) عند الدفع إلى `main` أو فتح pull request. لا تحمل هذه الفحوص مفتاح توقيع ولا تنشر APK تلقائيًا.

## بناء APK

يلزم JDK 17+ وAndroid SDK Platform 35 وBuild Tools 35.0.0، مع **مفتاح التوقيع الأصلي** للإصدارات الرسمية:

```text
python build.py --sdk /path/to/android-sdk --java /path/to/jdk --keystore /private/path/to/sakin-local.p12 --out build/sakin-study.apk
```

يمكن استخدام `JAVA_HOME` و`ANDROID_SDK_ROOT`/`ANDROID_HOME` و`SAKIN_KEYSTORE` بدل المسارات. البناء مباشر عبر AAPT2 وjavac وD8 وzipalign وapksigner؛ لا يوجد إعداد Gradle حاليًا. [خطوات البناء وGit كاملة](docs/DEVELOPMENT.md).

الحزمة الرسمية `com.sakin.study`. **مفتاح التوقيع يبقى خارج Git**؛ البناء يتوقف عند غيابه ولا ينشئ بديلًا قد يمنع تحديث التطبيق. يمكن لأصحابك أو AI قراءة المشروع وتعديله وتشغيل اختباراته دون هذا المفتاح. ملفات APK الجاهزة موجودة في Releases.

## المشاركة والمتابعة

اقرأ [AGENTS.md](AGENTS.md) ثم [PROGRESS](docs/PROGRESS.md) و[ROADMAP](docs/ROADMAP.md). للتعديلات الجديدة نستعمل فرعًا واضحًا، وفحوصًا مناسبة، وcommit يصف النتيجة، ثم نحدّث سجل التقدم ونحفظه على GitHub. نتوقف بعد كل مرحلة للملاحظات.

- [CHANGELOG](CHANGELOG.md): ماذا تغيّر في كل نسخة؟
- [ARCHITECTURE](docs/ARCHITECTURE.md): كيف تتصل الواجهة بأندرويد؟
- [CONTRIBUTING](CONTRIBUTING.md): كيف تساهم؟
- [THIRD_PARTY](docs/THIRD_PARTY.md): المكتبات والخطوط والتراخيص الموجودة.

ترخيص عام للكود الأصلي لم يُختَر بعد؛ تراخيص مكتبة Adhan وخط Readex موجودة مع ملفاتهما.
