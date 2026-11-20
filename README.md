# Spore Sprint

> یک platformer عمودی auto-hop در جنگل قارچ در غروب — فیزیک پرش خودکار، collision یک‌طرفه، دوربین scroll.

[![Version](https://img.shields.io/badge/version-v0.0.3-blue)](https://github.com/andrbi107/spore-sprint/releases/tag/v0.0.3) [![PWA](https://img.shields.io/badge/PWA-installable-purple)](https://andrbi107.github.io/spore-sprint/) [![No deps](https://img.shields.io/badge/dependencies-none-success)](https://github.com/andrbi107/spore-sprint) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

🎮 **[بازی کن](https://andrbi107.github.io/spore-sprint/)** — نسخه‌ی آنلاین روی GitHub Pages
📦 **[مخزن گیت‌هاب](https://github.com/andrbi107/spore-sprint)** · 🏷️ **[Release v0.0.3](https://github.com/andrbi107/spore-sprint/releases/tag/v0.0.3)**

---

## تغییرات v0.0.2 (جدید)

**Spore Sprint** — ice platform: نوع جدید پلتفرم یخی (آبی‌رنگ) با اصطکاک بسیار پایین؛ پس از پرش از آن، حرکت افقی کندتر اصطلاک می‌کند (لغزنده). haptic روی bounce/game-over.

**همه‌ی بازی‌ها** — `mobile-ux.js` مشترک (haptics/install prompt/version stamp) + cache sw.js به v2.

---

## تغییرات v0.0.3 (جدید)

**Spore Sprint** — فاصله‌ی سکوها بر اساس میزان پرش کاراکتر تنظیم شد (gap < ارتفاع پرش + محدودیت افقی)؛ همه‌ی سکوها حالا قابل‌دسترسی‌اند.

---

## معرفی

Spore Sprint یک platformer عمودی portrait در حال‌وهوای جنگل قارچ در غروب است. بازیکن یک قارچ کوچک است که به‌صورت پیوسته بین پلتفرم‌های شناور mossy به بالا می‌پرد. تنها کنترل مستقیم، حرکت افقی است؛ حرکت عمودی خودکار است — هر بار قارچ روی یک پلتفرم فرود می‌آید، خودش را دوباره به هوا پرتاب می‌کند. هدف: تا حد ممکن بالا رفتن، جمع‌کردن sporeهای درخشان برای امتیاز، و جاخالی‌دادن از rot capهای سمی در حال سقوط.

تمام هویت بصری با primitives کانواس ساخته شده: آسمان gradient سبز-تیره با کرم‌های شب درخشان، سیلوئت کاج‌های دور برای عمق parallax، پلتفرم‌های mossy با قارچ‌های red-capped کوچک، و یک قارچ red-capped با نقطه‌های سفید به‌عنوان قهرمان. دشواری با ارتفاع رشد می‌کند: فاصله‌ی پلتفرم‌ها بیشتر، پلتفرم‌های خاص (crumbly/spring/moving) فراوان‌تر، و rot capها بیشتر می‌شوند.

## ویژگی‌ها

- **auto-hop** — gravity پیوسته قارچ را پایین می‌کشد؛ فرود روی پلتفرم = پرش خودکار با `JUMP_V`.
- **۴ نوع پلتفرم** — normal mossy، crumbly (بعد از یک پرش می‌شکند)، spring (پرش اضافه‌بلند)، moving (حرکت سینوسی).
- **wrap افقی** — خروج از یک لبه = ورود از لبه‌ی مقابل.
- **spore streak** — ۵ spore پشت‌سرهم = +۵۰ و بوست سرعت افقی کوتاه.
- **multiplier ارتفاع** — هر ۱۰۰px = +۱ به ضریب امتیاز spore.
- **۳ جان + invuln چشمک‌زن**؛ سقوط از پایین صفحه هم ۱ جان کم می‌کند.
- **دوربین follow** — وقتی قارچ از یک‌سوم بالا بالاتر می‌رود، دوربین دنبال می‌کند.
- **کنترل کامل تاچ + کیبورد + موس**.
- **PWA آفلاین**.

## نحوه‌ی بازی

| دستگاه | حرکت افقی | توقف | شروع/تلاش مجدد |
|---|---|---|---|
| **کیبورد** | ←/→ یا A/D | Esc یا P | Space یا Enter |
| **تاچ** | drag روی صفحه به سمت انگشت یا دکمه‌های ◀ ▶ | دکمه‌ی Pause (بالا-راست) | — |
| **موس** | click-and-drag به سمت x اشاره‌گر | — | — |

### مکانیک بازی

- **auto-hop**: gravity پایین می‌کشد؛ وقتی پاها در حال سقوط از بالای پلتفرم عبور کنند، snap + `vy = JUMP_V`.
- **پلتفرم‌ها**: normal، crumbly (یک پرش → شکست)، spring (`SPRING_V`)، moving (سینوسی).
- **camera**: world coord افزایش به پایین؛ `camY` وقتی y بازیکن < ⅓H بالاتر می‌رود، دنبال می‌کند.
- **spore**: در ~۴۰٪ پلتفرم‌ها؛ +۱۰×multiplier؛ streak ۵ = +۵۰ و بوست ~۱.۵s؛ miss (خروج از صفحه) = reset streak.
- **rot cap**: در بالای صفحه اسپاون، سقوط می‌کنند، AABB collision → −۱ جان + ۹۰-frame blink invuln.
- **multiplier**: `1 + floor(maxClimb/100)`؛ ارتفاع به متر = `floor(maxClimb/10)`.
- **جان/respawn**: شروع ۳؛ loss → respawn روی پلتفرم normal تازه با پرش به بالا، max ارتفاع حفظ می‌شود؛ ۰ = گیم‌اور.
- **رکورد**: `localStorage['sporeSprint.best']`.

## نصب روی موبایل/دسکتاپ (PWA)

1. لینک بازی را در **Chrome** یا **Edge** باز کنید (اندروید/دسکتاپ) یا **Safari** (iOS).
2. منوی مرورگر → **Install app** / **Add to Home screen** (اندروید) یا **Share → Add to Home Screen** (iOS).
3. آیکن روی صفحه‌ی اصلی ظاهر می‌شود؛ اجرای آن تمام‌صفحه و مستقل از مرورگر است.
4. پس از اولین بارگذاری، بازی **بدون اینترنت** هم کار می‌کند (service worker کل shell را cache کرده است).

## تکنولوژی

- **HTML5 `<canvas>`** — تمام رندر با primitives (`arc`, `fillRect`, `translate`, `rotate`, `shadowBlur`).
- **Vanilla JavaScript** — بدون هیچ کتابخانه، framework یا CDN.
- **CSS** با `clamp()` برای تایپوگرافی responsive، `safe-area-inset` برای notch موبایل، و `100dvh`.
- **PWA**: `manifest.json` + `sw.js` (service worker که کل shell را precache می‌کند) → بازی پس از اولین بارگذاری **کاملاً آفلاین** و **قابل نصب** روی اندروید/iOS/دسکتاپ است.
- بدون تصویر، فونت یا فایل صوتی خارجی — همه‌چیز با کد تولید می‌شود.

## ساختار پروژه

| فایل | نقش |
|---|---|
| `index.html` | canvas، HUD، overlayهای start/pause/game-over، دکمه‌های تاچ |
| `styles.css` | لایوت portrait، HUD، overlayها، safe-area، clamp |
| `main.js` | کل بازی: setup، input، فیزیک، entities، render، screenها، loop |
| `manifest.json` | PWA، `orientation:portrait` |
| `sw.js` | precache shell و سرو آفلاین |
| `icon.svg` | قارچ red-capped با نقطه‌های سفید روی gradient جنگل تیره |

## شخصی‌سازی

تمام tunableها بالای `main.js`:

- `GRAVITY`, `JUMP_V`, `SPRING_V` — فیزیک پرش.
- `MAX_VX`, `ACCEL_KEY`, `ACCEL_TOUCH`, `FRICTION` — حرکت افقی.
- `PLAYER_W`, `PLAYER_H` — اندازه‌ی قارچ.
- `BASE_MIN_GAP`, `BASE_MAX_GAP` — فاصله‌ی پلتفرم‌ها (با ارتفاع رشد می‌کند).
- احتمالات نوع پلتفرم در `pickType()`.
- interval اسپاون rot cap در `updateRots()`.
- آستانه‌ی streak spore (۵) و مدت بوست (۹۰).
- رنگ‌ها inline در توابع draw.

## توسعه و اجرای محلی

```bash
git clone https://github.com/andrbi107/spore-sprint.git
cd spore-sprint
# سرویس‌ورکر فقط روی http(s) ثبت می‌شود، پس یک سرور محلی راه بیندازید:
python3 -m http.server 8080
# سپس http://localhost:8080/ را در مرورگر باز کنید
```

برای آزمایش روی موبایل، می‌توانید پوشه را روی گوشی با یک سرور استاتیک سرو کنید یا از `ngrok`/مرورگر موبایل روی همان شبکه استفاده کنید.

## استقرار

محتوای شاخه‌ی `main` به‌صورت خودکار از طریق **GitHub Pages** سرو می‌شود:

**https://andrbi107.github.io/spore-sprint/**

هیچ build stepی لازم نیست — همه‌ی مسیرها relative هستند (`./`)، پس بازی هم از root مخزن و هم از زیرپوشه کار می‌کند.

## نسخه‌گذاری (SemVer)

این پروژه از [Semantic Versioning](https://semver.org/lang/fa/) پیروی می‌کند:

- نسخه‌ها از **`0.0.1`** آغاز می‌شوند (مرحله‌ی پیش از پایداری نهایی؛ هر تغییر می‌تواند breaking باشد).
- قالب: `MAJOR.MINOR.PATCH` → در فاز 0.x: `0.MINOR.PATCH`.
- **هر توسعه یا شخصی‌سازی** در یک شاخه‌ی جداگانه انجام می‌شود:
  - `feat/<name>` برای قابلیت جدید یا شخصی‌سازی
  - `fix/<name>` برای رفع باگ
  - `docs/<name>` برای مستندسازی
  - `refactor/<name>` برای بازسازمان‌دهی کد
- پس از merge به `main`، تگ SemVer بعدی زده می‌شود و یک **GitHub Release** منتشر می‌گردد.
- RELEASE NOTES هر بار در صفحه‌ی Releases مخزن ثبت می‌شود.

### نقشه‌ی نسخه‌بندی پیشنهادی برای توسعه‌های بعدی

| نوع تغییر | bump | مثال |
|---|---|---|
| رفع باگ کوچک، tweak رنگ/عدد | PATCH | `0.0.1` → `0.0.2` |
| قابلیت جدید، مکانیک جدید، level جدید | MINOR | `0.0.1` → `0.1.0` |
| بازنویسی API/ساختار، تغییر breaking | MAJOR (هنوز در 0.x) | `0.1.0` → `0.2.0` |
| رسیدن به پایداری نهایی | — | `0.x.0` → `1.0.0` |

## لایسنس

MIT — استفاده، تغییر و بازنشر آزاد. ساختهشده بهعنوان یک مهارت/قالب آموزشی برای بازی‌سازی PWA با Vanilla JS.
