# تست عملکرد SafeMeet

این ابزار از Playwright نصب‌شدهٔ همین مخزن و Chrome سیستم استفاده می‌کند. هر شرکت‌کننده یک فرایند مرورگر و context مستقل دارد؛ دو نفر اول مدیر هستند. مرورگر هدف به‌صورت headed در پیش‌زمینه قرار می‌گیرد. مرورگرهای دیگر تولیدکنندهٔ بار هستند و مصرفشان باید جدا تحلیل شود.

## آماده‌سازی در Git Bash

متغیر `BBB_SERVER` را به آدرس HTTPS backend مجاز و `PERF_MEETING_ID` را به شناسهٔ جلسهٔ مورد توافق تنظیم کنید. آدرس backend با `PERF_CLIENT` متفاوت است. secret از محیط یا خروجی SSH خوانده می‌شود و چاپ نمی‌شود. مقدار واقعی متغیرهای محرمانه را در فایل، تاریخچهٔ قابل‌تحویل یا گزارش ننویسید.

```bash
cd bigbluebutton-html5
# برای عیب‌یابی، در ترمینال مستقل:
./run-dev-remote.sh

# برای اندازه‌گیری: ابتدا dev server را متوقف کنید.
NODE_ENV=production TARGET=default DETAILED_LOGS=false HOT_RELOAD=false \
  node node_modules/webpack/bin/webpack.js --config webpack.config.js --mode production
node scripts/serve-perf.cjs
```

حالت تطبیقی در build فعلی SafeMeet به‌صورت پیش‌فرض فعال و mode آن `auto` است. برای اجبار حالت خاص در آزمون، بدون تغییر تنظیمات `live51`، پراکسی محلی پاسخ `meetingStaticData` را فقط برای کلاینت‌های همین پراکسی بازنویسی می‌کند:

```powershell
$env:PERF_ADAPTIVE_PROTECTION = '1'
$env:PERF_PERFORMANCE_MODE = 'auto' # auto | low | standard
node scripts/serve-perf.cjs
```

این override صرفاً ابزار آزمون است، secret یا token را ثبت نمی‌کند و تنظیمات جلسه یا سرور را تغییر نمی‌دهد.

برای اجرای baseline از یک نسخهٔ ذخیره‌شدهٔ **کامل** dist استفاده کنید؛ از تغییر فایل‌های در حال اندازه‌گیری خودداری کنید:

```bash
PORT=3002 PERF_DIST=/absolute/path/to/baseline-dist node scripts/serve-perf.cjs
```

`serve-perf.cjs` فقط روی loopback گوش می‌دهد، HMR و compiler ندارد، APIها را به backend انتخاب‌شده هدایت می‌کند و آدرس‌های لازم پاسخ API را برای کلاینت محلی بازنویسی می‌کند. تنظیمات مؤثر از جلسه می‌آید؛ تغییر YAML محلی به‌تنهایی تنظیمات جلسه را تغییر نمی‌دهد.

## اجرای کوتاه برای بررسی ابزار

در ترمینال مستقل، با همان متغیرهای محیطی:

```bash
cd bigbluebutton-tests/playwright
node performance/media.cjs
PERF_USERS=3 PERF_TARGET=2 PERF_CAMERAS=3 PERF_SCREEN_CAMERAS=3 \
PERF_WARMUP_SECONDS=10 PERF_SAMPLE_SECONDS=30 PERF_REPETITIONS=1 \
PERF_VIDEO=test-results/performance/media/motion.y4m \
PERF_AUDIO=test-results/performance/media/tone.wav \
PERF_ACTIONS=1 PERF_OUTPUT=test-results/performance/smoke-new \
node performance/run.cjs
```

این اجرای کوتاه جایگزین پروتکل پذیرش نیست. برای هر اجرا پوشهٔ خروجی جدید انتخاب کنید؛ فایل نمونه‌ها append می‌شود.

برای کنترل طول عمر زیرساخت، می‌توان همان متغیرها را به `node performance/with-server.cjs` داد. این ناظر در پیش‌زمینه پراکسی محلی را اجرا می‌کند، PID آن را به ابزار می‌دهد و در پایان فقط فرایندهای ساخته‌شدهٔ خودش را متوقف می‌کند. `PERF_PORT=3004` پورت پیش‌فرض آن است؛ نباید پراکسی دیگری روی این پورت فعال باشد. `PERF_USE_TUNNEL=1` یک SSH forward محلی برای HTTPS backend می‌سازد؛ TLS با نام واقعی backend همچنان اعتبارسنجی می‌شود. قطع این وابستگی‌ها در `infrastructure-failure.json` ثبت و اجرا نامعتبر می‌شود. مسیر عادی و تونل باید در قبل و بعد یکسان انتخاب شوند.

نشست‌ها به‌صورت پیش‌فرض در batchهای سه‌تایی ساخته می‌شوند (`PERF_JOIN_CONCURRENCY=3`) ولی هر کاربر browser process و context مستقل دارد. هر index حداکثر سه بار retry می‌شود؛ browser تلاش ناموفق پیش از retry بسته می‌شود و رویداد در `samples.jsonl` می‌آید. ابزار پیش از شروع حداکثر سه دقیقه منتظر خروج کاربران آزمایشی اجرای قبلی می‌ماند. کنترل‌های صوت cooldown و مهلت دیواری ۹۰ ثانیه دارند تا کلیک تکراری PeerConnection اضافی نسازد.

## پروتکل اندازه‌گیری

```bash
PERF_USERS=12 PERF_TARGET=2 PERF_CAMERAS=0,1,4,8,12 \
PERF_SCREEN_CAMERAS=8,12 PERF_WARMUP_SECONDS=120 \
PERF_SAMPLE_SECONDS=300 PERF_REPETITIONS=3 PERF_SOAK_SECONDS=1800 \
PERF_VIDEO=test-results/performance/media/motion.y4m \
PERF_AUDIO=test-results/performance/media/tone.wav \
PERF_ACTIONS=1 PERF_OUTPUT=test-results/performance/after-viewer \
node performance/run.cjs
```

برای اینکه اجرای کامل با پایان ترمینال کنترل‌کننده قطع نشود، runner ویندوز فرایند مخفی مستقلی می‌سازد و PID و stdout/stderr را داخل همان پوشهٔ خروجی می‌نویسد؛ secret در command line یا فایل قرار نمی‌گیرد:

```powershell
./performance/start-acceptance.ps1 `
  -Server 'https://your-bbb.example.com' `
  -MeetingId 'agreed-meeting-id' `
  -Output 'test-results/performance/after-viewer'
```

برای baseline می‌توان `-TargetDist C:\absolute\path\to\baseline-dist` را اضافه کرد. در این حالت فقط مرورگر هدف baseline را می‌گیرد و ۱۱ مولد بار از dist فعلی استفاده می‌کنند؛ این جداسازی باید صریحاً در گزارش ذکر شود.

برای بار ۲۵ تا ۵۰ کاربر، runner جداگانه پارامترهای افزایش تدریجی وبکم، پایش read-only سرویس‌های `bbb-graphql-middleware` و `bbb-webrtc-sfu` روی `live51` و توقف ایمن میزبان را فعال می‌کند. جلسه و همهٔ مسیرهای realtime/media روی `live51` باقی می‌مانند؛ سیستم محلی فقط فایل‌های HTML5، پراکسی loopback و مرورگرهای شبیه‌ساز را اجرا می‌کند:

```powershell
./performance/start-high-load.ps1 `
  -Output 'test-results/performance/highload-50-desktop' `
  -Users 50 -Cameras '0,10,25,50' -ScreenCameras '50' `
  -WarmupSeconds 60 -SampleSeconds 180
```

اگر مسیر عمومی backend در پاسخ‌های تنظیمات 502/504 ناپایدار باشد، اجرای جداگانه با `-UseTunnel` همان backend روی `live51` را از SSH forward محلی عبور می‌دهد. خروج tunnel پیش از پایان، کل اجرا را نامعتبر می‌کند و در `infrastructure-failure.json` ثبت می‌شود.

برای soak سی‌دقیقه‌ای `-SoakSeconds 1800` اضافه کنید. برای viewport موبایل یا محدودسازی CPU، `-Width 390 -CpuRate 4` و `-Width 390 -CpuRate 6` را در اجراهای مستقل به کار ببرید. این حالت‌ها آزمون گوشی واقعی یا دما محسوب نمی‌شوند. `live51-samples.jsonl` شمارنده‌های عددی host، GraphQL و SFU را ثبت می‌کند. summary برای هر browser مستقل نقش، CPU و RAM را در آرایهٔ `sessions` می‌نویسد.

در runner بار بالا فقط دو مدیر به audio متصل می‌شوند (`PERF_AUDIO_USERS=2`) و هر دو وبکم می‌توانند منتشر کنند؛ ۴۸ نشست دیگر بار تصویر/GraphQL را تولید می‌کنند. این انتخاب سناریوی صریح ۵۰ وبکم و اشتراک صفحه را از شکست دیرهنگام echo/audio جدا می‌کند. برای آزمون جداگانهٔ ۵۰ اتصال صوتی، مقدار `PERF_AUDIO_USERS=50` را در اجرای مستقل قرار دهید.

برای قبل، `PERF_CLIENT=http://localhost:3002/html5client/`؛ برای بعد، پورت ۳۰۰۰. با `PERF_TARGET=0` نقش مدیر را جدا بررسی کنید. `PERF_WIDTH=390|768|1440` و `PERF_CPU_RATE=1|4|6` باید اجراهای جدا و پوشه‌های جدا داشته باشند. محدودسازی CPU، شبیه‌سازی سخت‌افزار یا دمای گوشی نیست. اجرای پیش‌فرض بیش از دو ساعت طول می‌کشد؛ قبل از شروع، پایداری اتصال و ظرفیت میزبان را با اجرای کوتاه بررسی کنید.

در baseline فاقد کنترل جدید کیفیت، `PERF_ACTIONS=1` تست کنترل را رد خواهد کرد؛ این تست مربوط به قابلیت جدید است و نباید به‌عنوان پسرفت baseline تفسیر شود. مقایسهٔ latency نیازمند تکرار آزمون‌های مشترک قبل و بعد است.

## رسانه و روش ثبت

- منبع وبکم یک Y4M متحرک قابل‌تکرار است؛ صدای WAV فقط برای مدیر اول فعال می‌شود. WebRTC، SFU و گیرنده‌های واقعی برنامه استفاده می‌شوند.
- منبع اشتراک صفحهٔ متنی با `canvas.captureStream(10)` ساخته می‌شود و فقط capture API در مرورگر آزمایش جایگزین می‌شود. ارسال LiveKit و دریافت WebRTC mock نشده‌اند. این تست صحت انتخاب پنجرهٔ سیستم‌عامل را اثبات نمی‌کند.
- هر ۵ ثانیه، CDP Task/Script/LayoutDuration، heap و listener، CPU فرایندهای مرورگر، CPU/RAM کل میزبان و آمار allowlist شدهٔ WebRTC ثبت می‌شوند. CPU فرایند GPU، **مصرف سخت‌افزار GPU نیست**.
- دادهٔ CDP تجمعی است. تحلیل با اختلاف دو نمونه و زمان monotonic CDP انجام می‌شود. CPU فرایندهای مرورگر بر مبنای یک هسته گزارش می‌شود و می‌تواند از ۱۰۰٪ بیشتر شود.
- `PERF_PROFILE=1` پروفایل CPU ده‌ثانیه‌ای می‌گیرد. `PERF_REACT=1` فقط برای تشخیص منشأ رندرهاست؛ در مقایسهٔ عددی خاموش بماند. trace شبکه/صفحه با token عمداً ثبت نمی‌شود.
- `metadata.json` تنظیمات allowlist شدهٔ مؤثر، سخت‌افزار، پارامترهای اجرا، نقش هدف و نام bundle هر مرورگر را دارد. `presence` شمارش API شرکت‌کنندگان و ناشران را ثبت می‌کند. فریم دریافتی در `samples.jsonl` بررسی شود؛ تعداد درخواست‌شدهٔ وبکم به‌معنی دریافت موفق آن تعداد نیست.
- اگر CPU میزبان ≥۸۵٪ یا RAM آزاد <۲ GiB شود، تحلیل اولیه اجرا را اشباع‌شده علامت می‌زند. نبود این علامت، عدم اشباع GPU را اثبات نمی‌کند.
- با `PERF_NATIVE_METRICS=1`، RAM خصوصی و working set فرایندهای مرورگر و شمارنده‌های GPU ویندوز ثبت می‌شوند. برای سرور مستقل، `PERF_SERVER_PID` را تنظیم کنید؛ ناظر این کار را انجام می‌دهد. مجموع working set ممکن است صفحات مشترک را دوباره بشمارد و معادل RAM فیزیکی اختصاصی نیست. شمارندهٔ GPU به تفکیک engine است، نه مصرف توان یا دما. نمونه‌برداری بومی حدود ۱ تا ۲ ثانیه از هر بازهٔ ۵ ثانیه‌ای ابزار را می‌گیرد؛ آن را در هر دو طرف مقایسه یکسان فعال کنید.
- `PERF_TIMELINE=1` یک trace ده‌ثانیه‌ای صرفاً با نام رویدادهای مجاز و مدت آن‌ها ثبت می‌کند؛ آرگومان‌ها و دادهٔ شبکه ذخیره نمی‌شوند. مدت رویدادهای تو‌در‌تو را با هم جمع نزنید. نبود داده را صفر تفسیر نکنید.

```bash
node performance/summarize.cjs ../../docs/safemeet/performance-data \
  test-results/performance/before-viewer test-results/performance/after-viewer
node performance/test-analysis.cjs
```

اسکریپت تحلیل میانگین، انحراف معیار، کمینه، بیشینه و صدک نمونه‌ها را در `summary.json` می‌نویسد. پراکندگی نمونه‌های یک اجرای کوتاه، پراکندگی سه اجرای مستقل نیست.

## دستگاه Android واقعی

پس از فعال‌کردن USB debugging و پذیرش fingerprint رایانه، ADB را forward کنید و چون سرور production محلی فقط روی loopback گوش می‌دهد، پورت آن را به دستگاه reverse کنید:

```powershell
$adb = Join-Path $env:LOCALAPPDATA 'Android\platform-tools\adb.exe'
& $adb forward tcp:9222 localabstract:chrome_devtools_remote
& $adb reverse tcp:3000 tcp:3000
```

با `serve-perf.cjs` فعال و جلسهٔ موجود روی backend، `android-open.cjs` session token را در حافظه از API می‌گیرد و Chrome دستگاه را باز می‌کند. token یا secret چاپ یا ذخیره نمی‌شود. `android-monitor.cjs` هر پنج ثانیه CPU همهٔ پردازش‌های Chrome، PSS/RSS، باتری، thermal status، frame/jank، heap، main thread، و وضعیت video/tileها را ثبت می‌کند:

```powershell
$env:BBB_SERVER = 'https://your-bbb.example.com'
$env:PERF_MEETING_ID = 'agreed-meeting-id'
$env:ANDROID_ROLE = 'VIEWER'
node performance/android-open.cjs

$env:ANDROID_OUTPUT = 'test-results/performance/android-device/samples.jsonl'
$env:ANDROID_SECONDS = '300'
$env:ANDROID_OPEN_WEBCAMS = '1' # در سناریوی رسانه، تب وبکم موبایل را فعال نگه می‌دارد
node performance/android-monitor.cjs
```

`android-open.cjs` نشست‌هایی را که خودش باز می‌کند با fragment برابر `safemeetAndroidTest=1` نشان‌دار می‌کند؛ fragment پس از پاک‌سازی query توسط کلاینت باقی می‌ماند. پیش از ساخت نشست تازه فقط تب‌های آزمایشیِ نشان‌دار بسته می‌شوند و تب‌های جلسه‌ای که کاربر دستی باز کرده است بسته نمی‌شوند. مانیتور ابتدا تب آزمایشیِ قابل‌مشاهده را انتخاب می‌کند و پس از پایان CDP را بدون بستن Chrome دستگاه رها می‌کند.

در SafeMeet، Android User-Agent به‌تنهایی برای انتخاب mobile page size کافی نیست؛ viewport موبایل و column layout نیز باید فعال باشند. این شرط باعث می‌شود تبلتی که ظاهر دسکتاپ دارد همهٔ tileهای صفحهٔ دسکتاپ را ببیند و گوشی واقعی همچنان grid موبایل را بگیرد. اتصال USB و شارژ پایین، اندازه‌گیری دما و battery drain را نامعتبر می‌کند؛ برای soak حرارتی از wireless debugging و شارژ اولیهٔ کافی استفاده کنید.

## بررسی اصلاحات و پاک‌سازی

```bash
cd bigbluebutton-html5
node scripts/test-performance.cjs
node --test imports/ui/components/whiteboard/annotation-sender.test.mjs \
  imports/ui/components/whiteboard/shape-permissions.test.mjs \
  imports/ui/components/skyroom-layout/performance-profile-policy.test.mjs \
  imports/ui/components/video-provider/mobile-webcam-viewport-utils.test.mjs \
  imports/ui/components/video-provider/video-playback-utils.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental
```

در خروج عادی یا خطا، فقط مرورگرهای ساخته‌شده توسط ابزار بسته می‌شوند. جلسه با API پایان داده نمی‌شود. خطوط ساخته‌شدهٔ آزمون تخته با undo حذف می‌شوند؛ آزمون چت جدید پس از تأیید دریافت، فقط همان پیام ساخته‌شده را از مسیر حذف پیام پاک می‌کند. پاک‌کردن کلی تخته/چتِ جلسه انجام نمی‌شود. قطع اجباری فرایند ممکن است cleanup را اجرا نکند؛ وجود `failures.json` و پیام پایان را بررسی کنید. جلسه را هم‌زمان برای کار واقعی استفاده نکنید؛ این ابزار چت آزمایشی و فعالیت رسانه ایجاد می‌کند.
