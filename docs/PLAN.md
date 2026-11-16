# olvar-dashboard — Project plan

Status: planning only. Updated Nov 16, 2026 for the **final contract** (decisions A–H), the user's follow-up decisions, the new Figma frames at 1920 and 1512, and the interface in the **current** olvar-gateway plan (commit `cf453d8`, "fix review findings and add Timeline offline periods").

Scope of this repo: the Expo app that serves **desktop web** and **native iOS** from one codebase. It reads the Supabase data and calls the Edge Function owned by `olvar-gateway`.

---

## 1. Summary

- **Stack:** Expo **SDK 58** (React Native **0.88**, React **19.3**, react-native-web 0.21), Expo Router, TypeScript (strict).
  - Xcode ≥ 26.4 is required; EAS builds on SDK 58 use Xcode 27.1.
- **One codebase, two layouts:**
  - **Desktop web** uses a sidebar shell built to the Figma **Desktop 1920** and **Desktop 1512** frames.
  - **iOS** uses system **native tabs** (Home · Sensors · Timeline · Chat) with Liquid Glass, built to the Figma 402×874 frames.
  - Screens, data hooks, charts and tokens are shared.
- **"Avatar" means chat with your plant** (decision A):
  - The Chat screen calls the gateway's Edge Function `chat`.
  - Replies come from `deepseek-flash` with thinking off, in first person as the plant and in the user's language.
  - Messages are stored in `chat_messages`.
- **Status pill:** the pill text (`overall_label`), the per-metric labels (`<metric>_label`) and the one-line `summary` are **display-only**, read from the gateway view `plant_status_v`.
  - The dashboard contains no threshold logic.
  - Its only time rule is the gateway's **180 s** offline rule, used to age its cached status row between refetches.
- **v1 scope** (decision B): sign in (single owner), Home, Sensors, Timeline, Chat, Soil calibration, Settings/Account.
  - One plant and one device, both created by the gateway's seed.
- **Layout rule:** web pages **scroll vertically without limit**. Content is never squeezed to fit the viewport height.
- **Styling:** React Native `StyleSheet` with typed tokens from Figma variables, plus a `useBreakpoint` hook that carries the measured 1920 and 1512 layout values.
- **Charts:** custom SVG (`react-native-svg` + `d3-scale`/`d3-shape`), the same on web and iOS.
- **Data:**
  - `@supabase/supabase-js` with the publishable key and the owner session.
  - TanStack Query v5 for fetching and caching.
  - Realtime: a `readings` INSERT is treated as a signal to re-read `readings_v`; `devices` UPDATE and `chat_messages` INSERT are applied directly.
  - The plant status is also refetched on a timer and at the reading-expiry deadline, so a silent gateway still turns the app offline.
  - Every list query is bounded or paginated past the 1,000-row API limit.
  - Timeline offline periods come from the gateway function `device_offline_periods()`.
  - Database types are a pinned copy of `olvar-gateway/supabase/types/database.types.ts`.
- **Shipping:** web on **EAS Hosting**; iOS via **EAS Build → TestFlight**, which needs the Apple Developer Program ($99/yr).

---

## 2. Research findings (with sources)

### 2.1 Figma (read directly: file `ZMGAYBFUZjGsECpL54uEJg`, page `0:1`)

**v1 frames.** Node IDs work with `get_design_context` and `get_screenshot`. The **Desktop 1920 and Desktop 1512 frames are the primary web references.** The older 1440×1024 frames are kept only for component details.

| Screen | Desktop 1920×1080 | Desktop 1512×982 | Desktop 1440 (older) | iPhone 402×874 |
|---|---|---|---|---|
| Sign in | `227:10075` | `227:10095` | `133:1175` | `134:3297` |
| Home | `226:7520` | `226:7892` | `1:8` | `18:154`, `20:55` |
| Sensors | `227:7830` | `227:8145` | `34:128`, `145:1322` offline | `35:128`, `35:495`, `148:2056` offline |
| Timeline | `227:8461` | `227:9006` | `27:44` | `30:44`, `30:462` |
| Chat | `227:9552` | `227:9813` | `32:86` | `33:86`, `33:391` |
| Soil calibration | `227:11051` | `227:11599` | `132:1590` | `134:2509` |
| Settings | `227:10136` | `227:10593` | `44:193` | `45:193`, `45:606`, `155:3506` |
| Account | `227:12148` | `227:12271` | `144:1051` | `147:1862` |

**Measured layout.** These values come from the frame metadata and drive §5.4.

| | Desktop 1920 | Desktop 1512 |
|---|---|---|
| Sidebar | 272 | 248 |
| Page padding (left, right / top) | 48 / 40 | 32 / 24 |
| Content width | **1552** | **1200** |
| Page header | 60 high | 60 high |
| Header → first content | 44 (36 to a filter bar) | 20 |
| Home | plant card **424** + 2×2 sensor cards (544×232), gaps 24 / 16; bottom row two equal cards (764) | plant card **368** + 2×2 sensor cards (396×232); bottom row two cards of 588 |
| Sensors | two columns of 764, card height 412, chart height 216 | two columns of 588, card height 389, chart height 196 |
| Timeline | main column 1104 + side column 424 | main column 800 + side column 376 |
| Chat | **three columns**: conversations 360 · chat 784 · "What Sparks sees" 360 | two columns: chat 800 · side column 376 (context card above conversations) |
| Settings / Account / Calibration | nav 208 + pane **1040 (capped)** | nav 208 + pane 968 |
| Calibration modal | 560 wide, centred over Settings | 560 wide, centred over Settings |
| Sign in | brand panel 800, form 360 centred in the rest | brand panel 672, form 360 |

**Components** (section `138:622`):
- 36 line icons.
- Desktop: Button, Field, Notice, List row, Card, Modal, Sidebar, Page header, Settings nav, Auth brand panel, Logo.
- iPhone: Glass button, Nav bar, Section header and footer, List section and row, Button, Tab bar, Brand header, Alert, Search field, Range card.

**Design tokens** (Figma variables):

```
bg/canvas #fafaf7   bg/sidebar #f3f3ee   surface/card #ffffff   border/subtle #e6e6df
text/primary #1e2219  text/secondary #646a5c  text/tertiary #9a9f92
brand/olive #3b4630  brand/sage #7d8a64  brand/sage-tint #eef1e7
status/good #4e9a44  status/warn #d99a2b  status/live #c7fd56
data/water #4a90c8 (tint #eaf3fa)  data/light #e2a82b (tint #fdf5e1)
data/temp #e07a4f  data/humidity #5fa3a8 (tint #e6f2f2)
```

**Typography:**
- Desktop titles: **Fraunces SemiBold 30** (`SOFT 0, WONK 1`).
- Body: **Inter** 400/500/600.
- iOS large title: **Inter Bold 34/41, tracking 0.4**.

#### 2.1.1 What v1 shows in place of Figma elements (decisions A, B, E and the user follow-up)

Even the new frames still contain deferred features. Each one is handled consistently:

| Figma element | v1 behaviour |
|---|---|
| "every 10 s", "Raspberry Pi 4", "USB serial to gateway" | "every minute", "Raspberry Pi 3B", "Wi-Fi · MQTT" |
| Sidebar plant switcher, ⌘K search, bell, the iPhone "+" button | Not rendered. The sidebar top shows the plant nickname without the switcher chevron. |
| Home "Recent insights" card | **Kept as a placeholder card**, titled "Recent insights", with an empty-state body: "Insights are coming soon — Sparks will point out trends here." It uses `EmptyState` inside `Card` at the frame size. |
| Home health score "86/100" | Replaced by the status pill (`overall_label`) plus the server's `summary` line (for example "Soil is getting dry — water soon"), both from `plant_status_v`. |
| Home "Sparks says" bubble | Shows the **latest stored `plant` chat message** with its time. With no chat yet, it shows "Ask Sparks how it's doing →", linking to Chat. No LLM call is made for Home. |
| "Water in ~2 days", "6.2 h of good light today" | Dropped, because prediction and threshold maths belong to deferred features or the server. Each card instead shows a plain fact such as "Peak 1,560 lux today". |
| Timeline Day/Week/Month toggle and filter chips | **Week view only, with no filters.** Week navigation ‹ › and "Jump to date" stay. |
| Timeline "Log care" button and "Upcoming care" card | The button is not rendered. The side column keeps the card slot as an "Upcoming care — coming soon" placeholder, the same pattern as Home. |
| Timeline "Waterings" and "Alerts" summary rows, plus alert and care events | Not shown (deferred care log and alerts). Week summary shows averages and their change against the previous week. |
| Chat "Past conversations" (1920 left column; 1512 side column) | **Kept as day groups.** The single conversation is grouped by local date. Each entry shows the first user message of that day, and clicking it scrolls to that day. The "New chat" button and mic icon are not rendered, because there are no threads. The **"Based on readings from HH:mm"** footer is kept, using `chat_messages.based_on_reading_at`. |
| Settings Plant profile: Species, Location, Added, photo | Nickname and **Location** (free text, ≤ 60 characters) are editable. Time zone is edited in Account. Species comes from the plant profile (read-only) and Added is `created_at` (read-only). Photo is not rendered (no column). |
| Settings Care targets: "Use preset" toggle, sliders, per-row alert switches | **Editable** through `plants.threshold_overrides`. "Use preset" **on** sets overrides `{}` (profile values, locked). **Off** enables per-metric range editing of `ok_low`/`ok_high`. The per-row alert switches are not rendered (notifications deferred). |
| Settings Devices: "Add device" button | Not rendered. The rows (gateway, ESP32, soil probe, SHT31 + GY-302) show live status, and the soil probe row keeps its **Recalibrate** button. |
| Settings nav items Chat, Notifications | Not rendered. The nav keeps Plant profile, Care targets, Devices & calibration and Account. |
| Account: photo, username, delete account | Not rendered. The pane keeps name, email (read-only), time zone, a password change, and an added **Sign out** button. |
| Loading, error, offline and empty states | Built from existing components and tokens (§5.5, decision H). |

### 2.2 Expo / React Native / iOS 27

- **Expo SDK 58** (Oct 15, 2026): React Native 0.88, built for iOS 27 (scene life cycle, resizable iPhone apps). — https://expo.dev/changelog/sdk-58
- **Version table:** SDK 58 pairs with RN 0.88, React 19.3.0, react-native-web 0.21.0, Node ≥ 22.13, iOS 16.4+, Xcode 26.4+. — https://docs.expo.dev/versions/latest
- **EAS images:** EAS uses Xcode 27.1, and the Strict TypeScript API is now the default. — https://expo.dev/blog/how-to-upgrade-to-sdk-58
- **Expo Go:** SDK 58 support has been on the App Store since Oct 22, and Expo Go now requires a login.
  - https://apps.apple.com/us/app/expo-go/id982107779
  - https://expo.dev/changelog
- **Native tabs:** `expo-router/native-tabs` gives a Liquid Glass tab bar on iOS 26+. For web, a headless `expo-router/ui` layout goes in `*.web.tsx`.
  - https://docs.expo.dev/router/advanced/native-tabs
  - https://docs.expo.dev/router/advanced/platform-specific-modules
- **Glass effect:** `expo-glass-effect` (`GlassView`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`) works on iOS 26+, falls back to a plain `View`, and is included in Expo Go. — https://docs.expo.dev/versions/latest/sdk/glass-effect
- **Glass pitfalls:** animating opacity, or mounting on demand over other glass, renders blank. — https://opointo.com/docs/guides/liquid-glass-react-native
- **iOS 27 rules:** apps must be resizable and a launch screen is required. — https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- **Web blur:** CSS `backdrop-filter` is Baseline 2024, with about 97% browser support.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
  - https://caniuse.com/css-backdrop-filter
- **Variable fonts:** supported on native from SDK 58, and RN 0.88 adds `fontVariationSettings`. — https://docs.expo.dev/develop/user-interface/fonts/
- **Font loading:** `@expo-google-fonts` `useFonts` works on web and in Expo Go; the config plugin needs a dev build. — https://github.com/expo/google-fonts
- **Web output modes:** `single`, `static` or `server`. — https://docs.expo.dev/guides/publishing-websites

### 2.3 Styling, charts

- **NativeWind:** 4.2.7 is stable (Tailwind 3); **v5 (Tailwind 4) is a release candidate** and not for production.
  - https://www.nativewind.dev/docs/getting-started/installation
  - https://www.nativewind.dev/v5
- **Unistyles 3:** needs Nitro and is not supported in Expo Go. — https://unistyl.es/v3/start/getting-started
- **Tailwind in Expo:** web-only unless NativeWind or Uniwind is added. — https://docs.expo.dev/guides/tailwind
- **Skia on web:** CanvasKit WASM adds **2.9 MB gzipped**. — https://shopify.github.io/react-native-skia/docs/getting-started/web
- **Victory Native XL:** documents no web target. — https://github.com/FormidableLabs/victory-native-xl
- **gifted-charts:** its web version is a separate package. — https://www.npmjs.com/package/react-native-gifted-charts
- **`react-native-svg`:** supports iOS, web and Expo Go; version 15.16.0 for SDK 58. — https://docs.expo.dev/versions/latest/sdk/svg/

### 2.4 Supabase

- **API keys:** use publishable keys in apps and secret keys only on servers; legacy keys are deprecated by the end of 2026. — https://supabase.com/docs/guides/getting-started/api-keys
- **Expo setup:** sessions are stored through `expo-sqlite/localStorage/install`, with env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. — https://docs.expo.dev/guides/using-supabase
- **Realtime:** Postgres Changes needs the table in the publication, and RLS is checked per subscriber. Realtime streams tables, not views. — https://supabase.com/docs/guides/realtime/postgres-changes
- **Generated types:** `supabase gen types typescript --remote=<ref>`. — https://supabase.com/docs/reference/cli/supabase-gen
- **Edge Function auth:** `supabase.functions.invoke` sends the user JWT, which the function verifies. — https://supabase.com/docs/guides/functions/auth
- **TanStack Query:** React v5 (5.107.x). — https://github.com/TanStack/query/releases
- **Row limit:** by default a Supabase project returns **at most 1,000 rows per request**. The limit applies silently (no error), and `range(from, to)` paginates, in query order.
  - https://supabase.com/docs/reference/javascript/select
  - https://supabase.com/docs/reference/javascript/range
  - A full day of raw readings (about 1,440 rows) is over this limit, so it must be paginated.

### 2.5 DeepSeek (used only by the gateway's `chat` function)

- The model is `deepseek-flash`, served by V4.1-Flash-1017. Thinking is on by default, so the function sends `thinking: {type: "disabled"}`.
  - https://api-docs.deepseek.com/
  - https://api-docs.deepseek.com/updates
- **Cost:** $0.30 input / $1.20 output per 1M tokens at peak, so about $0.0013 per chat turn. — https://api-docs.deepseek.com/quick_start/pricing/

### 2.6 Hosting, distribution, testing

- **EAS Hosting:** the free tier allows 100k requests a month; a custom domain needs a paid plan.
  - https://expo.dev/pricing
  - https://docs.expo.dev/eas/hosting/introduction
- **EAS Build:** the free plan includes 15 iOS builds a month. — https://expo.dev/pricing
- **TestFlight:** requires the Apple Developer Program at $99/yr. — https://developer.apple.com/programs
- **Testing:** `jest-expo` with React Native Testing Library for unit tests; Maestro on the iOS Simulator for end-to-end tests, locally or in EAS Workflows.
  - https://docs.expo.dev/develop/unit-testing
  - https://docs.expo.dev/eas/workflows/examples/e2e-tests
- **Playwright screenshots:**
  - `toHaveScreenshot` supports `mask` for regions to ignore. — https://playwright.dev/docs/test-snapshots
  - `page.screenshot()` defaults to `scale: "device"`, which gives 2× pixels on a DPR 2 project.
  - `scale: "css"` gives one pixel per CSS pixel. `expect(page).toHaveScreenshot()` defaults to `"css"`.
  - https://playwright.dev/docs/api/class-page
  - https://playwright.dev/docs/api/class-pageassertions

---

## 3. Decisions and alternatives rejected

| Topic | Decision | Rejected and why |
|---|---|---|
| Framework | **Expo SDK 58**, React Native 0.88 | SDK 57 builds with Xcode 27 only through an opt-in scene flag. |
| One codebase | **Yes.** `AppShell.tsx` uses NativeTabs; `AppShell.web.tsx` uses the Sidebar and `expo-router/ui` tabs. A screen gets a `*.web.tsx` file only where the desktop composition differs (Home grid, Chat columns, Settings two-pane). | A separate Next.js web app would duplicate the data layer and charts. |
| Dev workflow | **Development build** | Expo Go alone blocks the font config plugin. |
| Web output | **`single` (SPA)** | `server`/`static` add no benefit behind a login, and `static` brings hydration problems. |
| Styling | **`StyleSheet` + tokens + `useBreakpoint()` with layout tokens per tier (§5.4)** | NativeWind v5 (RC), NativeWind 4 (Tailwind 3), Uniwind (extra engine, paid Pro), Unistyles 3 (no Expo Go), Tamagui (heavy). |
| Liquid Glass | NativeTabs, plus `GlassView` behind an availability check with a fallback; `backdrop-filter` on narrow web | A hand-drawn glass look drifts from the system one. |
| Charts | **Custom SVG components** (target band, step line, hourly bars, gauge, range bar, week chart) | Skia / Victory XL (+2.9 MB web WASM), gifted-charts, Recharts. |
| Data sources | Latest values: `readings_v` with `limit 1`. 24 h charts: `readings_v`, **paginated**. 7 d and 30 d charts, the Timeline week chart and the Timeline daily min/max: `readings_hourly_v`. Timeline offline periods: the gateway RPC `device_offline_periods()`. | Aggregating raw rows on the client for long ranges; client-side gap detection (it would duplicate the server's 180 s rule). |
| Pagination | One helper, `fetchAll()`. It pages with `.range()` in steps of 1,000, ordered by `recorded_at, id`, with a fixed upper time bound captured at request start. It stops when a page has fewer than 1,000 rows (a page of exactly 1,000 triggers one more request) and de-duplicates by `id`. Chat history is keyset-paged (50 at a time, older on scroll-up). No raw-reading query runs without either `fetchAll()` or an explicit `limit`. | Raising the project's max-rows limit: a day only gets longer, and it hides the bug. |
| Realtime and freshness | Subscribe to `readings` INSERT (filter `device_id=eq.<id>`) as a **signal**: re-read the latest `readings_v` row and `plant_status_v`. Subscribe to `devices` UPDATE, which invalidates the device and `plant_status_v` queries. Subscribe to `chat_messages` INSERT. Invalidate everything on reconnect. Status freshness rules are in §5.5. Poll `gateways.last_seen_at` every 60 s, because it has no Realtime. | Event-driven only: if the Pi loses power there is no INSERT or UPDATE, and the status would stay "healthy" forever. |
| Status | **Display only**, from `plant_status_v`: `overall_label`, `<metric>_label`, `summary`. The status keys pick only colours and icons. Charts draw target bands from the effective threshold numbers but do not judge values. | Client-side rules or client-written labels would let clients disagree. |
| Chat | `functions.invoke('chat', {body:{plant_id, message}})`, then render `reply`, with "Based on readings from HH:mm" from `based_on_reading_at`. Optimistic user bubble. A 429 with `retry_after` shows a countdown. A reply row with `error` set is shown as a fallback message with Retry. | Calling DeepSeek from the client is forbidden (the key would leak). |
| Type sharing | Pinned copy of `olvar-gateway/supabase/types/database.types.ts`, synced by `scripts/sync-types.sh <ref>`. CI checks the copy matches. | Submodule, private npm package, remote type generation. |
| Fonts / icons | Inter, plus Fraunces as a variable TTF (WONK/SOFT axes). Figma SVG icons converted with `@svgr/cli --native`. | System fonts; `@expo/vector-icons`. |
| Auth | Email and password sign-in only. Display name stored in Supabase Auth user metadata (`auth.updateUser({data})`). Password change re-authenticates with the current password, then calls `updateUser({password})`. | Create account and forgot password are deferred, and signups are disabled on the server. |
| Hosting | **EAS Hosting** on an `*.expo.app` URL | Vercel, if a free custom domain is wanted later. |
| iOS distribution | **EAS Build → EAS Submit → TestFlight** (internal) | A free Apple ID sideload expires quickly. |

---

## 4. Contract changes

**No contract changes are proposed.** The dashboard follows the final contract (A–H). My earlier proposals are withdrawn:
- `avatar_states`
- personalities
- care events, insights, notifications
- chat threads
- `claim_device`
- `readings_bucketed`

**Interface the dashboard consumes**, as documented in the current olvar-gateway plan (`docs/PLAN.md` §5.5–5.7, commit `cf453d8`):

| Need | olvar-gateway interface |
|---|---|
| Sign in | Supabase Auth email + password, signups disabled, single owner, owner-only RLS, nothing granted to `anon`. |
| Plant | `plants`: `id`, `nickname`, `location`, `timezone`, `profile_id`, `threshold_overrides`, `created_at`. The owner may update **`nickname`, `location`, `timezone` and `threshold_overrides`**. A server check constraint validates overrides: known metrics and keys, numbers, ascending order. `plant_profiles` supplies `common_name`, `scientific_name` and `thresholds` (`critical_low, low, ok_low, ok_high, high, critical_high` per metric). |
| Effective thresholds (target bands, care targets) | `effective_thresholds(plant_id)` if execute is granted to `authenticated`. Otherwise a client-side deep merge of `plant_profiles.thresholds` with `plants.threshold_overrides`: a pure, unit-tested function that only merges numbers and never evaluates status. See note 1. |
| Device | `devices`: `id`, `fw`, `status` (online/offline/unknown), `status_changed_at`, `last_seen_at`, `soil_dry_raw`, `soil_wet_raw`, `soil_calibrated_at`. Realtime UPDATE. |
| Gateway | `gateways.last_seen_at`, `version`. Polled. |
| Readings | `readings_v`: the raw columns plus `soil_pct`. Any sensor value may be null. `soil_pct` is null when uncalibrated. Realtime INSERT on `readings` is a signal only. Retention is 90 days. The API returns at most 1,000 rows per request. |
| Summaries | `readings_hourly_v` / `readings_daily_v`, with `<metric>_avg/_min/_max`, `soil_pct_*` and `n`. |
| Status | `plant_status_v` provides:<ul><li>`overall` (great/okay/needs_attention/in_trouble/offline/no_data) and `overall_label` ("Feeling great" … "No data yet")</li><li>`<metric>_status` and `<metric>_label` (for example "Too dry")</li><li>`summary`</li><li>`issues`, `soil_calibrated`, `latest_reading_at`, `device_status`, `computed_at`</li></ul>**Offline = no reading for more than 180 s, or a retained `offline` status.** |
| Offline periods | `device_offline_periods(p_device_id, p_from, p_to)` returns `(started_at, ended_at, duration_s, cause 'device_restart'\|'no_data', ongoing)`. It finds gaps over 180 s between raw readings and clips them at the window edges. The window is capped at **7 days** (larger windows raise an error), and the function returns nothing beyond the 90-day retention. |
| Calibration | The owner may `update` `devices.soil_dry_raw`, `soil_wet_raw` and `soil_calibrated_at`. The server checks `dry > wet + 100`. The new calibration applies retroactively to every view. |
| Chat | `POST /functions/v1/chat` with `{plant_id, message (1–1000 chars)}` returns `{reply: chat_messages row}`. The reply carries `based_on_reading_at`. Over the rate limit (10 per 5 min, 200 per rolling 24 h, enforced atomically) the function returns 429 with `retry_after`. `chat_messages` holds a single conversation per plant, with `role` user/plant and `error`, and publishes Realtime INSERTs. |
| Types | `supabase/types/database.types.ts`, committed and tagged. |

Notes (not contract changes):
1. A grant of execute on `effective_thresholds` to `authenticated` would avoid the client-side merge. This is a gateway implementation detail; the dashboard works either way.
2. My earlier client-side offline-gap detection is **withdrawn**. The Timeline uses `device_offline_periods()`, so the 180 s rule lives only on the server.

---

## 5. Architecture and folder layout

### 5.1 Runtime picture

```
 ESP32 ─MQTT(60 s)→ Pi 3B gateway ─secret key→ Supabase Postgres (readings, rollups, devices, plants, chat_messages,
                                                views readings_v / readings_hourly_v / plant_status_v) ── olvar-gateway
                                              Edge Function chat ──→ DeepSeek deepseek-flash (thinking off)
                     publishable key + owner JWT ▲          ▲ Realtime: readings INSERT (signal), devices UPDATE, chat_messages INSERT
              ┌──────────────────────── olvar-dashboard ───────────────────────────────────────┐
              │ Expo Router app — web SPA (EAS Hosting)  /  iOS (EAS Build → TestFlight)          │
              └───────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Navigation (v1)

- **Routes:** `(auth)/sign-in`, plus `(app)/*` gated by session. If there is no plant row, the app shows an empty state ("No plant set up yet — run the gateway setup").
- **iOS:**
  - `NativeTabs`: Home · Sensors · Timeline · Chat.
  - A Settings glass button on Home.
  - Soil calibration opens as a `formSheet` modal from Settings → Devices & calibration, or from the "Not calibrated" notice.
- **Web:**
  - The sidebar has Home, Sensors, Timeline, Chat, the gateway status footer and a settings gear.
  - Settings is a two-pane layout; Account is a pane of Settings, as in the Figma Account frames.
  - Calibration is a modal over Settings, as in the Figma Soil calibration frames.
- **Narrow web (< 768 px):** uses the phone layouts with a bottom bar.

### 5.3 Folder layout

```
olvar-dashboard/
├─ app.json · eas.json · package.json · tsconfig.json · jest.config.js
├─ .env.example                      # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_DATA_SOURCE
├─ assets/fonts/ · assets/images/
├─ design/tokens.json · design/layout.json        # Figma variables + measured 1920/1512 layout values
├─ design/figma/*.png                # reference exports: <Screen>-1920.png, <Screen>-1512.png, <Screen>-iphone.png
├─ src/
│  ├─ app/
│  │  ├─ _layout.tsx                 # fonts, QueryClient, Auth, SafeArea
│  │  ├─ (auth)/_layout.tsx, sign-in.tsx
│  │  ├─ (app)/_layout.tsx           # session gate + <AppShell/>
│  │  ├─ (app)/index.tsx · sensors.tsx · timeline.tsx · chat.tsx · calibrate.tsx
│  │  ├─ (app)/settings/_layout.tsx (+ _layout.web.tsx), index.tsx, plant.tsx, care-targets.tsx, devices.tsx, account.tsx
│  │  └─ (dev)/gallery.tsx           # components, charts and states (dev only; used by visual tests)
│  ├─ components/
│  │  ├─ shell/   AppShell.tsx, AppShell.web.tsx, Sidebar.tsx, GatewayStatus.tsx, PageScroll.tsx
│  │  ├─ ui/      Button, Field, Notice, Card, ListRow, Modal, PageHeader, NavBar, SectionHeader, SectionFooter,
│  │  │           Segmented, StatusPill, GlassButton(.tsx/.web.tsx), Skeleton, EmptyState, ErrorState, OfflineBanner
│  │  ├─ icons/   generated from Figma SVGs
│  │  └─ charts/  scales.ts, LineArea.tsx, StepLine.tsx, HourBars.tsx, Gauge.tsx, RangeBar.tsx, WeekChart.tsx
│  ├─ features/   home/, sensors/, timeline/, chat/, calibration/, settings/, auth/
│  ├─ data/
│  │  ├─ supabase.ts · database.types.ts (synced, do not edit)
│  │  ├─ source/  index.ts (DataSource interface), supabase.ts, fixtures.ts
│  │  ├─ fixtures/ generate.ts       # seeded 90-day series (see T4 acceptance)
│  │  ├─ fetch-all.ts                # paginated reads past the 1,000-row limit (§3)
│  │  ├─ queries/ plant.ts, thresholds.ts, status.ts, latest.ts, readings-24h.ts, hourly.ts, offline-periods.ts (RPC),
│  │  │           device.ts, gateway.ts, chat.ts, calibration.ts, account.ts
│  │  └─ realtime.ts
│  ├─ domain/     format.ts, status-style.ts (status key → colour/icon only), time.ts (plant timezone),
│  │              timeline-events.ts, calibration.ts, chat-days.ts, status-freshness.ts
│  └─ theme/      tokens.ts, layout.ts (tiers, §5.4), typography.ts, fonts.ts, useBreakpoint.ts
├─ e2e/web/       *.spec.ts, playwright.config.ts, figma-diff.ts, figma-masks.json
├─ .maestro/      sign-in.yaml, home.yaml, chat.yaml, calibrate.yaml
├─ .eas/workflows/ ci.yml, deploy-web.yml, e2e-ios.yml
└─ scripts/       sync-types.sh, export-figma.md
```

### 5.4 Responsive strategy (from the Desktop 1920 / 1512 frames)

**Vertical rule (user decision).** Every web page is a vertically scrolling document (`PageScroll`):
- There are **no viewport-height containers**, `100vh` sizing or fitted heights.
- Content keeps its designed size and the page grows.
- Frame heights (1080 / 982) are only the first screenful for visual tests.
- Card heights come from content, with the frame heights as `minHeight`: Home sensor cards 232, Sensors cards 412 / 389.
- **Chat:** the page scrolls as a whole. The composer is `position: sticky` at the bottom of the viewport so it stays reachable. The message list grows with the page instead of scrolling inside a fixed box. The chat card's `minHeight` matches the frame (904 / 854).

**Width tiers.** `src/theme/layout.ts` reads the values in `design/layout.json`.

| Tier | Viewport width | Sidebar | Padding x / top | Content width |
|---|---|---|---|---|
| `xl` | ≥ 1728 | 272 | 48 / 40 | `min(viewport − 368, 1552)`; above 1920 the content stays 1552 and is left-aligned next to the sidebar |
| `lg` | 1280–1727 | 248 | 32 / 24 | `viewport − 312` (1200 at 1512) |
| `md` | 768–1279 | 72 (icon rail) | 24 / 24 | fluid; Home and Sensors go to 2 columns, Chat to a single column with the context card on top |
| `compact` | < 768 | none (bottom bar) | 16 | phone layouts |

**Per-screen rules** (fixed columns from the frames; the other columns use flex):

| Screen | `xl` (1920) | `lg` (1512) |
|---|---|---|
| Home | plant card 424, sensor grid flex (2 × flex, gaps 16), bottom row 2 × flex (gap 24) | plant card 368 |
| Sensors | 2 × flex (gap 24); chart height 216 | chart height 196 |
| Timeline | main flex + side 424 (gap 24) | side 376 |
| Chat | **3 columns**: conversations 360 · chat flex · context 360 (gaps 24) | 2 columns: chat flex · side 376 (context card, then conversations) |
| Settings / Account / Calibration | nav 208 + gap 24 + pane `min(rest, 1040)`, left-aligned | pane = rest (968) |
| Sign in | brand panel 800 + form 360 centred | brand panel 672 |

Charts are measured with `onLayout` and redraw at any width.

**iOS:**
- Single column, large titles, native tab bar.
- Sensor 2×2 mini cards on Home (`20:55`).
- Grouped-list Settings.
- Width-fluid, because iOS 27 iPhone apps are resizable.
- iPad is not targeted.

### 5.5 Data behaviour and states (decision H)

States are built from existing components and tokens:

- **Loading:** card-shaped `Skeleton` blocks.
- **Error:** `ErrorState`, which is a Card with a warn `Notice` and a Retry button. Chat errors appear inline with Retry.
- **Device offline:** the gateway's rule is **no reading for more than 180 s, or a retained `offline` status (LWT)**. The app shows the offline state when any of these hold:
  - `plant_status_v.overall = 'offline'`
  - `devices.status = 'offline'`
  - the locally aged status has expired (see "Status freshness" below)

  The Figma sensor-offline frames (`145:1322`, `148:2056`) apply. `OfflineBanner` shows "olvar-node offline since HH:mm", using `latest_reading_at` (or `status_changed_at` when the LWT fired). The cached `summary` is replaced by "Offline" until a fresh status row arrives.
- **Gateway offline:** `gateways.last_seen_at` is older than 180 s (polled every 60 s); shown in the sidebar footer.
- **Status freshness.** This is how a silent Pi or gateway still shows offline. `plant_status_v` is refetched:
  1. on every `readings` INSERT signal;
  2. on every `devices` UPDATE;
  3. **at the reading-expiry deadline**: a timer set to `latest_reading_at + 180 s + 5 s` and re-armed after each fetch;
  4. **on a 60 s interval** while the screen is visible or the app is in the foreground, as a fallback in case the deadline timer is throttled in a background tab;
  5. on window focus, app foreground and Realtime reconnect.

  Between fetches, `domain/status-freshness.ts` ages the cached row. If `now − latest_reading_at > 180 s`, the UI shows Offline immediately and triggers a refetch. This uses the gateway's own 180 s rule and only ages the cached row (gateway plan §5.5); it never computes a health status. The same freshness check drives the "Updated N s ago" text in the Chat context card.
- **Calibration state vs failed read.** These are two **independent** checks, fixing the review finding.
  - *Calibrated?* is decided **only** from the device configuration: `soil_dry_raw` and `soil_wet_raw` are both non-null, cross-checked with `plant_status_v.soil_calibrated`.
  - *Soil read failed?* means `soil_raw` is null on the latest `readings_v` row.

  | Calibrated | `soil_raw` | Soil card shows |
  |---|---|---|
  | no | value | Raw value, a "Not calibrated" notice and a **Calibrate** button |
  | no | null | "—", "Read failed at HH:mm" and the "Not calibrated" notice |
  | yes | value | `soil_pct`, as in the design |
  | yes | null | "—" and "Read failed at HH:mm". **No recalibration prompt.** |

  The same rule applies to the other metrics: a null value means "Read failed", and charts break the line.
- **Empty states:**
  - no plant row (setup is missing)
  - no readings yet (`overall = 'no_data'`)
  - no chat messages (suggestion chips)
  - Recent insights and Upcoming care placeholders ("coming soon")
- **Calibration flow:**
  1. The modal re-reads the latest `readings_v` row on each `readings` INSERT signal (60 s cadence) and shows `soil_raw`. Higher means drier.
  2. A reading counts as "Stable" when the last 3 readings are within ±2 % of each other.
  3. Capture uses the median of those 3 readings.
  4. Validation matches the server: `0 ≤ raw ≤ 4095`, and `dry > wet + 100`.
  5. Save writes `soil_dry_raw`, `soil_wet_raw` and `soil_calibrated_at = now()`, then invalidates the readings, hourly and status queries. History re-expresses retroactively on the server.
  6. The modal tells the user "values update every minute".
- **Raw-reading completeness.** A full day is about 1,440 rows, over the 1,000-row API limit. Every multi-row raw read goes through `fetchAll()` (§3):
  - The Sensors 24 h charts read the window `[now − 24 h, now]`, with `now` captured once per fetch.
  - Pages are ordered by `recorded_at, id`, de-duplicated by `id`, and requested until a page is short.
  - Backfilled rows that land mid-pagination are picked up by the next signal-driven refetch.
  - Single-row reads use `limit 1` (latest reading) or `limit 3` (calibration stability).
- **Timeline (week view).**
  - History covers the **last 90 days**, the raw retention. Weeks and dates older than that (in the plant time zone) are disabled in ‹ › and "Jump to date".
  - **"This week" chart:** soil % and temperature from `readings_hourly_v` for the 7 local days.
  - **Week summary:** average soil %, temperature, humidity and daytime light from `readings_hourly_v`, compared with the previous week. There is no threshold logic.
  - **Activity:** one group per local day, fetched lazily when it scrolls into view and cached per `(device, local date)`. Today's group is refetched on the `readings` signal. Its events come from:
    - **Offline periods.** Source: `device_offline_periods(device, dayStart, dayEnd)`.
      - It is called **once per local day**, which keeps every call far under the 7-day cap, including DST days of 23–25 h.
      - `dayStart`/`dayEnd` are the local-midnight bounds in the plant time zone. For today, `dayEnd = now`.
      - Each row becomes an event: "Offline 03:10–03:52 (42 min)", "Device restarted, offline 2 min" (`cause = 'device_restart'`), or "Offline since 14:02" (`ongoing`).
      - A gap crossing midnight appears in both days, clipped by the server.
      - **No gap detection runs on the client.**
    - **Daily max and min** of temperature, light, humidity and soil, from that day's `readings_hourly_v` rows (≤ 25 rows). These are exact values; the time is shown at hour precision, for example "Temperature peaked at 24.6 °C · 14:00–15:00". There is no threshold logic, and the helpers are pure functions in `domain/timeline-events.ts`.
    - "Soil sensor calibrated", if `soil_calibrated_at` falls on that day. Only the latest calibration is known.
    - Chat: "You asked Sparks: …", from the first user message of that day (one bounded query per day).

---

## 6. Task breakdown (parallelizable, disjoint file ownership)

**Order.**
1. **T0 first.** It installs every dependency, so later tasks never edit `package.json`.
2. **T1–T5 in parallel.**
3. **T6–T12 in parallel**, against T1/T2/T4 or their stubbed interfaces.
4. **T13–T14** can start alongside T6.

**No hardware needed.** Everything is built and tested with `EXPO_PUBLIC_DATA_SOURCE=fixtures`.
- "(live)" checks use the gateway's local `supabase start` with its seed and its fake ESP32 (`tools/fake_esp32.py`).
- Only the real-probe calibration and end-to-end latency need the ESP32.

### T0: Scaffold

**Owns:** `package.json`, lockfile, `app.json`, `eas.json`, `tsconfig.json`, `jest.config.js`, `.env.example`, `.gitignore`, `src/app/+not-found.tsx`, `.eas/workflows/ci.yml`.

**Work:**
- Create the app from the `default@sdk-58` template.
- App config: `web.output: "single"`, `scheme: "olvar"`, `supportsTablet: false`, the expo-font plugin.
- Dependencies: expo-router, react-native-svg, d3-scale, d3-shape, @supabase/supabase-js, expo-sqlite, @tanstack/react-query, expo-glass-effect, expo-font, zod.
- Dev dependencies: jest-expo, @testing-library/react-native, @playwright/test, pixelmatch, pngjs, @svgr/cli.
- EAS profiles: development, preview, production, e2e-test.

**Accept:** expo-doctor is clean; `tsc`, `npm test` and `expo export -p web` pass; `expo run:ios` launches.

**Verify:** CI on each PR.

### T1: Tokens, layout tiers, fonts, icons

**Owns:** `src/theme/**`, `assets/fonts/**`, `design/tokens.json`, `design/layout.json`, `src/components/icons/**`.

**Work:**
- Figma variables and text styles become typed tokens.
- The §2.1 and §5.4 measurements go into `layout.json`, with `useBreakpoint()` returning tier and layout values.
- Fonts: Inter, and variable Fraunces with `WONK 1, SOFT 0`.
- Icons generated from the Figma SVGs.

**Accept:**
- Jest checks `tokens.ts` against `tokens.json`.
- Jest checks `layout.ts` against `layout.json`, and that the tier boundaries 767/768, 1279/1280 and 1727/1728 resolve correctly.
- The content-width function returns 1552 at 1920, 1200 at 1512, and stays 1552 at 2560.

**Verify:** Jest, plus the gallery on web and the simulator.

### T2: UI primitives and state components

**Owns:** `src/components/ui/**`, `src/app/(dev)/gallery.tsx`.

**Work:**
- The Figma components used by v1.
- `StatusPill`, `Skeleton`, `EmptyState` (including the "coming soon" variant), `ErrorState`, `OfflineBanner`.
- `GlassButton` with its fallback and its `.web` version.

**Accept:**
- An RNTL test per component.
- Gallery snapshots.
- Real glass on an iOS 26+ simulator; the fallback on iOS 18.

**Verify:** Jest, Playwright gallery, simulator.

### T3: Charts

**Owns:** `src/components/charts/**`.

**Work:**
- SVG charts from `{t, v | null}` series.
- Target band drawn from given min/max values; null gaps; a "Now" marker.
- Ticks in the plant time zone.
- `WeekChart` for the Timeline.

**Accept:** unit tests for scales, gaps, DST, empty series and all-null series. No Skia in the web bundle.

**Verify:** Jest; Playwright gallery.

### T4: Data layer

**Owns:** `src/data/**`, `scripts/sync-types.sh`.

**Work:**
- A `DataSource` interface with Supabase and fixtures implementations, plus the hooks listed in §5.3.
- `fetchAll()` pagination (§3).
- The `device_offline_periods` RPC per `(device, local date)`.
- The Realtime signal handling and the status-freshness refetch (§5.5).
- The threshold merge fallback (§4 note 1).
- Provisional types until the gateway tags its types file.

**Fixture rules.** The fixtures source **returns offline periods as data**, written by the generator next to the outages it injects. It does not detect gaps.

**Accept:**
- **Fixture coverage.** Fixtures are deterministic per seed and cover:
  - 90 days of data
  - null reads for every metric, including a **calibrated device with a null `soil_raw`**
  - an uncalibrated stretch
  - a 2-min gap with no period, then a **4-min outage** (the 3–5 min case)
  - a 40-min outage
  - an outage crossing midnight
  - a `device_restart` gap
  - an `ongoing` outage
  - a calibration event
  - multi-day chat with more than 50 messages
- **`fetchAll()` unit tests** against a mock that caps pages at 1,000:
  - 0 rows, 999 rows, exactly 1,000 rows, 1,440 rows and 2,500 rows return every row exactly once
  - the last returned row is the newest
  - a duplicate across a page boundary is removed
  - an error mid-way is surfaced, never silently truncated
- **Status freshness** (fake timers):
  - after `latest_reading_at + 185 s` with no events, a status refetch has happened and the UI reads Offline
  - a `devices` UPDATE triggers a refetch
  - the 60 s interval keeps running with no Realtime events
- **Realtime:** a duplicate signal, a reconnect, and a re-read after the signal.
- **(live)**
  - After sign-in, a fake-ESP32 reading reaches `useLatest()` within 2 s.
  - Signed-out reads fail.
  - **With 26 h of seeded 60 s readings (> 1,000 rows), the 24 h query returns all of the last 24 hours' rows (≈ 1,440), and the newest row equals `latest_reading_at`.**
  - Stopping the fake ESP32 and the gateway turns the UI Offline within 180 s + 65 s, with no Realtime event.
  - `device_offline_periods` for a seeded day matches the injected outage.
  - Over the 90-day limit, the RPC returns no rows and the UI disables the date.

**Verify:** Jest; `e2e/web/live.spec.ts` (runs only with `SUPABASE_LOCAL=1`).

### T5: Domain helpers

**Owns:** `src/domain/**`.

**Work:**
- `status-style.ts` (status key → colour and icon; **text always comes from the server labels**).
- `status-freshness.ts` (expiry deadline from `latest_reading_at + 180 s`; whether the cached row has aged out).
- Formatting and plant-time-zone helpers (local-midnight bounds, DST days).
- `timeline-events.ts` (offline-period rows and hourly min/max → event list), `calibration.ts`, `chat-days.ts`.
- No threshold evaluation and no gap detection anywhere.

**Accept:**
- 100 % branch coverage.
- `status-freshness`: 180 s exactly is still fresh, 181 s has expired, and the deadline is re-armed after each fetch.
- Local-day bounds for 23 h and 25 h DST days.
- Event mapping:
  - `no_data` / `device_restart` / `ongoing` rows map to the right text
  - a midnight-crossing period shows on both days
- The calibration state matrix (§5.5) is table-tested.

**Verify:** Jest.

### T6: Shell and sign-in

**Owns:** `src/app/_layout.tsx`, `src/app/(auth)/**`, `src/app/(app)/_layout.tsx`, `src/components/shell/**`, `src/features/auth/**`.

**Work:**
- The session gate.
- NativeTabs on iOS; on web, the Sidebar (272 or 248 by tier, without switcher or search).
- `PageScroll` (§5.4).
- The gateway status footer.
- Sign in / sign out.
- The no-plant empty state.

**Accept:**
- Signed-out users are redirected to sign-in.
- Deep links reload on web.
- No element on any page uses viewport-height sizing (lint rule plus a Playwright check that page height is greater than the viewport on long fixtures).
- Sign-in matches `227:10075` and `227:10095`.

**Verify:** RNTL, Playwright, Maestro `sign-in.yaml`.

### T7: Home

**Owns:** `src/app/(app)/index.tsx`, `src/features/home/**`.

**Work:**
- Plant card:
  - nickname, species and location
  - status pill (`overall_label`) and the `summary` line
  - the "Sparks says" bubble showing the latest plant message
  - the Chat link
- 4 sensor cards with mini charts and the server's `<metric>_label`.
- "Today's timeline" card: today's events from T5.
- **"Recent insights" placeholder card ("coming soon")**.
- iPhone stack layout.

**Accept:**
- Figma diff of `226:7520` / `226:7892` is under threshold, with masks (T13).
- A new fixture reading updates the cards without a reload.
- Every soil-card state from the §5.5 matrix renders.

**Verify:** Playwright with figma-diff, RNTL, Maestro `home.yaml`.

### T8: Sensors

**Owns:** `src/app/(app)/sensors.tsx`, `src/features/sensors/**`.

**Work:**
- 24 h / 7 d / 30 d segmented control: 24 h reads `readings_v` through `fetchAll()` (about 1,440 rows); 7 d and 30 d read `readings_hourly_v` (≤ 720 rows).
- 4 detail cards with min / avg / max.
- Hardware footers, for example "Capacitive · GPIO34 · raw 1,980 · calibrated Nov 5" or "SHT31 · I²C 0x44 · Read OK / Read failed".
- The offline state.
- No Export button.

**Accept:**
- The range switch uses the right source.
- The 24 h chart's last point is the latest reading, even when the window holds more than 1,000 rows.
- Snapshots for the normal, offline, null-read and uncalibrated states.
- Figma diff of `227:7830` / `227:8145`.

**Verify:** Jest, Playwright, Maestro.

### T9: Timeline

**Owns:** `src/app/(app)/timeline.tsx`, `src/features/timeline/**`.

**Work:**
- Week navigation (limited to 90 days) and "Jump to date".
- The "This week" chart and the Week summary.
- Activity per local day, built from `device_offline_periods()` (one call per day), hourly min/max, calibration and chat events (§5.5).
- The "Upcoming care — coming soon" placeholder.

**Accept:**
- A golden test checks the event list for each fixture day. It must include:
  - the 4-min outage
  - the 40-min outage
  - the midnight-crossing outage on both days
  - a "Device restarted" event
  - an "Offline since …" (ongoing) event
- No event appears for the 2-min gap.
- Dates older than 90 days are disabled.
- Figma diff of `227:8461` / `227:9006`.

**Verify:** Jest, Playwright.

### T10: Chat

**Owns:** `src/app/(app)/chat.tsx`, `src/features/chat/**`.

**Work:**
- At `xl`, the three-column layout: day-grouped conversations, chat, and "What Sparks sees" (latest `readings_v`, `<metric>_label`, "Updated N s ago"). At `lg`, two columns with conversations below the context card.
- History keyset-paged 50 at a time.
- The sticky composer.
- Optimistic send.
- The "Based on readings from HH:mm" footer from `based_on_reading_at`.
- Handling for 429 (`retry_after`), the error row (`error` set), and upstream failure.
- Suggestion chips.

**Accept:**
- With fixtures, a canned reply.
- **(live)** A round trip through the local `chat` function with a stubbed DeepSeek.
- No DeepSeek host or key in the web bundle (CI grep).
- Figma diff of `227:9552` / `227:9813`.

**Verify:** RNTL, Playwright, Maestro `chat.yaml`.

### T11: Soil calibration

**Owns:** `src/app/(app)/calibrate.tsx`, `src/features/calibration/**`.

**Work:** the wizard from §5.5, shown as a modal over Settings (`227:11051` / `227:11599`) and as an iOS sheet (`134:2509`).

**Accept:**
- Capture is disabled until the reading is stable.
- Invalid pairs are rejected with the server's rule.
- **(live)** Saving updates `plant_status_v.soil_calibrated`, and the soil card switches to `soil_pct`.

**Verify:** Jest (state machine), Playwright, Maestro `calibrate.yaml`, then a manual check with the real probe.

### T12: Settings / Account

**Owns:** `src/app/(app)/settings/**`, `src/features/settings/**`.

**Work:**
- **Plant profile:** nickname and location are editable; species and added date are read-only.
- **Care targets:** "Use preset" on writes `threshold_overrides = {}`. Off enables editing `ok_low`/`ok_high` per metric. The client mirrors the server's ascending-order check for messages only; the server constraint is authoritative.
- **Devices & calibration:** live rows plus Recalibrate.
- **Account:** name in user metadata, email read-only, `plants.timezone` picker, password change with re-authentication, Sign out.
- The pane is capped at 1040 at `xl`.

**Accept:**
- Validation:
  - nickname is 1–40 characters and location ≤ 60
  - the new password is at least 8 characters
  - a range out of order shows the server's error
- **(live)**
  - A nickname change shows up in the sidebar and in the next chat reply.
  - Saving an override changes `plant_status_v` labels and the chart target bands.
  - A time-zone change moves the Timeline day bounds.
- Figma diff of `227:10136` / `227:10593` and `227:12148` / `227:12271`.

**Verify:** Jest, Playwright, Maestro.

### T13: Web visual and E2E harness

**Owns:** `e2e/web/**`, `design/figma/**`, `scripts/export-figma.md`.

**Work:**
- **Playwright projects:**
  - `fhd-1920` (1920×1080, DPR 1) and `mbp-1512` (1512×982, DPR 2): the **Figma-compared targets**.
  - `layout-1280`, `layout-1728`, `layout-2560`: layout-invariant checks only.
  - `web-narrow` (402×874).
- **Server and fixtures:** serve the web export with `npx expo serve` in fixtures mode. The fixture content matches the frames' sample data where possible: "Sparks", 42 %, 1,240 lux, 23.4 °C, 58 %. Freeze the clock to the frames' dates with `page.clock.install`, and turn animations off.
- **Figma diff:** `figma-diff.ts` compares the **first screenful** at 1920 and 1512 against `design/figma/<Screen>-1920.png` / `-1512.png` for the 8 v1 screens.
  - **Scale:** captures use `page.screenshot({ clip: {x: 0, y: 0, width: vw, height: vh}, scale: 'css', animations: 'disabled' })`. A DPR 2 project (`mbp-1512`) therefore yields **1512×982**, the same size as the 1× Figma export, not 3024×1964.
  - **Size guard:** the script asserts that capture and reference dimensions are equal before diffing, and fails loudly if they are not.
  - **Masks:** `figma-masks.json` holds the regions §2.1.1 changes or removes (switcher, search, bell, health score, Log care, filter chips, New chat, mic, alert switches, Add device, photo / username / delete account). Masks are stored in **CSS pixels**, the same coordinate space as the capture and the export.
  - **Threshold:** the diff is advisory; start at 8 % after masking.
- **Snapshot baselines:** `toHaveScreenshot` **full-page** baselines at 1920 and 1512, with `scale: 'css'` set explicitly (pages scroll; nothing is clipped to the viewport).
- **Layout invariants**, checked at every width:
  - no horizontal scroll
  - sidebar width per tier
  - content width per §5.4 (1552 / 1200 / capped at 2560)
  - the Settings pane is ≤ 1040
  - Chat has 3 columns at ≥ 1728
  - document height is not limited to the viewport height

**Accept:**
- CI runs the suite on each PR and attaches the diff report.
- A one-token change fails the snapshots.

**Verify:** CI artifacts.

### T14: iOS pipeline and web deploy

**Owns:** `.maestro/**`, `.eas/workflows/e2e-ios.yml`, `.eas/workflows/deploy-web.yml`, `assets/images/**`.

**Work:**
- Maestro flows on the iPhone 17 Pro simulator (iOS 27).
- An EAS e2e build plus a Maestro job.
- `eas deploy`: previews on PRs, `--prod` on main.
- Icon, splash and launch screen.

**Accept:**
- Maestro passes on fixtures.
- A preview URL is posted per PR.
- A TestFlight preview build exists.

**Verify:** workflow logs and App Store Connect.

---

## 7. Things the user must do by hand

1. **Expo account:** run `npx eas-cli login` (Expo Go also needs a login), then `eas init`.
2. **Apple Developer Program:** enroll ($99/yr), create the App Store Connect app record (or let `eas submit` create it), and add yourself as an internal TestFlight tester.
3. **Xcode:** install **27.1** with the iOS 27 simulator. Optionally install Maestro with `curl -fsSL https://get.maestro.mobile.dev | bash`.
4. **iPhone:** enable Developer Mode, then run `eas device:create` for internal builds.
5. **Supabase keys:** take the project URL and the **publishable** key from the gateway setup. Put them in `.env.local` and in EAS env vars (`eas env:create`). Never use a secret key here.
6. **Owner login:** keep the owner email and password created by the gateway setup. Use a test owner on the local stack for live tests.
7. **Figma exports:** export the 8 v1 frames at 1920 and 1512, plus the iPhone frames, as 1× PNGs into `design/figma/` using the naming in §5.3. Alternatively, give a worker Figma access to run T13's export step.
8. **GitHub:** make sure `gh` can read `olvar-gh/olvar-gateway`, which the type sync needs.

---

## 8. Risks

- **The frames still contain deferred features.** Building to them means removing those elements consistently (§2.1.1), so the Figma diffs depend on correct masks. If the designer later updates the frames for v1, the masks can be removed.
- **Raw-reading volume:** the Sensors 24 h view needs 2 paginated requests (about 1,440 rows). Forgetting `fetchAll()` on a new query would silently drop the newest rows, which is why T4 tests the > 1,000-row case live.
- **Timeline cost:** each day costs one small RPC call plus about 24 hourly rows, loaded lazily per day.
- **Status freshness depends on client timers.** Background tabs throttle them, so the app also refetches on focus and foreground.
- **Only the latest calibration is known** (`soil_calibrated_at`). Earlier calibrations cannot appear on the Timeline.
- **Expo Router SDK 58 core rework and native tabs.** Pin patch versions and keep the shell isolated.
- **Liquid Glass pitfalls:** animating opacity or mounting on demand breaks it, and it needs iOS 26+.
- **60 s cadence makes calibration slow:** about 3 minutes per step.
- **Web font rasterization differs from Figma**, so the Figma diff is advisory.

---

## 9. Open questions for the user

None are blocking. The follow-up decisions answered the remaining items:
- Vertical scrolling has no limit.
- "Recent insights" stays as a "coming soon" placeholder.
- The responsive rules follow the 1920 / 1512 frames.

Choices this plan made that the user may want to glance at:
- Timeline's "Upcoming care" slot uses the same "coming soon" placeholder.
- Chat's "Past conversations" column groups the single conversation by day, because the schema has no threads.
- Care targets are editable through `threshold_overrides` (`ok_low`/`ok_high` only); the per-row alert switches stay hidden.
- Timeline peak times are shown at hour precision, because they come from the hourly summaries.
