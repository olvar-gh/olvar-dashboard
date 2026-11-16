# olvar-dashboard — Project plan

Status: planning only. Updated Nov 16, 2026 to the **final contract** (decisions A–H).
Scope of this repo: the Expo app that serves **desktop web** and **native iOS** from one codebase. It reads the Supabase data and calls the Edge Functions owned by `olvar-gateway`.

---

## 1. Summary

- **Stack:** Expo **SDK 58** (React Native **0.88**, React **19.3**, react-native-web 0.21), Expo Router, TypeScript (strict). Xcode ≥ 26.4; EAS builds on SDK 58 use Xcode 27.1.
- **One codebase, two layouts.**
  - Desktop web uses a sidebar shell, following the Figma desktop frames.
  - iOS uses system **native tabs** (Home · Sensors · Timeline · Chat), which get Liquid Glass automatically, following the Figma 402×874 frames.
  - The split is done with Expo Router platform files. Screens, data hooks, charts and tokens are shared.
- **"Avatar" means chat with your plant** (decision A).
  - The dashboard's Chat screen sends messages to the gateway-owned Edge Function `chat`, which calls `deepseek-flash` with thinking off. It answers in first person as the plant, in the user's language.
  - The dashboard shows the stored chat messages.
  - The status pill ("Feeling great" etc.) comes from a **server-side deterministic view/function**. The dashboard only displays it and never evaluates thresholds itself.
- **v1 scope** (decision B):
  - Sign in (single owner, login required), Home, Sensors, Timeline, Chat, Soil calibration, Settings/Account.
  - One plant and one device, created by the gateway's seed/setup.
- **Styling:** React Native `StyleSheet` + typed tokens copied from the Figma variables + a `useBreakpoint` hook.
- **Charts:** custom SVG (`react-native-svg` + `d3-scale`/`d3-shape`). The same code runs on web and iOS.
- **Data:**
  - `@supabase/supabase-js` (publishable key + the owner's session), TanStack Query v5, Realtime `postgres_changes`.
  - Types are a pinned copy of `olvar-gateway/supabase/types/database.types.ts`.
- **Ship:** web on **EAS Hosting**; iOS via **EAS Build → TestFlight** (Apple Developer Program, $99/yr).

---

## 2. Research findings (with sources)

### 2.1 Figma (read directly: file `ZMGAYBFUZjGsECpL54uEJg`, page `0:1`)

**Existing frames:** desktop **1440×1024**, iPhone **402×874**. Desktop frames at **1920×1080 and 1512×982** for the v1 screens are being added by a designer (decision H). They were not in the file when it was last checked on Nov 16.

**v1 screens** (node IDs for `get_design_context` / `get_screenshot`):

| Screen | Desktop 1440 | iPhone | Notes for v1 |
|---|---|---|---|
| Sign in | `133:1175` | `134:3297` | Email + password only |
| Home | `1:8` | `18:154`, `20:55` (full scroll) | Plant switcher, notifications and care log controls removed (see §2.1.1) |
| Sensors | `34:128`, `145:1322` (sensor offline) | `35:128`, `35:495`, `148:2056` (offline) | No Export CSV button |
| Timeline | `27:44` | `30:44`, `30:462` | No Log care, Upcoming care or Filter |
| Chat | `32:86` | `33:86`, `33:391` | Single conversation (see §4) |
| Soil calibration | `132:1590` (modal over Settings) | `134:2509` | |
| Settings | `44:193`, `51:479` (preset off), `131:479` (Account pane) | `45:193`, `45:606`, `50:463`, `155:3506` (Devices) | Panes: Plant profile, Care targets, Devices & calibration, Account |
| Account / edit profile | `144:1051` | `147:1862` | |

**Deferred, not built in v1:**
- Create account `142:686`, Forgot password `142:723`
- Pair device `144:832`
- No plants / Add plant `142:752`, `132:947`
- Plants `132:479`, Plant switcher `11:11`, Remove plant `145:1166`
- Log care `132:1271`, Upcoming care `155:3215`
- Personality `154:2728`
- Notifications `145:1526`, `133:479`
- Search `133:807`
- Export `155:3043`

**Components** (section `138:622`):
- 36 line icons.
- Desktop: Button, Field, Notice, List row, Card, Modal, Sidebar, Page header, Settings nav, Auth brand panel, Logo.
- iPhone: Glass button (Liquid Glass 50×50), Nav bar (glass back button + large title), Section header/footer, List section/row, Button, Tab bar, Brand header, Alert, Search field, Range card.

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
- Body: **Inter** (400/500/600).
- iOS large title: **Inter Bold 34/41, tracking 0.4**.

#### 2.1.1 Figma text and elements the app does not follow (decisions A, B, E)

- **Text fixes:**
  - "updated every 10 seconds" / "uploads every 10 s" → **"every minute"** (60 s).
  - "Raspberry Pi 4" → **"Raspberry Pi 3B"**.
  - "USB serial to gateway" → **"Wi-Fi · MQTT"**.
- **Removed from Home:**
  - "Sparks says" LLM bubble: there is no periodic LLM job. The card shows the status pill, the server status summary and a "Chat with Sparks" entry.
  - Health score "86/100": not part of the final contract.
  - "Water in ~2 days": prediction belongs to the deferred upcoming care.
  - "Recent insights" card.
  - "Log care" button.
  - Bell, plant switcher and the iPhone "+" button.
- **Removed from Chat:** the past conversations list, "New chat" and the voice input icon.
- **Not designed** (decision H): loading, error, offline and empty states. They are built from existing components (Card, Notice, List row) and tokens (§5.5).

### 2.2 Expo / React Native / iOS 27

- **SDK 58** (Oct 15, 2026):
  - RN 0.88, built for iOS 27 (scene life cycle, resizable iPhone apps).
  - `expo-glass-effect` reports glass as available with the iOS 27 SDK.
  - https://expo.dev/changelog/sdk-58
- **Version table:** SDK 58 → RN 0.88, React 19.3.0, RNW 0.21.0, Node ≥ 22.13, iOS 16.4+, **Xcode 26.4+**. — https://docs.expo.dev/versions/latest
- **EAS images:** `sdk-58`/`latest` use Xcode 27.1. The Strict TypeScript API is the default. — https://expo.dev/blog/how-to-upgrade-to-sdk-58
- **Expo Go:** SDK 58 support has been on the App Store since Oct 22, and login is now required. — https://apps.apple.com/us/app/expo-go/id982107779, https://expo.dev/changelog
- **Native tabs** (`expo-router/native-tabs`, SDK 58):
  - Liquid Glass tab bar on iOS 26+.
  - The docs recommend `_layout.web.tsx` / `*.web.tsx` with headless `expo-router/ui` tabs for a custom web layout.
  - https://docs.expo.dev/router/advanced/native-tabs, https://docs.expo.dev/versions/latest/sdk/router/native-tabs
- **Platform route files** need a non-platform counterpart. — https://docs.expo.dev/router/advanced/platform-specific-modules
- **`expo-glass-effect`** (`GlassView`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`): iOS 26+, falls back to `View`, and is in Expo Go. — https://docs.expo.dev/versions/latest/sdk/glass-effect
- **Expo UI SwiftUI:** `glassEffect` modifier (iOS 26+). — https://docs.expo.dev/versions/latest/sdk/ui/swift-ui
- **Glass pitfalls:** glass renders blank if you animate its opacity or mount it on demand over other glass. — https://opointo.com/docs/guides/liquid-glass-react-native
- **iOS 27:** apps are resizable and a launch screen is required. — https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- **Web glass fallback:** CSS `backdrop-filter` is Baseline 2024, with about 97% support. — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter, https://caniuse.com/css-backdrop-filter
- **Variable fonts:** supported on native in SDK 58; RN 0.88 adds `fontVariationSettings`. — https://docs.expo.dev/develop/user-interface/fonts/
- **`@expo-google-fonts`:** `useFonts` works on web and in Expo Go; the config plugin needs a dev build. — https://github.com/expo/google-fonts
- **Web output modes:** `single` / `static` / `server`. — https://docs.expo.dev/guides/publishing-websites

### 2.3 Styling, charts

- **NativeWind:** 4.2.7 is stable (Tailwind 3); **v5 (Tailwind 4) is a release candidate** and not for production. — https://www.nativewind.dev/docs/getting-started/installation, https://www.nativewind.dev/v5
- **Unistyles 3:** needs Nitro modules and is **not supported in Expo Go**. — https://unistyl.es/v3/start/getting-started
- **Tailwind in Expo:** web-only unless you add NativeWind or Uniwind. — https://docs.expo.dev/guides/tailwind
- **Skia on web:** CanvasKit WASM is **2.9 MB gzipped**. — https://shopify.github.io/react-native-skia/docs/getting-started/web
- **Victory Native XL:** needs Skia, Reanimated and Gesture Handler, and documents no web target. — https://github.com/FormidableLabs/victory-native-xl
- **gifted-charts:** SVG-based, but web is a separate package. — https://www.npmjs.com/package/react-native-gifted-charts
- **`react-native-svg`:** iOS, web and Expo Go; 15.16.0 for SDK 58. — https://docs.expo.dev/versions/latest/sdk/svg/

### 2.4 Supabase

- **Keys:** publishable keys for apps, secret keys for servers only; legacy keys are deprecated by the end of 2026. — https://supabase.com/docs/guides/getting-started/api-keys
- **Expo setup:** session storage through `expo-sqlite/localStorage/install`; env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. — https://docs.expo.dev/guides/using-supabase, https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- **Realtime Postgres Changes:** tables must be in the `supabase_realtime` publication, and RLS is checked per subscriber. — https://supabase.com/docs/guides/realtime/postgres-changes
- **Type generation:** `supabase gen types typescript --remote=<ref>`. — https://supabase.com/docs/reference/cli/supabase-gen
- **Calling Edge Functions:** `supabase.functions.invoke`, with the user JWT checked through `withSupabase({auth:'user'})`. — https://supabase.com/docs/guides/functions/auth
- **TanStack Query:** React v5 (5.107.x). — https://github.com/TanStack/query/releases

### 2.5 DeepSeek (used only by the gateway's `chat` Edge Function)

- `deepseek-flash` is DeepSeek-V4.1-Flash-1017. Thinking mode is on by default, so the Edge Function must disable it.
  - https://api-docs.deepseek.com/, https://api-docs.deepseek.com/updates
  - The parameter is `thinking: {type: "disabled"}`, per the gateway planner's notes.
- **Pricing:** $0.30 input / $1.20 output per 1M tokens at peak (half off-peak). One chat turn with about 3k context tokens and a 300-token reply costs about $0.0013. — https://api-docs.deepseek.com/quick_start/pricing/
- DeepSeek is text-only output, which is consistent with decision A.

### 2.6 Hosting, distribution, testing

- **EAS Hosting:** free tier gives 100k requests/month; a custom domain needs a paid plan. — https://expo.dev/pricing, https://docs.expo.dev/eas/hosting/introduction
- **Vercel:** SPA rewrites for `expo export -p web`. — https://docs.expo.dev/guides/publishing-websites
- **EAS Free:** 15 iOS builds/month, low-priority queue. — https://expo.dev/pricing
- **Apple Developer Program:** $99/yr, required for TestFlight. — https://developer.apple.com/programs
- **Testing tools:** `jest-expo` + RNTL; Maestro on an iOS Simulator, locally or as an EAS Workflow job. — https://docs.expo.dev/develop/unit-testing, https://docs.expo.dev/eas/workflows/examples/e2e-tests

---

## 3. Decisions and alternatives rejected

| Topic | Decision | Rejected and why |
|---|---|---|
| Framework | **Expo SDK 58**, RN 0.88 | SDK 57: Xcode 27 builds need an opt-in scene flag. |
| One codebase | **Yes.** Shared screens, data and charts. `AppShell.tsx` (NativeTabs) and `AppShell.web.tsx` (Sidebar on `expo-router/ui` headless Tabs). `*.web.tsx` only where layouts really differ (Home grid, Settings two-pane). | Separate Next.js web app: duplicate data layer and charts. |
| Dev workflow | **Development build** by default. Expo Go also works for most of it. | Expo Go only: blocks the font config plugin. |
| Web output | **`single` (SPA)**. Everything is behind login; no SEO; no hydration mismatch from width-based layout. | `server` / `static`: no benefit, extra runtime or hydration issues. |
| Styling | **`StyleSheet` + `src/theme/tokens.ts` + `useBreakpoint()`** | NativeWind v5 (RC), NativeWind 4 (Tailwind 3), Uniwind (extra engine, paid Pro), Unistyles 3 (no Expo Go), Tamagui (heavy). |
| Liquid Glass (iOS) | NativeTabs (system glass tab bar). `GlassView` for 50×50 header buttons, behind an availability check, with a translucent fallback. | Hand-drawn glass: drifts from the system look. |
| Glass on web | `GlassButton.web.tsx` uses `backdrop-filter`. Only used on narrow web; desktop Figma uses flat cards. | Skia or WebGL blur. |
| Charts | **Custom SVG components:** line/area with target band, step line, hourly bars, arc gauge, range bar, day strip. | Skia/Victory XL (+2.9 MB web WASM), gifted-charts (two packages), Recharts (web only). |
| Data | **supabase-js + TanStack Query v5 + Realtime** on `readings` INSERT, `devices` UPDATE and `chat_messages` INSERT. The cache is merged on events and invalidated on reconnect. | Polling only. |
| Chart sources | 24 h from raw `readings`, 7 d from `readings_hourly`, 30 d from `readings_daily` (gateway tables; raw kept 90 days). | Client-side aggregation of raw rows. |
| Status pill | **Display only**, from the server status view (decision A). The dashboard has **no threshold logic**. Charts may draw the target band from the stored threshold numbers, but do not judge values. | Client-side evaluation: web and iOS could disagree. |
| Chat | Chat screen → `supabase.functions.invoke('chat')`. Messages are read from `chat_messages`. Static suggestion chips. Optimistic user bubble; the assistant reply comes from the function response and is reconciled with Realtime. | Calling DeepSeek from the client: leaks the key (forbidden). |
| Type sharing | Pinned copy of `olvar-gateway/supabase/types/database.types.ts` → `src/data/database.types.ts` via `scripts/sync-types.sh <ref>` (`gh api`). CI fails if the copy differs from the pinned ref. | Submodule, private npm package, remote type generation in dashboard CI. |
| Fonts | Inter (static) + Fraunces variable TTF, bundled in `assets/fonts`. `fontVariationSettings` for WONK/SOFT. | System fonts or static Fraunces: wrong glyph shapes. |
| Icons | Figma SVGs → `@svgr/cli --native` components. iOS tab icons as PNG templates. | `@expo/vector-icons`: being deprecated, and doesn't match the design. |
| Auth | Email + password sign in only. Session stored in expo-sqlite localStorage (native) and localStorage (web). Signups are disabled server-side. | Create account / forgot password: deferred; the owner resets the password in the Supabase dashboard. |
| Web hosting | **EAS Hosting**, `*.expo.app` URL. | Vercel: switch only if a free custom domain is wanted later. |
| iOS distribution | **EAS Build → EAS Submit → TestFlight** (internal). | Free Apple ID sideload: short-lived provisioning. |

---

## 4. Contract changes

**No further contract changes are proposed.** The dashboard follows the final contract (A–H).

My earlier proposals that the final contract **withdraws or replaces**:
- `avatar_states` and the avatar refresh job
- Personalities
- Care events, insights and notifications tables
- Chat threads
- `claim_device`
- `readings_bucketed` (replaced by the gateway's `readings_hourly` / `readings_daily`)
- Multi-plant ownership UI

**What the dashboard consumes.** These are interface details inside the final contract; the gateway planner owns the names and the dashboard adapts to the generated types.

| Need | Expected from olvar-gateway |
|---|---|
| Sign in | Supabase Auth email + password, signups disabled, single owner. All tables owner-only RLS; nothing granted to `anon`. |
| Plant + thresholds | One `plants` row (name, species, location) with its care thresholds (min/max for soil %, lux, °C, RH %). Settings edits name/location and thresholds through owner `update` RLS or an RPC. |
| Device + gateway status | `devices` row: `status` mirrors the retained MQTT `online`/`offline`, plus `last_seen_at`, `fw`, `rssi_dbm`, `dry_raw`, `wet_raw`, calibration timestamp. A gateway heartbeat (last seen) for the sidebar footer. |
| Readings | `readings(device_id, recorded_at, temperature_c, humidity_pct, lux, soil_raw, soil_pct, rssi_dbm, fw)`. Any sensor value may be null. `soil_pct` is null until calibrated. Realtime INSERT. |
| Summaries | `readings_hourly` / `readings_daily` with `<metric>_avg/_min/_max` and `n` (per gateway notes). |
| Status pill | One server view/function (for example `plant_status`) returning:<br>• the overall status key and label ("Feeling great")<br>• per-metric status key and label (for example "Optimal · 35–60 %", "Comfortable")<br>• a one-line deterministic summary<br>• `computed_at`<br><br>The dashboard re-reads it whenever a new reading arrives. |
| Soil calibration write | Owner may set `dry_raw`/`wet_raw` (RPC or column `update`). Server validates `dry_raw > wet_raw` and 0–4095, and recomputes `soil_pct` per its own policy. The dashboard re-fetches readings and summaries after saving. |
| Chat | Edge Function `chat`:<br>• `auth: user`<br>• input: the user message<br>• output: the stored assistant message<br>• errors: 4xx/5xx with a code (rate limit, upstream failure)<br><br>Table `chat_messages(id, role, content, created_at, …)` is readable by the owner, in the Realtime publication, and should record which reading time the answer was based on (Figma shows "Based on readings from 14:28"). |
| Types | `supabase/types/database.types.ts`, committed and tagged. |

---

## 5. Architecture and folder layout

### 5.1 Runtime picture

```
 ESP32 ─MQTT(60 s)→ Pi 3B gateway ─secret key→ Supabase Postgres  (readings, summaries, devices, plant, thresholds,
                                                                   chat_messages, status view)  ── owned by olvar-gateway
                                               Edge Function chat ──→ DeepSeek deepseek-flash (thinking off)
                                                     ▲                      ▲ Realtime (readings, devices, chat_messages)
                     publishable key + owner JWT     │                      │
              ┌──────────────────────── olvar-dashboard ───────────────────┴───────────┐
              │ Expo Router app — web SPA (EAS Hosting)  /  iOS (EAS Build → TestFlight) │
              └──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Navigation (v1)

- **Route groups:**
  - `(auth)/sign-in`.
  - `(app)/*`, gated by session. With no plant row it shows an empty state: "No plant set up yet — run the gateway setup".
- **iOS:**
  - `NativeTabs` with Home · Sensors · Timeline · Chat.
  - Settings opens from a glass header button (gear) on Home.
  - Soil calibration is a `formSheet` modal launched from Settings → Devices & calibration, or from the Home/Sensors "Not calibrated" notice.
- **Web:**
  - Sidebar (Figma `140:901`) with Home/Sensors/Timeline/Chat, gateway status footer and settings gear; no plant switcher or search.
  - Settings is a two-pane page using Settings nav `140:1180`, limited to the v1 panes.
- **Narrow web** (< 768 px) reuses the phone layouts with a bottom bar.

### 5.3 Folder layout

```
olvar-dashboard/
├─ app.json · eas.json · package.json · tsconfig.json · jest.config.js
├─ .env.example                      # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_DATA_SOURCE
├─ assets/fonts/ · assets/images/
├─ design/tokens.json · design/figma/*.png   # reference exports: 1440×1024, 1512×982, 1920×1080, 402×874
├─ src/
│  ├─ app/
│  │  ├─ _layout.tsx                 # fonts, QueryClient, Auth, SafeArea
│  │  ├─ (auth)/_layout.tsx, sign-in.tsx
│  │  ├─ (app)/_layout.tsx           # session gate + <AppShell/>
│  │  ├─ (app)/index.tsx             # Home
│  │  ├─ (app)/sensors.tsx
│  │  ├─ (app)/timeline.tsx
│  │  ├─ (app)/chat.tsx
│  │  ├─ (app)/calibrate.tsx         # Soil calibration (modal on iOS, modal over Settings on web)
│  │  ├─ (app)/settings/_layout.tsx (+ _layout.web.tsx), index.tsx, plant.tsx, care-targets.tsx, devices.tsx, account.tsx
│  │  └─ (dev)/gallery.tsx           # components + charts + states (dev only, used by visual tests)
│  ├─ components/
│  │  ├─ shell/   AppShell.tsx, AppShell.web.tsx, Sidebar.tsx, GatewayStatus.tsx
│  │  ├─ ui/      Button, Field, Notice, Card, ListRow, Modal, PageHeader, NavBar, SectionHeader, SectionFooter,
│  │  │           Toggle, Segmented, StatusPill, GlassButton(.tsx/.web.tsx), Skeleton, EmptyState, ErrorState, OfflineBanner
│  │  ├─ icons/   generated from Figma SVGs
│  │  └─ charts/  scales.ts, LineArea.tsx, StepLine.tsx, HourBars.tsx, Gauge.tsx, RangeBar.tsx, DayStrip.tsx
│  ├─ features/   home/, sensors/, timeline/, chat/, calibration/, settings/, auth/
│  ├─ data/
│  │  ├─ supabase.ts · database.types.ts (synced, do not edit)
│  │  ├─ source/  index.ts (DataSource interface), supabase.ts, fixtures.ts
│  │  ├─ fixtures/ generate.ts       # seeded 90-day series incl. nulls, offline gaps, uncalibrated period, chat
│  │  ├─ queries/ plant.ts, status.ts, readings.ts, summaries.ts, device.ts, chat.ts, calibration.ts
│  │  └─ realtime.ts
│  ├─ domain/     format.ts, time.ts, timeline-events.ts, calibration.ts (stability + capture helpers, no thresholds)
│  └─ theme/      tokens.ts, typography.ts, fonts.ts, breakpoints.ts, useBreakpoint.ts
├─ e2e/web/       *.spec.ts, playwright.config.ts, figma-diff.ts
├─ .maestro/      sign-in.yaml, home.yaml, chat.yaml, calibrate.yaml
├─ .eas/workflows/ ci.yml, deploy-web.yml, e2e-ios.yml
└─ scripts/       sync-types.sh, export-figma.md
```

### 5.4 Responsive strategy

**Breakpoints** (from window width):

| Range | Layout |
|---|---|
| `compact` < 768 | Phone layout |
| `medium` 768–1279 | Icon-rail sidebar, 2-column grid |
| `wide` ≥ 1280 | Desktop layout |

**Desktop rules:**
- Fixed **248 px** sidebar, 32 px padding.
- Fluid card grid using flex percentages.
- Charts measured with `onLayout`.
- No fixed page heights.
- **Max content width and per-size spacing come from the new 1920×1080 / 1512×982 frames** (decision H). Until they land, implement against 1440×1024 with fluid widths. T13 adds the new frames as references, and spacing tokens are adjusted then.
- Playwright uses DPR 2 for 1512×982 (MacBook Pro 14" default scaling) and DPR 1 for 1920×1080.

**iOS:**
- Single column, large titles, native tab bar, sensor 2×2 mini cards on Home (`20:55`), grouped-list Settings.
- Width-fluid, because iOS 27 iPhone apps are resizable.
- iPad is not targeted.

### 5.5 Data behaviour and undesigned states (decision H)

All of these are built from existing components and tokens:

- **Loading:** `Skeleton` blocks shaped like cards (`border/subtle` fill), not spinners.
- **Error:** `ErrorState` = Card + `Notice` (warn) + Retry button. Chat errors appear inline under the failed bubble with Retry.
- **Offline device:** device `status = 'offline'`, or no reading for more than 3 intervals (180 s). The Figma sensor-offline frames (`145:1322`, `148:2056`) apply. `OfflineBanner` shows "olvar-node offline since 14:02".
- **Offline gateway:** the gateway heartbeat is stale for more than 3 minutes, shown in the sidebar footer.
- **Failed sensor read:** the latest value is null. The card shows "—" and "Read failed at 14:31". Charts break the line.
- **Uncalibrated:** `soil_pct` is null. The soil card shows the raw value plus "Not calibrated" with a "Calibrate" button.
- **Empty:** no plant row (setup missing), no readings yet, no chat messages (shows suggestion chips).
- **Calibration flow:**
  1. The modal subscribes to new readings (60 s cadence) and shows the latest `soil_raw`. Higher means drier.
  2. "Stable" when the last 3 readings are within ±2 % of each other.
  3. Capture uses the median of the last 3 readings.
  4. Validation before saving: dry > wet, both 0–4095, gap ≥ 200 counts.
  5. Save writes `dry_raw`/`wet_raw`, then invalidates readings and summaries.
  6. The UI explains the wait: "updates every minute".
- **Timeline v1:**
  - Day selector and hourly day strips per metric, from `readings_hourly`.
  - A derived event list, computed in `domain/timeline-events.ts` without thresholds: daily max/min per metric, device offline periods (reading gaps over 180 s), calibration saved, chat conversations that day.

---

## 6. Task breakdown (parallelizable, disjoint file ownership)

**Order.** **T0 first**; it installs every dependency, so later tasks never edit `package.json`. Then **T1–T5 run in parallel**, then **T6–T12 in parallel** against T1/T2/T4 (or their stubbed interfaces). **T13–T14** can start alongside T6.

**Without hardware.** Every task builds and tests with `EXPO_PUBLIC_DATA_SOURCE=fixtures`. "(live)" checks use the gateway's local `supabase start` plus its seed or MQTT simulator. Only the real-probe calibration and the end-to-end latency need the ESP32.

### T0: Scaffold

**Owns:** `package.json`, lockfile, `app.json`, `eas.json`, `tsconfig.json`, `jest.config.js`, `.env.example`, `.gitignore`, `src/app/+not-found.tsx`, `.eas/workflows/ci.yml`.

**Work:**
- `create-expo-app --template default@sdk-58`, then strip the demo.
- Set `web.output: "single"`, `scheme: "olvar"`, `supportsTablet: false`, and configure the expo-font plugin.
- Install: expo-router, react-native-svg, d3-scale, d3-shape, @supabase/supabase-js, expo-sqlite, @tanstack/react-query, expo-glass-effect, expo-font, zod.
- Dev dependencies: jest-expo, @testing-library/react-native, @playwright/test, pixelmatch, pngjs, @svgr/cli.
- `eas.json` profiles: development, preview, production, e2e-test (simulator).

**Accept:** `npx expo-doctor` clean; `tsc --noEmit`, `npm test` and `npx expo export -p web` pass; `npx expo run:ios` launches on a simulator.

**Verify:** CI on each PR.

### T1: Tokens, fonts, icons

**Owns:** `src/theme/**`, `assets/fonts/**`, `design/tokens.json`, `src/components/icons/**`.

**Work:** Figma variables and text styles become typed tokens. Bundle Inter and the variable Fraunces (WONK 1, SOFT 0). Generate the icons.

**Accept:** a jest test checks `tokens.ts` against `tokens.json`. Fraunces glyph shapes are visible on web and iOS in the gallery.

**Verify:** Jest; gallery on web and the simulator.

### T2: UI primitives and state components

**Owns:** `src/components/ui/**`, `src/app/(dev)/gallery.tsx`.

**Work:** the Figma components used by v1, plus `StatusPill`, `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner` (§5.5). `GlassButton` uses `GlassView` with a fallback; the `.web` version uses `backdrop-filter`.

**Accept:** an RNTL test per component for props and states. Gallery snapshots pass. Real glass on an iOS 26+ simulator, fallback on iOS 18.

**Verify:** Jest, Playwright gallery, simulator.

### T3: Charts

**Owns:** `src/components/charts/**`.

**Work:** pure SVG from `{t, v | null}` series. Target band drawn from the given min/max. Null gaps, "Now" marker, local-time ticks.

**Accept:** unit tests for scales, gaps, DST, empty series and all-null series. No Skia in the web bundle.

**Verify:** Jest; Playwright gallery.

### T4: Data layer

**Owns:** `src/data/**`, `scripts/sync-types.sh`.

**Work:**
- `DataSource` interface with Supabase and fixtures implementations.
- Hooks for plant, status, readings (24 h raw), summaries (hourly/daily), device, gateway heartbeat, chat (list + send), calibration save.
- Realtime merge for readings / devices / chat_messages.
- A provisional types file until the gateway publishes its types; then switch to the pinned sync.

**Accept:**
- Fixtures are deterministic per seed and include nulls, offline gaps and an uncalibrated stretch.
- Realtime merge tests (duplicate, out-of-order, reconnect).
- **(live)** Sign in; read data; a simulated reading arrives within 2 s; signed-out reads fail.

**Verify:** Jest; `e2e/web/live.spec.ts` (runs only with `SUPABASE_LOCAL=1`).

### T5: Domain helpers

**Owns:** `src/domain/**`.

**Work:** formatting (units, "—" for null), time helpers, `timeline-events.ts`, `calibration.ts` (stability, median capture, validation). No threshold or status logic.

**Accept:** 100% branch coverage.

**Verify:** Jest.

### T6: Shell and sign-in

**Owns:** `src/app/_layout.tsx`, `src/app/(auth)/**`, `src/app/(app)/_layout.tsx`, `src/components/shell/**`, `src/features/auth/**`.

**Work:** session gate, NativeTabs (4 tabs), web Sidebar, gateway status footer, sign in / sign out, empty state when there is no plant.

**Accept:** signed-out users are redirected to sign in; web deep links reload correctly; glass tab bar on iOS 26+; sign-in matches `133:1175` / `134:3297`.

**Verify:** RNTL, Playwright, Maestro `sign-in.yaml`.

### T7: Home

**Owns:** `src/app/(app)/index.tsx`, `src/features/home/**`.

**Work:**
- Plant card: name, species, location, `StatusPill`, server summary line, "Chat with Sparks" entry.
- 4 sensor cards with mini charts and per-metric status labels from the server.
- Today strip + derived events.
- Bottom-right slot: "Today at a glance" (min/avg/max), pending the designer's 1920/1512 frames.

**Accept:** Figma diff under threshold at 1440 and, once available, at 1512 and 1920. A new fixture reading updates the cards without a reload. Offline, uncalibrated and null states render.

**Verify:** Playwright + figma-diff, RNTL, Maestro `home.yaml`.

### T8: Sensors

**Owns:** `src/app/(app)/sensors.tsx`, `src/features/sensors/**`.

**Work:** 24 h / 7 d / 30 d ranges, 4 detail charts, min/avg/max, sensor footers (fw, raw, calibration date, last read), offline state. No export.

**Accept:** range switches read raw / hourly / daily respectively. Snapshots for the normal, offline and null-read states.

**Verify:** Jest, Playwright, Maestro.

### T9: Timeline

**Owns:** `src/app/(app)/timeline.tsx`, `src/features/timeline/**`.

**Work:** day selector, day strips, derived event list (§5.5).

**Accept:** the event list for a fixture day equals the expected list (golden test).

**Verify:** Jest, Playwright.

### T10: Chat

**Owns:** `src/app/(app)/chat.tsx`, `src/features/chat/**`.

**Work:**
- One conversation.
- Optimistic send through `functions.invoke('chat')`.
- Assistant bubble with "Based on readings from HH:mm" when provided.
- Suggestion chips; desktop context panel "What Sparks sees right now".
- Error, rate-limit and retry states.
- Non-English input passes through unchanged; the reply language comes from the server.

**Accept:** fixtures return a canned reply. **(live)** Round trip with the local Edge Function using a stubbed DeepSeek. No DeepSeek host or key appears in the web bundle (grep in CI).

**Verify:** RNTL, Playwright, Maestro `chat.yaml`.

### T11: Soil calibration

**Owns:** `src/app/(app)/calibrate.tsx`, `src/features/calibration/**`.

**Work:** the 2-step wizard from `132:1590` / `134:2509` (§5.5).

**Accept:**
- Capture is disabled until stable.
- Invalid pairs are rejected with a message.
- Save writes `dry_raw`/`wet_raw` and the soil card leaves the "Not calibrated" state after re-fetch **(live)**.

**Verify:** Jest (wizard state machine), Playwright, Maestro `calibrate.yaml`. Then a manual check with the real probe in air and in water.

### T12: Settings / Account

**Owns:** `src/app/(app)/settings/**`, `src/features/settings/**`.

**Work:**
- Plant profile: name, location (no photo, no remove).
- Care targets: edit min/max, "Use preset" restores defaults.
- Devices & calibration: read-only device and gateway rows plus the Recalibrate link.
- Account: display name, email (read-only), change password, sign out.

**Accept:** frames `44:193`, `51:479`, `131:479`, `144:1051` and their iPhone counterparts match, without the deferred rows. Validation rejects min ≥ max. **(live)** Saving thresholds changes the status view.

**Verify:** Jest, Playwright, Maestro.

### T13: Web visual and E2E harness

**Owns:** `e2e/web/**`, `design/figma/**`, `scripts/export-figma.md`.

**Work:**
- Playwright projects:
  - `figma-1440` (1440×1024)
  - `mbp-1512` (1512×982 @2x)
  - `fhd-1920` (1920×1080)
  - `web-narrow` (402×874)
- Test setup: serve `expo export -p web` with `npx expo serve`, fixtures mode, `page.clock.install` at Figma time (Nov 6, 2026 14:32), animations off.
- `toHaveScreenshot` baselines.
- `figma-diff.ts` compares against Figma exports at **all three desktop sizes**, as soon as the designer's frames exist. Advisory threshold of 8% to start.

**Accept:** CI runs it on every PR and attaches the diff report. A deliberate token change fails the snapshots.

**Verify:** CI artifacts.

### T14: iOS pipeline and web deploy

**Owns:** `.maestro/**`, `.eas/workflows/e2e-ios.yml`, `.eas/workflows/deploy-web.yml`, `assets/images/**`.

**Work:** Maestro flows on an iPhone 17 Pro simulator (iOS 27); EAS `e2e-test` build + Maestro job; `eas deploy` previews on PRs and `--prod` on main; icon, splash and launch screen.

**Accept:** `maestro test .maestro` passes on fixtures. A web preview URL is posted per PR. A preview build is in TestFlight.

**Verify:** Workflow logs; App Store Connect.

---

## 7. Things the user must do by hand

1. **Expo account:** `npx eas-cli login` (Expo Go also needs a login) and `eas init`.
2. **Apple Developer Program:** enroll ($99/yr). App Store Connect app record (or let `eas submit` create it). Add yourself as an internal TestFlight tester.
3. **Xcode:** install **27.1** with the iOS 27 simulator. Optionally install Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`).
4. **iPhone:** enable Developer Mode and register it with `eas device:create` for internal builds.
5. **Supabase values:** from the gateway setup, get the project URL and the **publishable** key. Put them in `.env.local` and in EAS env vars (`eas env:create`). Never use a secret key in this repo.
6. **Owner account:** the gateway setup creates it. Keep its email and password for sign-in, and for local live tests a test owner on the local stack.
7. **Figma exports:** export the v1 frames at 1440, 1512 and 1920 (when the designer finishes) and at 402×874 as 1× PNGs into `design/figma/`, or give a worker Figma access.
8. **GitHub:** `gh` must be able to read `olvar-gh/olvar-gateway` for the type sync.

---

## 8. Risks

- **Designer frames are still in progress.** Desktop spacing at 1512/1920 may shift after implementation. Mitigation: everything is token-driven, and T13 re-baselines.
- **Figma shows deferred elements** (plant switcher, bell, Log care, insights, health score). Building from the 1440 frames requires removing them consistently (§2.1.1). The designer's new frames should reflect v1.
- **Expo Router SDK 58 core rework and newly stable native tabs.** Pin patch versions and keep the shell isolated.
- **Liquid Glass pitfalls** (opacity animation, on-demand mounting). Glass is iOS 26+ only.
- **60 s cadence makes calibration slow** (about 3 minutes to reach "stable" per step). The UI must explain the wait.
- **Figma fidelity on web:** font rasterization differs, which is why the diff is advisory.
- **`deepseek-flash` is an alias** that moves to newer models silently. The gateway should log the model per message.

---

## 9. Open questions for the user

1. **Home bottom-right card:** Figma's "Recent insights" (and the health score, "Water in ~2 days" and Log care) are not in v1. The plan uses a "Today at a glance" card until the designer's 1920/1512 frames show what v1 Home should contain. Please confirm, or have the designer decide in those frames.

All other earlier questions are resolved by decisions A–H or by a choice in this plan:
- Hosting: `*.expo.app` URL.
- Create account and forgot password: deferred, with signups disabled.
- Care targets: editable in Settings, as the Settings v1 scope.
