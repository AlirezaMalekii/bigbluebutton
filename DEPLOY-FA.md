# دیپلوی تغییرات Safemeet روی سرور BBB 3.0.27

## خلاصه

تغییرات شما عمدتاً در **`bigbluebutton-html5`** است (تم Skyroom، فارسی، layout و …).  
برای دیدن آن‌ها روی سرور کافی است **یک بار** دیپلوی HTML5؛ برای همهٔ ماژول‌های repo از دیپلوی کامل استفاده کنید.

این سند فقط workflow توسعهٔ محلی از لپ‌تاپ به سرور BBB را توضیح می‌دهد. CI شاخهٔ `safemeet` این مسیر را اجرا نمی‌کند؛ CI پکیج‌های Debian را می‌سازد و apt repository را منتشر می‌کند. برای CI و انتشار رسمی، `SAFEMEET-BBB-INSTALL-REPO.md` منبع حقیقت است.

| محل | معنی |
|-----|------|
| `/root/dev/bigbluebutton` | سورس sync‌شده از لپ‌تاپ (بعد از `deploy.sh`) |
| `/usr/share/bigbluebutton/html5-client/` | فرانت واقعی که مرورگر لود می‌کند |
| `/usr/share/bigbluebutton/html5-client/private/config/settings.yml` | تنظیمات جلسه (Akka از اینجا می‌خواند) |

---

## پیش‌نیاز (یک بار روی مک)

1. SSH بدون پسورد کار کند:
   ```bash
   ssh -p 3698 root@78.157.39.51 "echo OK"
   ```
2. در ریشهٔ پروژه:
   ```bash
   cd /Users/alirezamaleki/Developer/laravel/SafeMeet/bigbluebutton
   cp deploy.env.example .deploy.env   # اختیاری؛ پیش‌فرض همان IP/پورت شماست
   chmod +x deploy.sh
   ```

---

## حالت پیشنهادی برای شما (فقط UI / Safemeet)

حدود **۱۰–۲۰ دقیقه** (بسته به سرعت سرور):

```bash
cd /Users/alirezamaleki/Developer/laravel/SafeMeet/bigbluebutton
./deploy.sh --only html5
```

این کار:
1. کل repo را به `/root/dev/bigbluebutton` می‌فرستد
2. روی سرور `npm ci` + `npm run build` می‌زند
3. خروجی را در `/usr/share/bigbluebutton/html5-client/` کپی می‌کند
4. **`settings.yml`** را هم sync می‌کند و **`bbb-apps-akka`** را restart می‌کند
5. nginx را برای حالت static ریستارت می‌کند

---

## بعد از دیپلوی — تست

1. در مرورگر **Hard refresh**: `Cmd+Shift+R` (یا پنجره ناشناس)
2. یک جلسه **جدید** باز کنید (جلسهٔ قدیمی کش دارد)
3. در سرور در صورت نیاز:
   ```bash
   bbb-conf --check
   systemctl status bbb-apps-akka nginx --no-pager
   ```

---

## اگر فقط CSS/JS عوض کردی (بار دوم به بعد)

```bash
./deploy.sh --only html5
```

اگر سورس قبلاً sync شده و فقط build می‌خواهی:

```bash
./deploy.sh --skip-sync --only html5
```

---

## دیپلوی کامل (همهٔ ماژول‌های repo)

اگر علاوه بر HTML5، `bbb-web`، `akka-apps`، GraphQL و … را هم عوض کرده‌ای:

```bash
./deploy.sh --no-shared-notes --no-recording --skip-akka-fsesl
```

اولین بار ممکن است **۳۰–۹۰ دقیقه** طول بکشد (نصب sbt روی سرور).

| گزینه | چه موقع |
|--------|---------|
| `--with-graphql` | فقط اگر `bbb-graphql-server` را تغییر داده‌ای (DB reset می‌شود!) |
| `--no-shared-notes` | shared notes را دست نزن |
| `--skip-akka-fsesl` | صدا/Freeswitch ESL را rebuild نکن |

---

## چیزهایی که با این repo دیپلوی **نمی‌شوند**

این‌ها با `bbb-install` / deb روی سرور هستند، نه سورس این fork:

- `bbb-webrtc-sfu`, `mediasoup`, `freeswitch`, `bbb-livekit`, …

---

## عیب‌یابی سریع

| مشکل | کار |
|------|-----|
| UI قدیمی | Hard refresh + جلسه جدید |
| تنظیمات اعمال نشد | `systemctl restart bbb-apps-akka` |
| خطای build روی سرور | `ssh …` سپس `cd /root/dev/bigbluebutton/bigbluebutton-html5 && npm run build` |
| لاگ | `journalctl -u bbb-apps-akka -u nginx -e` |
