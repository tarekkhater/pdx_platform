# خطة ربط `broker-platform-ui` بالباك-إند الحالي

> **القرار:** التصميم الجديد يحلّ محل الواجهة القديمة (`New folder (6)` — Paradox Investing)
> بالكامل، على **نفس الباك-إند** `https://backend.hitomorrow.app/api` وبدون أي تغيير في قاعدة
> البيانات إلا فيما هو موضّح صراحة في [ملحق ج](#ملحق-ج--قرارات-مطلوبة-من-الباك-إند).
>
> كل أسماء الملفات والحقول والـ endpoints بالإنجليزية كما هي في الكود. الشرح بالعربية.

---

## 0 · المبدأ الحاكم

الواجهة الجديدة عندها **نموذج دومين نظيف** (`entryPrice`, `lots`, `closedAt`) والباك-إند
عنده **نموذج قديم** (`opening_price`, `lot`, `close_at`). الإغراء إننا نعدّل المكوّنات
عشان تقرأ أسماء الباك-إند — وده غلط، لأنه هيلوّث ٥٤ مكوّن بأسماء السيرفر ويخلّي أي
تغيير مستقبلي في الـ API يمسّ الواجهة كلها.

**القاعدة:** طبقة `adapters` هي الحدود الوحيدة اللي بتعرف الشكلين. فوقها لا أحد يعرف
`snake_case`، وتحتها لا أحد يعرف React.

```
المكوّنات (لا تتغير أسماء حقولها إطلاقاً)
        ↑
  TradingContext / AccountContext / AuthContext
        ↑
  src/services/*        ← يستدعي الـ endpoints ويرجّع شكل الدومين
        ↑
  src/adapters/*        ← الحدّ الوحيد: backend shape ⇄ domain shape
        ↑
  src/lib/api.js        ← axios + token + retry + 401
  src/lib/realtime/*    ← Pusher + liveRatesStore
```

---

## 1 · شجرة الملفات المستهدفة

الملفات المعلّمة بـ ⬛ منقولة **كما هي تقريباً** من المشروع القديم (منطق مُختبر في
الإنتاج، ما ينفعش يتكتب من الأول).

```
src/
├── lib/
│   ├── api.js                    ⬛ من Api.jsx — axios instance + interceptors
│   └── realtime/
│       ├── socketPusher.js       ⬛ قناة currencies + إبقاؤها حيّة عبر التنقّل
│       ├── liveRatesStore.js     ⬛ Map الأسعار + قفل Pusher ضد بذرة الـ API
│       ├── liveRatePayload.js    ⬛ تطبيع ٥ أشكال payload مختلفة
│       └── markPrice.js          ⬛ استخراج mid rate + اتجاه الصفقة
│
├── domain/                       ← منطق مالي خالص، بدون React وبدون axios
│   ├── pnl.js                    ⬛ من calcPnL.js
│   ├── order.js                  ⬛ من tradeOpen.js (سعر الدخول + الهامش)
│   ├── marketStatus.js           ⬛ ساعات السوق + قِدم السعر
│   └── tradeLock.js              ⬛ قفل الإغلاق + السماح بالتداول
│
├── adapters/                     ← جديد بالكامل — قلب الخطة
│   ├── instrument.js             backend asset  ⇄ instrument
│   ├── position.js               backend trade  ⇄ position
│   ├── closedTrade.js            backend trade  ⇄ closedTrade
│   ├── pendingOrder.js           backend trade  ⇄ pendingOrder
│   ├── account.js                backend finance ⇄ BALANCE
│   ├── transaction.js            backend txn    ⇄ transaction
│   ├── profile.js                backend profile ⇄ profile
│   └── symbolMap.js              id ⇄ symbol — الجسر الأهم
│
├── services/                     ← دالة لكل عملية، تستدعي api + adapter
│   ├── auth.service.js
│   ├── instruments.service.js
│   ├── trades.service.js
│   ├── account.service.js
│   ├── wallet.service.js
│   ├── profile.service.js
│   └── certificates.service.js
│
├── context/
│   ├── AuthContext.jsx           ← جديد
│   ├── AccountContext.jsx        ← جديد (الرصيد + المعاملات)
│   ├── InstrumentsContext.jsx    ← جديد (يحلّ محل config/instruments.js)
│   ├── LiveRatesContext.jsx      ← جديد (يغلّف useLiveRates)
│   ├── TradingContext.jsx        ← يتعدّل: نفس الواجهة، مصدر مختلف
│   └── ThemeContext.jsx          ← كما هو
│
├── components/auth/RequireAuth.jsx  ← جديد — حارس المسارات
│
└── data/                         ← يُحذف بالكامل في نهاية الربط
    ├── account.js                → account.service
    ├── trades.js                 → trades.service (عدا shouldFill: تنتقل للسيرفر)
    └── clientDocuments.js        → يبقى التعريفات، وتنتقل الإقرارات للسيرفر
```

---

## 2 · المرحلة ٠ — التحضير

**١. الاعتماديات الناقصة**

```bash
npm i axios js-cookie laravel-echo pusher-js @react-oauth/google
```

**٢. متغيّرات البيئة** — المشروع القديم كان بيحطّ كل حاجة في الكود. نوقف ده:

```
# .env.example  (يُرفع للريبو)
VITE_API_BASE_URL=https://backend.hitomorrow.app/api
VITE_PUSHER_KEY=
VITE_PUSHER_CLUSTER=eu
VITE_BROADCAST_AUTH_URL=https://backend.hitomorrow.app/api/broadcasting/auth
VITE_GOOGLE_CLIENT_ID=
```

**٣. بروكسي التطوير** — المشروع الجديد **ماعندوش `server.proxy` إطلاقاً**. يُضاف في
`vite.config.js` جنب إعدادات `server` الموجودة:

```js
proxy: {
  '/api': {
    target: 'https://backend.hitomorrow.app',
    changeOrigin: true,
    secure: false,   // شهادة التطوير فقط — لا تصل للإنتاج
  },
},
```

**٤. توسيع الـ CSP** — سياسة `vite.config.js` (سطر ١٥٣) حالياً بتسمح لـ TradingView بس.
لازم تضيف:

| التوجيه | الإضافة | السبب |
| --- | --- | --- |
| `connect-src` | `https://backend.hitomorrow.app wss://*.pusher.com https://*.pusher.com` | الـ API + السوكيت |
| `script-src` | `https://accounts.google.com` | تسجيل الدخول بجوجل |
| `frame-src` | `https://accounts.google.com` | نافذة جوجل |
| `img-src` | `https://backend.hitomorrow.app` | صور الأصول والشعارات |

ونفس الشيء في `public/_headers` — الملفين لازم يفضلوا متطابقين، وده مذكور في `SECURITY.md`.

**٥. حذف الكود الميّت** قبل ما نبدأ، عشان ما نضيّعش وقت في ربط حاجة مش مستخدمة:

`TradingChart.jsx` · `BalanceBar.jsx` · `PortfolioPanel.jsx` · `MobileNav.jsx` ·
`MarginLevelModal.jsx` · `WelcomeMessage.jsx` · `CallToAction.jsx` · `HeroImage.jsx`

---

## 3 · المرحلة ١ — الـ API والمصادقة والحراسة

### ١-أ · نقل طبقة الـ API

`src/lib/api.js` نسخة من `Api.jsx` القديم مع أربع تعديلات:

1. `baseURL` من `import.meta.env.VITE_API_BASE_URL` بدل الرابط المكتوب في الكود
2. حذف كتلة `httpAgent`/`httpsAgent` — فيها `require()` جوّه مشروع ESM، ميّت أصلاً
3. معالج الـ 401 ما يعملش `window.location.href` — يطلق حدث `auth:expired` يلتقطه
   `AuthContext` ويعمل `navigate`، عشان ما نفقدش حالة React ولا نعمل reload كامل
4. مسارات صفحات المصادقة تتحدّث: `/login`, `/register`, `/onboarding` (القديم كان
   بيفحص `/auth/*` وده مش موجود في التصميم الجديد)

> **ملاحظة:** نسخة axios التانية (`src/api/index.js` في القديم، بترويستات RapidAPI
> وهمية) **لا تُنقل**. نسخة واحدة بس.

### ١-ب · `AuthContext`

| ما يعرضه | النوع |
| --- | --- |
| `user` | `{ id, name, email, image, role, type, verified, kyc, blocked, aiTrading }` |
| `token` | `string \| null` |
| `status` | `'loading' \| 'authenticated' \| 'anonymous'` |
| `login(email, password)` | → `{ ok, reason }` حيث `reason ∈ blocked \| unverified \| kyc` |
| `loginWithGoogle(credential)` | |
| `register(payload)` | |
| `logout()` | |
| `refreshUser()` | |

التخزين: كوكي `token` (كما هو في القديم عشان الجلسات الحالية ما تنكسرش) + مرآة في
`localStorage` لبدء التشغيل من توكن الـ URL.

### ١-ج · حارس المسارات — أول مكسب أمني

`App.jsx` حالياً بيقسم المسارات لفرعين: `AUTH_ROUTES` والباقي. التعديل على الفرع
التاني بس:

```jsx
) : (
  <RequireAuth>
    <Layout>
      {/* ...المسارات كما هي بالضبط... */}
    </Layout>
  </RequireAuth>
)
```

`RequireAuth` بيعمل: `status === 'loading'` → شاشة تحميل · `'anonymous'` →
`<Navigate to="/login" replace state={{ from: location }} />` · غير كده → `children`.

> ده بيقفل الثغرة المذكورة في `HANDOFF.md` بند ٢ و`SECURITY.md`: `/wallets` و`/profile`
> و`/transactions` حالياً بتفتح بكتابة الرابط.

### ١-د · ربط الشاشات الموجودة

**`Login.jsx`** — استبدال الـ `setTimeout(600)` (سطر ٣٣–٤٦) بـ `login()`. منطق التوجيه
منقول من `Login.jsx` القديم:

```
blocked      → رسالة خطأ، لا توجيه
!verified    → /verify-email   (شاشة جديدة — انظر ١-هـ)
!kyc         → /onboarding     (بدل /profile في القديم)
غير ذلك      → location.state.from ?? '/'
```

**"تذكّرني"** حالياً شكلي (سطر ٥٢). يتحوّل لمدّة الكوكي: مفعّل ٣٠ يوم، غير مفعّل
كوكي جلسة.

**`Register.jsx` + `Onboarding.jsx`** — فيه تعارض حقيقي هنا:

`Register` بيجمّع بريد وكلمة مرور وموافقة فقط. الباك-إند
`POST /users/Auth/register` بيطلب `name, surname, email, phone, country, currency,
postal, address, permanent_address, password, confirm_password, type_account`.

`Onboarding` بيجمّع الباقي بالظبط (خطوات `personal` و`address`).

**التوصية:** `Register` يحتفظ ببياناته في حالة الراوتر ويوجّه لـ `Onboarding` بدون أي
نداء API. خطوة `review` في `Onboarding` هي اللي بتنادي `register` بالحمولة المدمجة.
كده الحساب ما يتخلقش ناقص، والمستخدم ما يقدرش يهرب من الاستبيان بإقفال التبويب بعد
التسجيل. خطوات `financial` و`experience` (اللي مالهاش مقابل في الباك-إند) تروح لـ
`POST /users/account/update` بعد نجاح التسجيل مباشرة.

يحتاج من الباك-إند: `GET /countries/all` و`GET /currency/all` لتعبئة قوائم
`src/config/onboarding.js` بدل `OPTION_SETS` الثابتة.

### ١-هـ · شاشات ناقصة لازم تتبني

| الشاشة | الحالة في التصميم الجديد | الـ endpoints |
| --- | --- | --- |
| `/verify-email` | **غير موجودة** | `POST /users/Auth/verification` · `POST /users/Auth/resend` |
| `/forgot-password` | زرار بيطلّع toast (`Login.jsx` سطر ١٢٠) | `POST /users/Auth/forget/password` |
| `/reset-password` | **غير موجودة** | `.../check/code` ثم `.../change` |
| `/404` | **غير موجودة** | — |

> **تنبيه:** في المشروع القديم الشاشات دي موجودة بس **مزيّفة** — `VerifyEmail.jsx` و
> `VerifyCode.jsx` بينادوا `setTimeout` بدل الـ thunks الموجودة فعلاً جنبهم، فمسار
> استعادة كلمة المرور مكسور من الآخر في الإنتاج دلوقتي. الـ thunks سليمة وتتنقل كما هي؛
> اللي كان ناقص هو التوصيل. **ما تنقلش شكل الشاشات دي من القديم — انقل منطقها بس.**

### ١-و · مميزات تُنقل من القديم

| الميزة | الملف القديم | ليه مهمّة |
| --- | --- | --- |
| تسجيل الدخول بجوجل | `components/auth/GoogleSignIn.jsx` | موجود في الإنتاج |
| التقاط `?desk_ref=` | `utils/deskRef.js` | إسناد الإحالات — فقدانه يعني فقدان عمولات |
| الدخول بتوكن من الـ URL | `utils/urlAuthToken.js` | تحويل المستخدمين من الـ CRM |

التلاتة بينادوا في `main.jsx` **قبل** أول render. الـ Client ID بتاع جوجل ينتقل لمتغيّر
بيئة بدل القيمة الاحتياطية المكتوبة في الكود (`GoogleSignIn.jsx` سطر ٢٣٠).

---

## 4 · المرحلة ٢ — الأصول وجسر `symbol ⇄ id`

**دي أخطر مرحلة في الخطة كلها.**

التصميم الجديد بيستخدم النص `'BTC/USD'` كمفتاح في **كل حتة**: `selectedAsset`،
التفضيلات في `localStorage`، `position.asset`، `TRADINGVIEW_SYMBOLS`،
`getInstrument(symbol)`.

الباك-إند بيستخدم `id` رقمي في **كل حتة**: أسعار Pusher مفهرسة بـ `id`،
`trade.currency.id`، `/users/assets/show/{id}`، تبديل المفضّلة بـ `{ id }`.

### الحل: `src/adapters/symbolMap.js`

يُبنى مرة واحدة عند تسجيل الدخول من `GET /users/assets?type=...` لكل نوع، ويُحفظ في
`InstrumentsContext`:

```js
bySymbol: Map<'BTC/USD', Instrument>
byId:     Map<'1',        Instrument>
symbolOf(id) · idOf(symbol)
```

**من أين يأتي الـ symbol؟** الباك-إند بيرجّع `name` و`sym` و`ex_sym` و`symbol` بشكل
غير متّسق. الترتيب المقترح: `ex_sym ?? sym ?? symbol ?? name`، مع تطبيع (حروف كبيرة،
إزالة المسافات). **لازم يتأكد من الباك-إند إن الحقل ده فريد وثابت** — لو مش مضمون،
ده أول بند في [ملحق ج](#ملحق-ج--قرارات-مطلوبة-من-الباك-إند).

### شكل الـ Instrument بعد التوسيع

`src/config/instruments.js` كان ثابتاً وبيحمل ٦ حقول. الشكل الجديد بييجي من السيرفر:

| حقل جديد | المصدر | ملاحظة |
| --- | --- | --- |
| `id` | `asset.id` | مفتاح Pusher والصفقات |
| `symbol` | `ex_sym ?? sym ?? name` | مفتاح الواجهة |
| `name` | `asset.name` | |
| `category` | `asset.type` بأول حرف كبير | من `GET /users/assets/types` |
| `contractSize` | `finance.amount` | **يحلّ المشكلة رقم ١ في `HANDOFF.md`** |
| `buySpread` | `asset.buy_spread` | **نسبة مئوية**، ليست قيمة سعرية |
| `sellSpread` | `asset.sell_spread` | نسبة مئوية |
| `leverage` | `asset.leverage` | الرافعة المسموحة للأصل |
| `decimals` | — | **الباك-إند لا يوفّره** — انظر ملحق ج |
| `openAt` `closeAt` `timezone` | `asset.open_at` … | لفحص ساعات السوق |
| `image` | `asset.image` | التصميم الجديد لا يعرض شعارات حالياً — فرصة |
| `isFavourite` | `asset.is_favourite` | المفضّلة تنتقل من `localStorage` للسيرفر |

### تغيير جوهري: معنى `spread`

هنا خطأ حسابي هيحصل بصمت لو اتغفل.

```js
// التصميم الجديد — OrderPanel.jsx سطر ١٤٦، قيمة سعرية مطلقة ومتماثلة
const bid = currentPrice - spread / 2;
const ask = currentPrice + spread / 2;

// الباك-إند — نسبة مئوية وغير متماثلة (tradeOpen.js سطر ٤٠)
const ask = mid + (buySpread  / 100) * mid;   // الشراء فوق المتوسط
const bid = mid - (sellSpread / 100) * mid;   // البيع تحت المتوسط
```

`BTC/USD` عنده `spread: 5` في التصميم الجديد. لو اتعامل كنسبة مئوية = ٥٪ من ٦٢٠٠٠
= ٣١٠٠ دولار فرق سعر. **الحقل `spread` يُحذف من شكل الـ instrument** ويُستبدل بـ
`buySpread`/`sellSpread`، وتُنقل الدالتين من `domain/order.js`. الأماكن المتأثّرة:
`OrderPanel.jsx` (١٤٦–١٤٧) و`AssetList.jsx` (١٥٨–١٥٩).

### المفضّلة

`TradingContext` سطر ٦–٨ فيه تعليق بيقول «لما الباك-إند ييجي، بدّل `readFavourites`
وما حدش تاني هيتغيّر» — وده صحيح فعلاً. `toggleFavourite` ينادي
`POST /users/assets/favourite { id }` مع تحديث متفائل ورجوع عند الفشل.
`localStorage` يفضل كـ cache للقراءة الأولى قبل ما الشبكة ترد.

### `/assets` — صفحة مكسورة

`Assets.jsx` (سطر ١٨–٢٠) بيوجّه لـ `/` بعد ثانية **من غير ما ينادي
`setSelectedAsset`** — التعليق نفسه معترف بالنقص. الإصلاح سطر واحد، لكن مكانه هنا
لأنه بيعتمد على `InstrumentsContext`.

---

## 5 · المرحلة ٣ — الأسعار الحيّة

دي أكبر فجوة وظيفية: التصميم الجديد **ماعندوش أي اتصال لحظي**.

### الوضع الحالي في التصميم الجديد

`TradeStation.jsx` سطر ٣٨–٤٠:

```js
setCurrentPrice((prev) => prev * (1 + (Math.random() - 0.5) * 0.0006));
```

مؤقّت كل ثانيتين بيولّد سعر عشوائي. والشارت جنبه ويدجت TradingView بسعر سوق حقيقي.
الاتنين ما بيتفقوش أبداً — و`HANDOFF.md` (سطر ٩٤–٩٨) بيقول ده صراحة.

### النقل

`socketPusher.js` · `liveRatesStore.js` · `liveRatePayload.js` · `markPrice.js` تُنقل
كما هي. المنطق ده أنضج مما يبدو ويستحق الفهم قبل لمسه:

- **قفل Pusher** (`liveRatesStore.js` سطر ٨٧): أول ما يوصل سعر حقيقي لأصل، بذرة الـ API
  ما تقدرش تدهس عليه أبداً. يمنع ارتداد السعر للخلف
- **نفس السعر يجدّد `updatedAt`** (سطر ٧٥–٨٤): السوق البطيء بيبعت نفس القيمة؛ لولا ده
  كان هيتعامل كسعر ميّت والأصل يقفل
- **القناة تعيش عبر التنقّل** (`socketPusher.js` سطر ٢٣١): الاشتراك ما بيتفكّش مع
  تفكيك المكوّن، الـ callbacks بس هي اللي بتتفكّ

### `LiveRatesContext`

يغلّف `subscribeLiveRates` ويعرض:

```js
{
  rates,                       // { [id]: { rate, buy_p, sell_p, updatedAt, source } }
  quoteFor(symbol),            // { mid, bid, ask, fresh, updatedAt }
  isTradeable(symbol),         // domain/marketStatus.js
}
```

### التعديلات على المكوّنات

| المكوّن | قبل | بعد |
| --- | --- | --- |
| `TradeStation.jsx` ٣٥–٤٣ | مؤقّت عشوائي | `quoteFor(selectedAsset).mid` — **يُحذف الـ `useEffect` بالكامل** |
| `TradeStation.jsx` ٥٢–٦٤ | `fillPendingOrders` محلياً | يُحذف — السيرفر ينفّذ، والواجهة تحدّث القائمة |
| `AccountStatsBar.jsx` ٧٤ | `currentPrice` كـ prop | نفس الـ prop، مصدر مختلف — **لا يتغيّر** |
| `AssetList.jsx` ١٥٨–١٥٩ | `price ± spread` ثابت | `quoteFor(symbol).bid/.ask` لحظي |
| `OpenTrades.jsx` | `pnl` ساكن من البذرة | `calcPnL(trade, rates)` كل tick |

**البذرة قبل أول tick:** المشروع القديم بينادي `verifyAssetTradable` كل ٤ ثواني حتى
يقفل Pusher الأصل (`TradeStation.jsx` القديم سطر ٣٣٣–٣٧٨). يُنقل كما هو، وإلا الواجهة
هتفضل فاضية لحد أول حركة سعر — وده ممكن يبقى دقايق في سوق بطيء.

### حالة السوق

`domain/marketStatus.js` بيمنع فتح صفقة لو: السيرفر قال `tradable: false` · الوقت
بره `open_at`–`close_at` بتوقيت الأصل (الكريبتو معفيّ) · السعر قديم (٤٥ ثانية للكريبتو،
١٨٠ لغيره) · الـ payload فيه علم إغلاق صريح.

التصميم الجديد **ماعندوش أي فكرة عن أصل مقفول** — لا حالة بصرية ولا منع. محتاج:
شارة «السوق مغلق» في `AccountStatsBar` و`AssetList`، وتعطيل أزرار الشراء/البيع في
`OrderPanel` مع سبب واضح.

---

## 6 · المرحلة ٤ — الأوردر والمراكز

### ٤-أ · تحذير: `amount` معناها مختلف في المشروعين

| | القديم (الباك-إند) | الجديد (التصميم) |
| --- | --- | --- |
| `amount` | **حجم العقد** — عدد الوحدات في اللوت | **القيمة الاسمية** بعملة الحساب |
| `total` | الهامش المحجوز | — |
| `margin` | — | الهامش المحجوز |
| `trade_amount` | القيمة الاسمية (مقام حساب ROI) | — |

`calcPnL.js` سطر ٥٢ بيستخدم `amount` كمُضاعِف: `price_diff * amount * lot`. لو
اتعامل كقيمة اسمية، كل أرقام الربح والخسارة في المنصة هتبقى غلط بمقدار آلاف الأضعاف.
**الـ mapper لازم يترجم، والمراجع لازم يتأكد من البند ده تحديداً.**

### ٤-ب · `adapters/position.js`

```
domain                backend
──────────────────────────────────────────────────────────────
id            ←  trade.id
positionId    ←  trade.id                     (أو مرجع الوسيط لو وُجد)
asset         ←  symbolOf(trade.currency.id)
side          ←  direction ∈ {buy,long} ? 'BUY' : 'SELL'
leverage      ←  trade.leverage
lots          ←  trade.lot
contractSize  ←  trade.amount_user_pnl ?? trade.amount     ← حقل جديد في الشكل
entryPrice    ←  trade.opening_price ?? trade.open_price
currentPrice  ←  markPrice(rates, trade.currency.id)       ← لحظي، لا يأتي من الـ REST
amount        ←  trade.trade_amount ?? lots × contractSize × entryPrice
margin        ←  trade.total
pnl           ←  calcPnL(trade, rates)                     ← محسوب، لا يُقرأ
stopLoss      ←  trade.stop_loss        ⚠ انظر ٤-د
takeProfit    ←  trade.take_profit      ⚠ انظر ٤-د
openedAt      ←  toISO(trade.open_at ?? trade.created_at)
spread        ←  trade.spread                              ← لازم لحساب الربح
commission    ←  trade.com
closeState    ←  { canClose, remainingSeconds, availableAt, minCloseHours }
```

`closeState` مالهوش مقابل في التصميم الجديد خالص. المشروع القديم بيمنع إغلاق الصفقة
قبل مدة دنيا ويعرض عدّاد تنازلي (`hooks/useTradeCloseCountdown.js`). لازم يتبني في
`OpenTrades.jsx`: زر الإغلاق يتعطّل ويعرض الوقت المتبقّي.

### ٤-ج · `adapters/closedTrade.js`

الشكل الجديد بيطلب تفصيل مالي أدقّ من اللي الباك-إند بيوفّره:

| الحقل | المصدر | الحالة |
| --- | --- | --- |
| `exitPrice` | `closed_price ?? closing_price` | ✅ |
| `pnl` | `profit ?? pnl` | ✅ صافي |
| `commission` | `com` | ✅ |
| `grossPnl` | — | ❌ غير موجود |
| `swap` | — | ❌ غير موجود |
| `closeReason` | — | ❌ غير موجود |

`closeReason` بتحدّد أيقونة وشرح الصف في `OpenTrades`، وفي البيانات الوهمية فيه حالة
`marginCall` كاملة. من غير الحقل ده كل الصفقات هتتعرض كـ «إغلاق يدوي» — بما فيها
التصفيات، وده تضليل للعميل. مطلوب من الباك-إند (ملحق ج).

الحل المؤقّت لو الباك-إند مش هيضيفها: `grossPnl = pnl - commission` و`swap = 0`،
وإخفاء عمود سبب الإغلاق بدل تزييفه.

### ٤-د · تحذير: `stop_loss` / `take_profit` معناهم مختلف

في `OrderPanel.jsx` القديم (سطر ٢٨٢–٢٩٦) الحقلين بيتبعتوا كـ **مبلغ ربح/خسارة
بالدولار**. في التصميم الجديد الحقلين **سعر** (`slMode`/`tpMode` = `'price'`).

لازم يتأكد من الباك-إند إيه اللي بيتوقّعه. **الخبر الكويس:** التصميم الجديد عنده
أصلاً مفتاح تبديل جاهز — `slMode`/`tpMode` بقيمتين `price | amount` (سطر ١٢٩–١٣٠،
معروض في `slTpField` سطر ٧٧٤–٧٧٥). فالواجهة موجودة؛ المطلوب بس إن الـ adapter يحوّل
وضع `price` لمبلغ عند الإرسال لو الباك-إند بيتوقّع دولار:

```
take_profit = |targetPrice − entryPrice| × contractSize × lots
```

### ٤-هـ · إنشاء الأوردر

`OrderPanel.handlePlaceOrder` (سطر ٢٣٧–٢٩٨) حالياً بينادي `addPosition` أو
`addPendingOrder` محلياً. يبقى ينادي `trades.service.createTrade()` اللي بيبني:

```js
POST /users/trade/create
{
  symbol, direction, type: direction,
  price: entryPrice, opening_price: entryPrice,
  lot, amount: contractSize,
  total: computeTradeTotal(lot, contractSize, entryPrice, leverage),
  take_profit, stop_loss,
  pendingOrder: execution === 'pending' ? targetPrice : 0,
  leverage, spread,
}
```

**توحيد معادلة الهامش.** التصميم الجديد عنده معادلتين حسب الوحدة (`OrderPanel` سطر
١٥٥–١٥٧):

```js
notional      = unit === 'lots' ? lots * price : lots * leverage;
initialMargin = unit === 'lots' ? notional / leverage : lots;
```

وضع «لوت» بيفترض حجم عقد = ١ (المشكلة رقم ١ في `HANDOFF`). وضع «دولار» بيعتبر المبلغ
المُدخل هو الهامش نفسه. المعادلة المعتمدة من `domain/order.js`:

```js
margin = (lots × contractSize × entryPrice) / leverage
```

ووضع «دولار» يبقى العكس: `lots = (usd × leverage) / (contractSize × entryPrice)`.

**بعد التعديل:** بطاقة تأكيد الأوردر والمراكز وشريط الإحصائيات هيتصحّحوا مع بعض —
وده نفس اللي `HANDOFF.md` متوقّعه بالظبط في بند ١.

**الرافعة:** المشروع القديم بيعرض خيارات ١٠–٥٠٠ وبيمنع تغييرها برسالة «اتصل بالدعم»
(`OrderPanel` القديم سطر ٩٦–١٠١) — رافعة الأصل بس هي المعتمدة. التصميم الجديد بيسمح
بالتغيير بحرّية. لازم قرار: لو نفس القيد، الـ slider يتقفل على `instrument.leverage`،
ونقطة طلب زيادة الرافعة موجودة أصلاً وجاهزة في `DocumentsPanel`.

### ٤-و · الأوردرات المعلّقة — تنتقل للسيرفر

`HANDOFF.md` (سطر ٦٤–٦٨) قلقان إن `shouldFill()` بتشتغل في المتصفح وبس على الأصل
الظاهر على الشاشة. **الخبر الكويس:** الباك-إند بالفعل بيستقبل `pendingOrder` وبينفّذ
التنفيذ عنده.

النتيجة: `shouldFill` و`fillPendingOrders` **يُحذفوا من الواجهة**، و`TradeStation`
سطر ٥٢–٦٤ يتشال. الإشعار بالتنفيذ يييجي من تحديث قائمة الصفقات (أو من حدث Pusher لو
الباك-إند وفّره — مفضّل بكثير على الاستطلاع).

**الناقص:** مالقيتش endpoint بيرجّع **قائمة** الأوردرات المعلّقة. `/users/profile/index`
بيرجّع عدّاد `trades.pending` فهي متتبَّعة عند السيرفر، لكن التصميم الجديد عنده
تبويب كامل بيعرضها. مطلوب من الباك-إند (ملحق ج).

### ٤-ز · `TradingContext` — نفس الواجهة، مصدر مختلف

**ما تغيّرش توقيع ولا اسم أي دالة.** الستة أفعال يفضلوا بنفس أسمائهم، كل واحد بيبقى
نداء API + تحديث متفائل + رجوع عند الفشل. ده بيخلّي المكوّنات اللي بتستخدمهم ما تتلمسش
خالص.

| الفعل | يصبح |
| --- | --- |
| `addPosition` | `POST /users/trade/create` |
| `closePosition(id)` | `POST /users/trade/close/trade { id, profit: calcPnL(...) }` |
| `closeAllPositions()` | تكرار متسلسل — **انظر التحذير تحت** |
| `addPendingOrder` | نفس `create` بـ `pendingOrder` |
| `cancelOrder(id)` | ❌ **مفيش endpoint** — مطلوب |
| `fillPendingOrders` | يُحذف — مسؤولية السيرفر |

> **`closeAllPositions` خطرة.** في الوهمي بتمسح مصفوفة. في الحقيقة بتقفل كل مراكز
> العميل بأسعار السوق. لازم: نافذة تأكيد بالإجمالي المتوقّع · تنفيذ متسلسل لا متوازي
> (تفادياً لحدّ المعدّل ٤٢٩) · تقرير جزئي عند فشل بعضها · **الأفضل:** endpoint واحد
> عند السيرفر يقفل الكل ذرّياً.

---

## 7 · المرحلة ٥ — الحساب والمحفظة والمعاملات

### `adapters/account.js`

```
domain              backend  (GET /users/Home/finance)
─────────────────────────────────────────────────────────
balance          ←  finance.balance
margin           ←  finance.margin
awaitingDeposit  ←  finance.awaiting_deposit
pnl              ←  Σ calcPnL(openTrades, rates)     ← محسوب لحظياً
equity           ←  balance + pnl
freeMargin       ←  equity − margin
freeMarginPercent←  (freeMargin / equity) × 100
credit           ←  ⚠ انظر تحت
```

`BalanceBar` القديم بيعرض `awaiting_deposit` تحت مسمّى **«Credit»**. التصميم الجديد
عنده الحقلين **منفصلين** في `AccountStatsBar` (سطر ٤٩–٥٥): `credit` و`awaitingDeposit`.
يا إمّا الباك-إند عنده حقل رصيد ائتماني منفصل ولم يُعرض، يا إمّا التسمية القديمة كانت
خطأ. مطلوب توضيح (ملحق ج).

**`AccountStatsBar` بيستورد `BALANCE` مباشرة** (سطر ٦). يتحوّل لـ `useAccount()`.
نفس الشيء في `OrderPanel` اللي فيه ثابت `ACCOUNT_BALANCE` مكتوب في الكود (سطر ١٥٧)
وفي `TradingContext` اللي فيه `account.pnl: 0` ثابت (سطر ١٩٩). **تلات مصادر للحقيقة
عن نفس الرقم** — يتوحّدوا في `AccountContext`.

### `adapters/transaction.js`

```
domain            backend  (POST /users/transactions?page=N  { type, search })
──────────────────────────────────────────────────────────────────────────────
id        ←  txn.id
type      ←  خريطة: bank/wire → 'wire' · credit → 'credit'
             · usdt/crypto → 'crypto' · card → 'card'
amount    ←  Number(txn.amount)
notes     ←  اسم البنك / الشبكة / آخر ٤ أرقام
date      ←  toISO(txn.created_at)      ⚠ انظر تحت
status    ←  0 → 'pending' · 1 → 'approved' · 2 → 'rejected' · 3 → 'awaiting'
incoming  ←  مشتقّ من نوع الطلب (إيداع مقابل سحب)
```

> **`date` لازم تتحوّل لـ ISO.** `data/account.js` (سطر ٢٨–٤٠) حالياً فيها نصوص عرض
> زي `'Aug 20, 2025'` — وده يخالف القاعدة المكتوبة في `HANDOFF.md` نفسه («كل طابع
> زمني ISO 8601»). الترتيب شغّال بالصدفة عن طريق `Date.parse`، لكن التنسيق حسب اللغة
> مستحيل. تُصلَح أثناء الربط.

> **حالة `'awaiting'` (٣) جديدة على التصميم.** `STATUS_CLASS` في `TransactionRow.jsx`
> (سطر ١٧–٢١) بيعرف `approved`/`success`/`pending`/`rejected`. الحالة الجديدة مش
> هتكسر حاجة — `statusClass` عنده احتياطي رمادي و`StatusPill` بيرجع للنص الخام لو
> الترجمة ناقصة — لكن محتاجة لون خاص بيها ومفتاح في `transactions.status.*`.

### الإيداع والسحب

النماذج موجودة وكاملة بصرياً، كلها بتنتهي بـ toast. الحمولات تُنقل من مودالات
المشروع القديم كما هي:

| العملية | Endpoint | ملاحظة |
| --- | --- | --- |
| إيداع بطاقة | `POST /users/account-bank/store` | `card_holder, card_number, card_cvv, card_expiry_month, card_expiry_year, amount, zip_code` |
| إيداع كريبتو | `POST /users/Deposits/store/usdt` | العناوين من `GET /users/Deposits/wallets` |
| إيداع بنكي | `POST /users/Deposits/store/bank` | |
| سحب بنكي | `POST /users/withdrawal/store/wireaccount` | `country, currency, amount, iban, firstName, lastName, email, accountType` |
| سحب كريبتو | `POST /users/withdrawal/store/usdt` | `name, address, amount, crypto_type, crypto_symbol, network` |

> **أمان:** بيانات البطاقة بتمرّ عبر السيرفر بتاعنا حالياً. ده نطاق PCI-DSS كامل.
> `SECURITY.md` ما بيتطرّقش للنقطة دي وهي تستاهل قرار: إمّا iframe/tokenization من
> مزوّد الدفع، إمّا توثيق الالتزام. **لا تنقل السلوك ده بدون مراجعة.**

`CryptoWithdrawalModal` القديم بيطلّع toast «غير مفعّل بعد» — التصميم الجديد عنده
النموذج كامل، فده تحسين مش نقل.

### `Wallets.jsx`

القديم بيعرض «حيازات» بمعرّفات أصول مكتوبة في الكود (BTC=1, ETH=2, XAU=279, SOL=15)
ونِسب مخترعة من رصيد التداول. **ما يتنقلش.** إمّا endpoint حقيقي للمحفظة، إمّا
تُشتقّ من المراكز المفتوحة الفعلية.

---

## 8 · المرحلة ٦ — البروفايل والـ KYC والمستندات

### البروفايل

`GET /users/profile/index` → `ProfileFields.jsx` اللي فيه `initialValues` مكتوبة في
الكود. الحفظ → `POST /users/account/update`. تغيير كلمة المرور →
`POST /users/account/change/password`.

> **خلل في القديم:** تغيير كلمة المرور بيحفظ التوكن الجديد في `localStorage` بس ومش
> في الكوكي (`Settings/index.jsx` سطر ١٢٥) — يعني بعد التغيير المستخدم بيستخدم توكن
> قديم. **يُصلَح، لا يُنقل.**

مفتاح AI Trading (`POST /users/profile/ai-trading`) — ميزة موجودة في القديم ومالهاش
مكان في التصميم الجديد. لو لسه مستخدمة، `SettingsSheet` هو مكانها الطبيعي.

### KYC

`KycPanel.jsx` بيعمل اختيار ملف وحالة محلية. الربط: `GET /users/kyc` للحالة،
`POST /users/kyc/store` (FormData) للرفع، `POST /users/kyc/update/{id}` للاستبدال.

### المستندات — نقطة أمنية

`clientDocuments.js` بيحفظ الإقرارات في `localStorage` تحت `qp-documents` — **بما
فيها طلبات زيادة الرافعة**. العميل يقدر يعدّلها من كونسول المتصفح.
`HANDOFF.md` بند ٣ و`SECURITY.md` الاتنين بيعلّموا عليها.

**الباك-إند ماعندوش endpoints للمستندات إطلاقاً.** مطلوب (ملحق ج). لحد ما تتوفّر،
`DocumentsPanel` يفضل محلي — بس **طلب زيادة الرافعة يتشال أو يتعطّل**، لأن إقرار
ملزم محفوظ في المتصفح مالوش أي قيمة قانونية.

### الشهادات

`Certificates.jsx` في التصميم الجديد **صفحة فاضية**. القديم عنده الصفحة شغّالة:
`GET /users/certificates` و`POST /users/certificates/post { id, duration,
distribution_period }`. الفئات (BRONZE/SILVER/…) مكتوبة في كود الواجهة القديمة
(سطر ٢٧–٣٢) — يُفضَّل إنها تييجي من الـ API.

---

## 9 · المرحلة ٧ — العربية والـ RTL

**دي أكبر بند مجهول في الخطة، ولازم يتقدّر قبل ما يُلتزم بيه.**

| | القديم | الجديد |
| --- | --- | --- |
| اللغات | ١١: `en ar es fr de nl cs pl uk hu ja` | ٤: `en de cs hu` |
| RTL | العربية موجودة | **لا شيء** — لا `dir`، لا خصائص منطقية |

المطلوب:

1. ترجمة ملفات `public/locales/*/translation.json` — حوالي **٥٥٦ مفتاح** لكل لغة
   (التشيكية فيها ٥٥٨، فيه انحراف يستاهل فحص)
2. `<html dir>` يتبدّل مع اللغة في `i18n.js`
3. **مراجعة كل الـ CSS الاتجاهي.** التصميم الجديد مليان `pl-`, `pr-`, `left-`,
   `-mr-`, `translate-x`, وأقنعة تدرّج اتجاهية (`OVERFLOW_MASK` في `TradeStation`
   سطر ٢٠). كلها هتتكسر في RTL. الحل النظيف: تحويل لخصائص Tailwind المنطقية
   (`ps-`/`pe-`/`start-`/`end-`)
4. لغة TradingView: `toTradingViewLocale` يضاف لها `ar`، و`TechnicalAnalysis.jsx`
   (سطر ٢٧–٢٨) بيدعم `en` و`de_DE` بس بسبب ٤٠٣ من TradingView

> **توصية:** تتعمل كمرحلة مستقلّة بعد اكتمال الربط الوظيفي، لا بالتوازي معه. مراجعة
> الاتجاه هتلمس كل مكوّن تقريباً، ودمجها مع تغييرات منطقية هيخلّي المراجعة مستحيلة.

---

## ملحق أ — جدول الـ endpoints الكامل

### المصادقة
| Method | Endpoint | الاستخدام في التصميم الجديد |
| --- | --- | --- |
| POST | `/users/Auth/login` | `Login.jsx` |
| POST | `/users/Auth/register` | `Onboarding.jsx` خطوة review |
| POST | `/users/Auth/register/google` | `GoogleSignIn` (يُنقل) |
| POST | `/users/Auth/verification` | `/verify-email` (تُبنى) |
| POST | `/users/Auth/resend` | `/verify-email` |
| POST | `/users/Auth/forget/password` | `/forgot-password` (تُبنى) |
| POST | `/users/Auth/forget/password/check/code` | `/reset-password` (تُبنى) |
| POST | `/users/Auth/forget/password/change` | `/reset-password` |
| POST | `/users/Auth/logout` | `use-logout.js` — **القديم لا يناديه** |

### الأصول
| GET | `/users/assets?type={type}` | بناء `symbolMap` |
| GET | `/users/assets/types` | تبويبات `AssetList` |
| GET | `/users/assets/show/{id}` | فحص القابلية للتداول |
| GET | `/users/assets/show/finance/{id}` | **`contractSize` + السبريد + الرافعة** |
| POST | `/users/assets/search` | بحث `AssetList` |
| POST | `/users/assets/favourite` | `toggleFavourite` |

### التداول
| POST | `/users/trade/index/open?page=N` | `OpenTrades` تبويب المراكز |
| POST | `/users/trade/index/close?page=N` | `OpenTrades` تبويب المغلقة |
| POST | `/users/trade/create` | `OrderPanel` |
| POST | `/users/trade/close/trade` | `closePosition` |
| — | *قائمة الأوردرات المعلّقة* | **ناقص** |
| — | *إلغاء أوردر معلّق* | **ناقص** |
| — | *إغلاق كل المراكز* | **ناقص** (مُستحسن) |

### الحساب والمال
| GET | `/users/Home/finance` | `AccountStatsBar` · `Wallets` |
| GET | `/users/wallet` | `Wallets` |
| POST | `/users/transactions?page=N` | `TransactionsHistory` |
| GET | `/users/profile/statistics` | إحصائيات `Wallets` |
| GET | `/Deposits?page=N` · POST `/Deposits/filter` | سجل الإيداعات |
| POST | `/users/Deposits/store/{usdt\|credit\|bank}` | مودالات الإيداع |
| GET | `/users/Deposits/wallets` | `CryptoDepositModal` |
| POST | `/users/account-bank/store` | `CardDepositModal` |
| GET | `/withdrawal?page=N` · POST `/withdrawal/filter` | سجل السحوبات |
| POST | `/users/withdrawal/store/{usdt\|wireaccount}` | مودالات السحب |

### البروفايل والمستندات
| GET | `/users/profile/index` | `ProfilePanel` |
| POST | `/users/account/update` | حفظ البروفايل + خطوات Onboarding |
| POST | `/users/account/change/password` | `ChangePasswordModal` |
| POST | `/users/profile/ai-trading` | (يحتاج مكان في التصميم) |
| GET | `/users/kyc` · POST `/users/kyc/store` · POST `/users/kyc/update/{id}` | `KycPanel` |
| — | *المستندات والتوقيعات* | **ناقص بالكامل** |

### مساعدة
| GET | `/countries/all` · `/currency/all` | قوائم Onboarding |
| GET | `/users/certificates` · POST `/users/certificates/post` | `Certificates` |
| POST | `/broadcasting/auth` | مصادقة Pusher |

---

## ملحق ب — قاموس الحقول المختصر

| الدومين (الجديد) | الباك-إند (القديم) | تحذير |
| --- | --- | --- |
| `entryPrice` | `opening_price` / `open_price` | |
| `exitPrice` | `closed_price` / `closing_price` | |
| `lots` | `lot` | |
| `contractSize` | `amount` / `amount_user_pnl` | ⚠ **`amount` ≠ `amount`** |
| `amount` (اسمية) | `trade_amount` | ⚠ نفس التحذير |
| `margin` | `total` | |
| `commission` | `com` | |
| `pnl` | `profit` / `pnl` | مفتوحة: تُحسب لا تُقرأ |
| `openedAt` | `open_at` / `created_at` | لـ ISO |
| `closedAt` | `close_at` / `updated_at` | لـ ISO |
| `side: 'BUY'` | `direction: 'buy' \| 'long'` | |
| `asset: 'BTC/USD'` | `currency.id: 1` | عبر `symbolMap` |
| `buySpread` % | `buy_spread` | ⚠ نسبة لا قيمة سعرية |
| `awaitingDeposit` | `awaiting_deposit` | ⚠ القديم يسمّيها «Credit» |
| `status: 'approved'` | `status: 1` | 0/1/2/3 |

---

## ملحق ج — قرارات مطلوبة من الباك-إند

مرتّبة بالأثر. البنود ١–٤ **تمنع** الربط، والباقي يقلّل جودته.

**١. رمز فريد وثابت لكل أصل.** الواجهة كلها مبنية على `'BTC/USD'`. الباك-إند بيرجّع
`name`/`sym`/`ex_sym`/`symbol` بشكل غير متّسق. المطلوب: حقل واحد مضمون التفرّد
والثبات، يُرجَّع مع كل أصل وفي `trade.currency`.

**٢. قائمة الأوردرات المعلّقة.** التصميم عنده تبويب كامل. العدّاد موجود في
`profile.trades.pending` لكن مفيش endpoint يرجّع الصفوف. المطلوب كمان: **إلغاء**
أوردر معلّق.

**٣. `contractSize` مع كل أصل.** موجود في `/users/assets/show/finance/{id}` (حقل
`amount`) لكن نداء منفصل لكل أصل مكلف. المطلوب: يُضمّ لقائمة `/users/assets`.
> ده جواب السؤال الأول في `HANDOFF.md` — الرقم موجود عندكم بالفعل.

**٤. دلالة `stop_loss` / `take_profit`:** مبلغ بالدولار ولا مستوى سعر؟

**٥. تفاصيل الصفقة المغلقة:** `grossPnl` و`swap` و`closeReason`
(`manual`/`takeProfit`/`stopLoss`/`marginCall`). من غيرهم التصفية بالهامش هتتعرض
للعميل كـ «إغلاق يدوي».

**٦. `credit` مقابل `awaiting_deposit`:** حقلين ولا حقل واحد بمسمّيين؟

**٧. endpoints المستندات:** تعريفات + تسجيل إقرار بطابع زمني من السيرفر + طلب زيادة
رافعة. حالياً في `localStorage` وقابلة للتعديل من المتصفح.

**٨. `decimals` لكل أصل.** الواجهة بتحتاجها لعرض السعر. غير موجودة. البديل: جدول
محلي (هشّ عند إضافة أصول جديدة).

**٩. بث تغيّرات المراكز عبر Pusher** بدل استطلاع كل ٥ ثواني. البنية التحتية موجودة
بالفعل — قناة خاصة لكل مستخدم بتوفّر الكثير.

**١٠. إغلاق كل المراكز ذرّياً** في نداء واحد.

**١١. توثيق `POST /users/Auth/logout`** — القديم ما بيناديهوش. هل بيُبطل التوكن فعلاً؟

---

## ملحق د — ترتيب التنفيذ

كل مرحلة قابلة للشحن بمفردها ولا تكسر اللي قبلها.

| # | المرحلة | تعتمد على | المخرَج القابل للتحقّق |
| --- | --- | --- | --- |
| ٠ | التحضير والبروكسي والـ CSP | — | `npm run dev` يوصل للـ API |
| ١ | API + مصادقة + حراسة | ٠ | دخول حقيقي، `/wallets` محميّة |
| ٢ | الأصول و`symbolMap` | ١ | `AssetList` من السيرفر |
| ٣ | الأسعار الحيّة | ٢ | الشارت والتيكر **متفقين** |
| ٤ | الأوردر والمراكز | ٣ | صفقة حقيقية تُفتح وتُقفل |
| ٥ | الحساب والمحفظة | ٤ | رصيد حقيقي، مصدر واحد |
| ٦ | البروفايل والـ KYC | ١ | رفع مستند |
| ٧ | الشهادات والمميزات المنقولة | ٥ | جوجل + `desk_ref` |
| ٨ | العربية والـ RTL | ٧ | تقدير مستقل |

**أول ثلاث نقاط تُنجَز مبكراً بأقل مجهود:** حارس المسارات (ثغرة أمنية، تعديل ملف
واحد) · `contractSize` (الرقم موجود، بيصحّح كل حسابات الهامش) · اتفاق الأسعار (يحلّ
أوضح خلل يشوفه المستخدم).

---

*هذه الخطة مبنية على قراءة كاملة للمشروعين بتاريخ ٢٠ سبتمبر ٢٠٢٦. لم يُعدَّل أي كود
بعد. تُقرأ مع `HANDOFF.md` و`SECURITY.md`.*
