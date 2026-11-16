# olvar-dashboard — Project plan

Status: research and planning only (Nov 16, 2026). No product code yet.
Scope of this repo: the Expo app that serves **desktop web** and **native iOS** from one codebase, reading Supabase data produced by `olvar-gateway`.

---

## 1. Summary

- **Stack:** Expo **SDK 58** (React Native **0.88**, React **19.3**, react-native-web 0.21), Expo Router, TypeScript (strict). SDK 58 is built for iOS 27 and needs Xcode ≥ 26.4. EAS builds on SDK 58 use Xcode 27.1.
- **One codebase, two layouts.** Desktop web uses a sidebar shell, matching Figma's 1440×1024 frames. iOS uses system **native tabs**, which get Liquid Glass automatically, matching Figma's 402×874 frames. The split is done with Expo Router platform files (`AppShell.tsx` / `AppShell.web.tsx`). Screens, data hooks, charts and tokens are shared.
- **Styling:** React Native `StyleSheet`, plus typed design tokens copied from the Figma variables and a small `useBreakpoint` hook. No Tailwind or Unistyles in v1.
- **Charts:** our own SVG chart components built on `react-native-svg` + `d3-scale`/`d3-shape`. The same code runs on web and iOS. Skia is not used, because it costs about 2.9 MB gzipped of WASM on web.
- **Data:** `@supabase/supabase-js` with the **publishable key** and Supabase Auth user sessions. TanStack Query v5 handles caching, and Realtime `postgres_changes` provides live updates. Generated DB types come from `olvar-gateway` and are synced into this repo as a pinned copy.
- **Avatar:** DeepSeek (`deepseek-flash`) writes **text only**: a short first-person message, advice, and chat replies. Mood and health score are **deterministic**, computed server-side from the readings and the care targets. The dashboard renders the avatar from `avatar_states` as an SVG plant glyph, a mood pill, a speech bubble and a health bar, exactly as drawn in Figma.
- **Big finding:** the Figma design covers **far more than the provisional contract**: auth, several plants, device pairing, soil calibration, care targets, a care log, chat with the plant, personalities, insights, notifications, search and CSV export. This requires the contract changes in §4. The gateway planner owns the schema and Edge Functions.
- **Ship targets:** web on **EAS Hosting** (`eas deploy`), with Vercel as the alternative if a free custom domain matters. iOS via **EAS Build → TestFlight**, which requires the Apple Developer Program at $99/yr.

---

## 2. Research findings (with sources)

### 2.1 Figma (read directly: file `ZMGAYBFUZjGsECpL54uEJg`, page `0:1`)

I had Figma access, so the screen list, components and tokens below come from the file itself, not from guesses.

**Frame sizes.** Desktop frames are **1440×1024**. iPhone frames are **402×874** (iPhone 17 Pro class). There are **no frames at 1920×1080 or 1512×982**; see §5.4 and the open questions.

**Screens.** Node IDs are listed so workers can pull `get_design_context` / `get_screenshot`.

| # | Section | Desktop frame(s) | iPhone frame(s) |
|---|---|---|---|
| 01 | Sign in | `133:1175` | `134:3297` |
| 02 | Create account | `142:686` | `147:1598` |
| 03 | Forgot password | `142:723` | `147:1677` |
| 04 | Pair device | `144:832` | `147:1732` |
| 05 | No plants yet | `142:752` | `147:1969` |
| 06 | Add plant | `132:947` | `134:479` |
| 07 | Soil calibration (modal) | `132:1590` | `134:2509` |
| 08 | Care targets | (inside Settings `44:193`, `51:479`) | `134:2032`, `149:2525` light, `149:2651` temp, `149:2777` humidity |
| 09 | Home | `1:8`, `11:11` plant switcher, `133:479` notifications open | `18:154`, `20:55` full scroll, `41:170` plant menu |
| 10 | Plants | `132:479` | `148:2251` |
| 11 | Sensors | `34:128`, `145:1322` sensor offline | `35:128`, `35:495`, `148:2056` offline, `155:3043` Export data |
| 12 | Timeline | `27:44` | `30:44`, `30:462`, `155:3215` Upcoming care, `155:3377` Filter |
| 13 | Log care | `132:1271` | `134:1298` |
| 14 | Chat | `32:86` | `33:86`, `33:391`, `148:2507` conversations |
| 15 | Personality | `154:2728` | `134:2931` |
| 16 | Notifications | `145:1526` | `134:924` |
| 17 | Search | `133:807` | `148:2370` |
| 18 | Settings | `44:193`, `51:479` preset off, `131:479` chat/notifications/account | `45:193`, `45:606`, `50:463`, `155:3506` Devices |
| 19 | Plant profile / remove | `154:2917`, `145:1166` | `134:1710`, `148:1942` |
| 20 | Account / edit profile | `144:1051` | `147:1862` |

The **References** section (`150:2748`) holds example dashboards for inspiration only; it is not a spec.

**Components** (section `138:622`):
- **36 line icons**: home, activity, clock, chat, leaf, chevRight/Left/Down, bell, plus, droplet, sun, thermo, droplets, alert, sliders, check, gear, search, settings, user, wifi, cpu, lock, info, sprout, target, camera, calendar, arrow, sparkle, updown, mail, trash, refresh, wifiOff.
- **Desktop:** Button, Field, Notice, List row, Card, Modal, Sidebar, Page header, Settings nav, Auth brand panel, Logo/Olvar mark.
- **iPhone:** Glass button (described as "Liquid Glass circular toolbar button 50×50"), Nav bar ("Liquid Glass back button + Large Title"), Section header/footer, List section, List row, Button, Tab bar, Brand header, Alert, Search field, Range card.

**Design tokens** (Figma variables, read with `get_variable_defs` on Home):

```
bg/canvas #fafaf7   bg/sidebar #f3f3ee   surface/card #ffffff   border/subtle #e6e6df
text/primary #1e2219  text/secondary #646a5c  text/tertiary #9a9f92
brand/olive #3b4630  brand/sage #7d8a64  brand/sage-tint #eef1e7
status/good #4e9a44  status/warn #d99a2b  status/live #c7fd56
data/water #4a90c8 (tint #eaf3fa)  data/light #e2a82b (tint #fdf5e1)
data/temp #e07a4f  data/humidity #5fa3a8 (tint #e6f2f2)
```

**Typography:**
- Desktop page titles: **Fraunces SemiBold 30**, with variable axes `SOFT 0, WONK 1`.
- Body text: **Inter** (Regular 14, Medium 13, SemiBold 15).
- iOS large title: **Inter Bold 34/41, tracking 0.4** (text style "Olvar iOS/Large Title/Emphasized"). iOS uses Inter, not SF Pro.

**Data the design implies.**
- Home: health score ("86 / 100 Thriving"), mood pill ("Feeling great"), "Sparks says" message, "Water in ~2 days", "6.2 h of good light today", min/avg/max values, "Recent insights", today's timeline with care events.
- Footer: gateway presence ("olvar-gateway · 12s ago").
- Sensors: per-sensor metadata ("GPIO34 · raw 1,980 · calibrated Nov 5", "I²C 0x23", "CRC OK") and ranges of 24 h / 7 d / 30 d.
- Chat answers cite "Based on readings from 14:28".

**Design copy that contradicts the hardware or contract:**
- "updated every 10 seconds" / "uploads every 10 s" (the contract says 60 s).
- "Raspberry Pi 4" (the hardware is a Pi 3B).
- "ESP32-32D · USB serial to gateway" (the contract says Wi-Fi + MQTT).

These are listed as open questions.

### 2.2 Expo / React Native / iOS 27

- Expo SDK 58 was released Oct 15, 2026. It ships RN 0.88, is "built for iOS 27", uses the scene-based life cycle, and makes iPhone apps resizable on iOS 27. `expo-glass-effect` reports Liquid Glass as available when built with the iOS 27 SDK. — https://expo.dev/changelog/sdk-58
- Version table:
  - SDK 58 → RN 0.88, React 19.3.0, RNW 0.21.0, Node ≥ 22.13.
  - iOS 16.4+, **Xcode 26.4+**.
  - Source: https://docs.expo.dev/versions/latest
- EAS `sdk-58`/`latest` iOS images use **Xcode 27.1**. The Strict TypeScript API is now the default. — https://expo.dev/blog/how-to-upgrade-to-sdk-58
- Expo Go for SDK 58 has been on the App Store since Oct 22 (v58.0.5). Logging in is now required to run projects in Expo Go.
  - https://apps.apple.com/us/app/expo-go/id982107779
  - https://expo.dev/changelog
- Expo Router's navigation core was reworked in SDK 58 and no longer carries most of the forked React Navigation API. — https://expo.dev/changelog/sdk-58
- **Native tabs** are now `expo-router/native-tabs`; before SDK 58 they were `unstable-native-tabs`.
  - On iOS 26+ the system draws the tab bar with Liquid Glass, and the background props have no effect.
  - The docs recommend `_layout.web.tsx` or `app-tabs.web.tsx` with headless `expo-router/ui` tabs for a custom web layout.
  - `preferredPlacement` (sidebar vs tab bar) applies on iOS 27 and needs Xcode 27.
  - Sources: https://docs.expo.dev/router/advanced/native-tabs, https://docs.expo.dev/versions/latest/sdk/router/native-tabs
- Platform-specific route files must have a non-platform counterpart. — https://docs.expo.dev/router/advanced/platform-specific-modules
- **expo-glass-effect** (`GlassView`, `GlassContainer`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`):
  - iOS 26+ only. On other platforms it falls back to a plain `View`.
  - Included in Expo Go.
  - https://docs.expo.dev/versions/latest/sdk/glass-effect
- **Expo UI / SwiftUI** (`@expo/ui/swift-ui`):
  - Has a `glassEffect` modifier, which needs Xcode 26+ / iOS 26+.
  - Included in Expo Go.
  - There is also a "Universal" set that runs on web.
  - https://docs.expo.dev/versions/latest/sdk/ui/swift-ui, https://docs.expo.dev/versions/latest/sdk/ui
- Practical guidance:
  - Use system controls (native tabs, switches) to get Liquid Glass for free, and use `GlassView` only for custom surfaces.
  - Glass renders blank if you animate its opacity or mount it on demand over other glass.
  - Source: https://opointo.com/docs/guides/liquid-glass-react-native (third party, Oct 2026)
- iOS 27: `UIRequiresFullScreen` no longer prevents resizing, and a launch screen is required for App Store submission. — https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- Web fallback for glass: CSS `backdrop-filter` has been Baseline (newly available) since Sep 2024, with about 97% global support.
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
  - https://caniuse.com/css-backdrop-filter
- Variable fonts:
  - Supported on iOS/Android from SDK 58.
  - RN 0.88 adds the `fontVariationSettings` style prop, which can set custom axes such as Fraunces `WONK`.
  - iOS otherwise only picks named instances.
  - Sources: https://docs.expo.dev/develop/user-interface/fonts/, https://expo.dev/changelog/sdk-58
- `@expo-google-fonts/*`: the `useFonts` hook works on web and in Expo Go. The config plugin needs a dev build and does not work on web. — https://github.com/expo/google-fonts
- Web output modes:
  - `single` (SPA), `static`, `server`.
  - The SDK 58 templates default to `server`.
  - `single` needs SPA rewrites on static hosts.
  - Source: https://docs.expo.dev/guides/publishing-websites

### 2.3 Styling options

- NativeWind:
  - The stable line is **4.2.7**, which is Tailwind v3-era and supports SDK 57.
  - **v5 (Tailwind v4) is still a release candidate** ("not intended for production"), tested against Expo 57.
  - Sources: https://www.nativewind.dev/docs/getting-started/installation, https://www.nativewind.dev/v5, https://www.nativewind.dev/v5/getting-started/installation
- Unistyles 3:
  - Needs RN 0.85+, the New Architecture and Nitro modules.
  - **Not supported in Expo Go**.
  - Has its own SSR setup for Router web.
  - Sources: https://unistyl.es/v3/start/getting-started, https://unistyl.es/v3/guides/expo-router
- Expo's own guidance: standard Tailwind is web-only, and NativeWind or Uniwind is needed for iOS. — https://docs.expo.dev/guides/tailwind
- Ecosystem summary (Oct 2026): Uniwind is the stable Tailwind-v4 RN option, but its Pro tier is paid; NativeWind v5 is still RC. — https://heart-it.github.io/react-brain/entries/styling (third party)

### 2.4 Charts

- React Native Skia on web loads CanvasKit WASM, **2.9 MB gzipped**. The bundle grows by +6 MB on iOS and +2.9 MB on web.
  - https://shopify.github.io/react-native-skia/docs/getting-started/web
  - https://shopify.github.io/react-native-skia/docs/getting-started/installation
- Victory Native XL:
  - Requires Skia 2.15.1+, Reanimated 4.1.7+, Worklets and Gesture Handler.
  - The README documents no web target.
  - https://github.com/FormidableLabs/victory-native-xl, https://commerce.nearform.com/open-source/victory-native/docs
- react-native-gifted-charts:
  - Renders through SVG.
  - Its web counterpart is a **separate** package, `react-gifted-charts`.
  - https://www.npmjs.com/package/react-native-gifted-charts
- `react-native-svg` supports Android, iOS, **web** and Expo Go. The recommended version for SDK 58 is 15.16.0. — https://docs.expo.dev/versions/latest/sdk/svg/

### 2.5 Supabase

- Keys:
  - Use the **publishable key** (`sb_publishable_…`) in shipped apps and secret keys only on servers.
  - Legacy `anon`/`service_role` keys are being deprecated by the end of 2026.
  - Publishable key + signed-in user → Postgres role `authenticated`.
  - https://supabase.com/docs/guides/getting-started/api-keys
- Expo setup:
  - `expo-sqlite/localStorage/install` provides session storage.
  - Env names are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - `detectSessionInUrl: false` on native.
  - https://docs.expo.dev/guides/using-supabase, https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Realtime Postgres Changes:
  - Tables must be in the `supabase_realtime` publication.
  - RLS is checked per subscriber per event.
  - DELETE events are not RLS-filtered.
  - https://supabase.com/docs/guides/realtime/postgres-changes
- Broadcast:
  - Can be sent from the DB (`realtime.send`), REST or clients.
  - Private channels are authorized with RLS on `realtime.messages`.
  - https://supabase.com/docs/guides/realtime/broadcast, https://supabase.com/docs/guides/realtime/authorization
- Type generation:
  - `supabase gen types typescript --remote=<ref>` (v3 flags; `--project-id`/`--linked` are deprecated).
  - Pass the result to `createClient<Database>()`.
  - https://supabase.com/docs/reference/cli/supabase-gen, https://supabase.com/docs/guides/api/rest/generating-types
- Edge Functions:
  - `@supabase/server` `withSupabase({auth:'user'|'secret'|…})`.
  - pg_cron + pg_net can schedule them with the secret key, stored in Vault.
  - https://supabase.com/docs/guides/functions/auth, https://supabase.com/docs/guides/functions/schedule-functions, https://supabase.com/docs/guides/cron
- TanStack Query React is at **v5** (5.107.x, Nov 6, 2026). — https://github.com/TanStack/query/releases

### 2.6 DeepSeek

- The model id is **`deepseek-flash`** (DeepSeek-V4.1-Flash-1017, updated Oct 17, 2026).
  - Legacy `deepseek-v4-flash` names are routed to it.
  - Supports JSON Output and thinking / non-thinking modes, with thinking as the default.
  - https://api-docs.deepseek.com/, https://api-docs.deepseek.com/updates
- Pricing per 1M tokens:
  - Off-peak: $0.15 input (cache miss), $0.003 (cache hit), $0.60 output.
  - Peak (01–04 and 06–10 UTC on weekdays) is double.
  - Source: https://api-docs.deepseek.com/quick_start/pricing/
- Cost estimate: one avatar refresh is about 1.5k input + 300 output tokens ≈ $0.0005. Hourly refreshes cost about $0.40/month, so cost is negligible.
- Implication for the avatar: DeepSeek is a text model. Flash accepts images as input, but it **does not generate images**. The "avatar" is therefore text + a structured mood, rendered with our own art.

### 2.7 Hosting, distribution, testing

- EAS Hosting:
  - Free tier: 100k requests/month and 1 GB storage.
  - **Custom domain only on paid plans** (from $19/mo).
  - Runs on the Cloudflare Workers runtime.
  - https://expo.dev/pricing, https://docs.expo.dev/eas/hosting/introduction
- Vercel: works with `expo export -p web` plus SPA rewrites in `vercel.json`. — https://docs.expo.dev/guides/publishing-websites
- EAS free plan: 15 iOS builds/month, low-priority queue (waits of 90+ min at peak), and 60 min of Workflows. — https://expo.dev/pricing
- The Apple Developer Program costs **$99/yr** and is needed for TestFlight.
  - https://developer.apple.com/programs
  - https://developer.apple.com/help/account/membership/program-enrollment
- Testing tools:
  - `jest-expo` preset + React Native Testing Library: https://docs.expo.dev/develop/unit-testing
  - Maestro flows on iOS Simulator builds, locally or as an EAS Workflows `maestro` job (alpha): https://docs.expo.dev/eas/workflows/examples/e2e-tests, https://expo.dev/articles/testing-and-previewing/mobile-app-testing

---

## 3. Decisions and alternatives rejected

| Topic | Decision | Rejected and why |
|---|---|---|
| Framework | **Expo SDK 58**, RN 0.88, New Architecture, Hermes v1 | SDK 57: can only build with Xcode 27 through an opt-in scene flag, and has no `preferredPlacement`. |
| One codebase? | **Yes.** Shared screens/data/charts. Two shells: `AppShell.tsx` (NativeTabs) and `AppShell.web.tsx` (Sidebar built on `expo-router/ui` headless Tabs). Desktop-specific compositions live in `*.web.tsx` only where the layouts really differ (Home grid, Settings two-pane). | Separate Next.js web app: duplicates the data layer and charts for no gain at this size. |
| Dev workflow | **Development build** (`npx expo run:ios` / EAS `development` profile) as the default. Expo Go works for most of it, since glass-effect, @expo/ui and native-tabs are all in Expo Go, but fonts via the config plugin need a dev build. | Expo Go only: blocks the font config plugin and any future native module. |
| Web output | **`single` (SPA)**. The whole app sits behind auth, so there is no SEO or static-render benefit, and it avoids hydration mismatches from width-based layouts. | `server` (the SDK 58 default): needs a server runtime for no benefit. `static`: hydration flashes with `useWindowDimensions`. |
| Styling | **`StyleSheet` + `src/theme/tokens.ts` (from Figma variables) + `useBreakpoint()`**. Few screens, an exact Figma match is wanted, and nothing extra goes in the Babel/Metro/native layer. | NativeWind 4 (Tailwind 3, legacy) and v5 (RC, not for production). Uniwind (adds an engine; Pro is paid). Unistyles 3 (Nitro native module, no Expo Go, extra SSR setup; worth revisiting if dark mode and many breakpoints arrive). Tamagui (heavy for this scope). |
| Liquid Glass (iOS) | System **NativeTabs** for the tab bar, which gets glass automatically. **`expo-glass-effect` `GlassView`** for the 50×50 glass buttons and the plant-switcher pill, gated by `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()`. Fallback is a translucent `surface/card` with a hairline border. | Hand-drawn glass tab bar: drifts from the system look. `@expo/ui` SwiftUI everywhere: no web parity, so keep it for later native-only polish. |
| Glass on web | `GlassButton.web.tsx` renders a DOM element with `backdrop-filter: blur(20px) saturate(180%)` and a translucent background. The desktop Figma uses flat cards, so glass only appears on the narrow-web (phone-width) layout. | Skia or WebGL blur: overkill. |
| Charts | **Custom SVG components** (`react-native-svg` + `d3-scale` + `d3-shape`): line/area with ideal band, step line, hourly bars, arc gauge, range bar, timeline strip, sparkline, health bar. These are exactly the shapes in Figma, and they draw identically on web and iOS. | Victory Native XL / Skia: +2.9 MB gzipped WASM on web plus async loading, and web isn't a documented target. gifted-charts: two packages (RN + React) and a hard-to-match look. Recharts: web only. |
| Data | **supabase-js + TanStack Query v5 + Realtime `postgres_changes`** with filters (`device_id=eq.…`, `plant_id=eq.…`). Realtime events are merged into the query cache; on reconnect the cache is invalidated. | Polling only: the design promises "Live". Broadcast-from-DB for everything: more server setup; reconsider only if there are many users. |
| Type sharing | The gateway **commits** `supabase/database.types.ts`, generated from its migrations. The dashboard keeps a **pinned copy** at `src/data/database.types.ts`, updated by `scripts/sync-types.sh <gateway-ref>` (uses `gh api`). CI checks the copy against the pinned ref. | Git submodule: friction with Metro and EAS. Private npm package: publishing overhead. Generating types from the remote DB in dashboard CI: needs a DB access token here. |
| Avatar | **The server decides mood and health** with deterministic rules over targets. **DeepSeek writes text only** (message, advice, chat), in JSON mode. The dashboard draws an **SVG plant glyph** with mood variants, a mood pill, a speech bubble and a health bar. | LLM-chosen health score: not reproducible, and novices need consistency. Generated images: DeepSeek can't generate them, and they would be slow and expensive. |
| Fonts | **Inter** (static weights 400/500/600/700) and **Fraunces variable TTF**, so `WONK 1, SOFT 0` can be set with `fontVariationSettings` on native and `font-variation-settings` on web. Native uses the expo-font config plugin; web uses the `useFonts` path. OFL font files are bundled in `assets/fonts`. | System fonts: don't match Figma. A static Fraunces instance: can't set WONK. |
| Icons | Export the 36 Figma line icons as SVG. Generate typed RN components (`@svgr/cli --native`) into `src/components/icons`. The iOS tab bar uses PNG template icons exported from the same SVGs, or SF Symbols (`house`, `waveform.path.ecg`, `clock`, `bubble.left`). | `@expo/vector-icons`: deprecated direction per SDK 56 notes, and doesn't match the design. |
| Web hosting | **EAS Hosting** (`eas deploy`, PR previews, same account as builds). | Vercel: equally good, and Hobby gives a free custom domain, so switch if a custom domain is wanted without paying Expo. |
| iOS distribution | **EAS Build → EAS Submit → TestFlight** (internal testers). | Ad-hoc only: needs the paid program anyway. Free Apple ID sideload: short-lived provisioning, and no TestFlight. |
| State / forms | TanStack Query for server state, React state for UI, `zod` for env and JSON validation. | Redux / Zustand: not needed. |

---

## 4. Contract changes

The provisional contract is fine for **transport** (items 1–3). The dashboard needs the following changes, **mostly because the Figma design is far larger than the contract assumed**. The gateway planner owns the schema, RLS and Edge Functions (contract item 4 stands). These are requirements from the dashboard side.

**C1. Supabase Auth and per-user RLS** (changes item 6).
- Figma has sign in, create account, forgot password and account screens, so the dashboard signs users in with **email + password**.
- RLS must grant `select` on `readings` and the other tables to `authenticated` users **who own the plant/device**, not to `anon`.
- Password reset needs redirect URLs for `olvar://reset-password` (iOS) and `https://<web-host>/reset-password` (web).

**C2. Ownership model and new tables** (extends item 3). The minimum the screens need:
- `profiles(id = auth.uid, display_name, created_at)`
- `gateways(id text pk, owner_id, name, last_seen_at, fw, ip)`
  - This is a heartbeat for "olvar-gateway · 12s ago".
- `devices(id text pk = device_id, owner_id null, gateway_id, fw, status 'online'|'offline', last_seen_at, rssi_dbm, sensor_health jsonb, soil_dry_raw int null, soil_wet_raw int null, calibrated_at)`
  - Status mirrors the retained MQTT status topic.
- `plants(id uuid, owner_id, name, species, location, added_on date, device_id text unique null, personality enum('cheerful','calm','witty','scientific') default 'cheerful', photo_path, archived_at)`
- `care_targets(plant_id, metric enum('soil_pct','lux','temperature_c','humidity_pct'), min, max, enabled bool, use_preset bool, pk(plant_id, metric))`
  - Figma presets: soil 35–60 %, light 500–1,500 lux, temp 18–27 °C, humidity 40–70 %. These are design values; the gateway planner should check them against care sources.
- `care_events(id, plant_id, kind enum('water','fertilize','mist','repot','move','note'), amount_ml int null, note, occurred_at, created_by)`
  - The dashboard **inserts** these ("Log care").
- `insights(id, plant_id, created_at, metric, title, body, severity)`
  - Written by a server job.
- `notifications(id, user_id, plant_id, created_at, kind, title, body, read_at)`
  - The dashboard updates `read_at`.
- `chat_threads(id, plant_id, user_id, title, created_at, updated_at)`
- `chat_messages(id, thread_id, role 'user'|'assistant', content, reading_snapshot jsonb, created_at)`
- The `supabase_realtime` publication must include: `readings`, `avatar_states`, `care_events`, `devices`, `gateways`, `notifications`, `chat_messages`.

**C3. `avatar_states` is keyed by plant, with a fixed shape** (refines item 5). Personality and care targets belong to the plant, not the device.

```
avatar_states(id, plant_id, created_at, based_on_reading_at,
  mood enum('thriving','content','thirsty','soggy','too_dark','too_bright','too_hot','too_cold','dry_air','offline'),
  mood_label text,            -- e.g. "Feeling great"
  health_score int 0..100,    -- deterministic, server-computed
  health_label text,          -- e.g. "Thriving"
  message text (<=160 chars), -- DeepSeek, first person, in the plant's personality
  advice jsonb,               -- [{metric, text}]  DeepSeek, validated
  next_water_at timestamptz null, -- deterministic soil-slope estimate
  personality text, model text)
```

The dashboard reads the latest row per plant.

**C4. Chat requires an Edge Function** (refines item 5).
- Chat is interactive, and the Pi is not reachable from the internet, so it must be a **Supabase Edge Function `chat`**:
  - `auth: 'user'`
  - Body: `{thread_id?, plant_id, message}`
  - It stores both messages and returns the assistant message with `reading_snapshot`.
  - The DeepSeek key is an Edge Function secret.
- I therefore recommend that the **avatar refresh also be an Edge Function** (`avatar-refresh`, `auth: 'secret'`, scheduled with pg_cron), so the prompt and personality code is shared with chat. The gateway planner makes the final call.
- The dashboard calls `supabase.functions.invoke('chat', …)` and never sees the DeepSeek key.

**C5. Soil calibration lives in the database, and the gateway computes `soil_pct`.**
- Figma's calibration wizard is in the dashboard and stores dry/wet raw values: `devices.soil_dry_raw/soil_wet_raw`.
- The gateway computes `soil_pct = clamp((dry − raw)/(dry − wet)·100)`.
- It writes **null** when the device is uncalibrated, which matches the firmware note that `soil_pct` is null until calibrated.
- An ESP32-sent `soil_pct` is ignored or overridden.
- `readings` must keep `soil_raw`, which the dashboard shows as "raw 1,980".

**C6. Nullable sensor columns.** I accept the firmware proposal that any reading field may be null. Charts render gaps.

**C7. Aggregation RPC for long ranges.**
- 30 days at 60 s is about 43k rows, too many for the client.
- Requested RPC: `readings_bucketed(p_device_id text, p_from timestamptz, p_to timestamptz, p_bucket interval)`.
  - Returns `(bucket_start, soil_pct_avg, lux_avg, lux_max, temperature_c_min/avg/max, humidity_pct_min/avg/max, soil_raw_avg)`.
  - `security invoker`, so RLS applies.
- The 24 h view reads raw rows.

**C8. Device pairing.**
- A browser cannot scan the LAN, so the Figma "searching on olvar-gateway's network" list has to come from the DB:
  - The gateway upserts newly seen device_ids as `devices(owner_id = null)`.
  - A `security definer` RPC `claim_device(p_device_id text, p_pairing_code text)` sets `owner_id = auth.uid()`.
- How pairing codes are generated or printed is a gateway/firmware decision.
- v1 fallback: the gateway is configured with the owner's user id and claims its devices itself; the dashboard's Pair screen then only lists devices.

**C9. Shared types artifact.** The gateway commits `supabase/database.types.ts`, generated in its CI from migrations, and tags releases. The dashboard syncs a pinned ref (§3).

**C10. Telemetry interval: open question, no change proposed yet.**
- Figma says "updated every 10 seconds"; the contract says 60 s.
- Recommendation: keep **60 s inserts**, and change the design copy to "every minute".
- The live raw reading in the calibration modal ("Stable for 4 s") would need a faster stream. As a **phase-2 addition**:
  - Command topic `olvar/v1/<device_id>/cmd` with `{"cmd":"stream","interval_ms":1000,"duration_s":120}`.
  - The gateway relays samples over a private Realtime Broadcast channel `device:<device_id>:live`, without storing them.
- v1 calibration instead waits for the next normal reading.

---

## 5. Architecture and folder layout

### 5.1 Runtime picture

```
            ┌──────────── Supabase (owned by olvar-gateway/supabase) ─────────────┐
 ESP32 ─MQTT→ Pi gateway ─secret key→ Postgres (readings, devices, plants, …)      │
            │   Edge Functions: chat (user JWT), avatar-refresh (cron, secret)   │──→ DeepSeek (deepseek-flash)
            └───────────▲───────────────────────────────▲────────────────────────┘
                        │ publishable key + user JWT     │ Realtime (postgres_changes)
              ┌─────────┴──────────────── olvar-dashboard (this repo) ───────────┐
              │ Expo Router app  ──  web (SPA, EAS Hosting)  /  iOS (EAS → TestFlight) │
              └────────────────────────────────────────────────────────────────────┘
```

### 5.2 Navigation

- **Route groups:**
  - `(auth)`: sign-in, create-account, forgot-password, reset-password.
  - `(app)`: gated by session. With no plants it redirects to `/plants/new`, the empty state in Figma §05.
- **iOS** (`AppShell.tsx`):
  - `NativeTabs` with **Home · Sensors · Timeline · Chat**, matching the Figma iPhone tab bar.
  - Settings, Plants, Notifications and Search are pushed from the header glass buttons (bell, +, plant menu).
  - Log care, Calibrate, Export and Filter are modals (`presentation: 'formSheet'`).
  - Set `minimizeBehavior="onScrollDown"`.
- **Web** (`AppShell.web.tsx`):
  - A sidebar from Figma `140:901` with plant switcher, ⌘K search, Home/Sensors/Timeline/Chat, gateway status footer and settings gear.
  - The `TabSlot` holds the content.
  - Settings is a two-pane page with Settings nav `140:1180`.
- **Narrow web** (< 768 px) reuses the phone compositions with a bottom bar.

### 5.3 Folder layout

Each task owns the paths listed in §6.

```
olvar-dashboard/
├─ app.json · eas.json · package.json · tsconfig.json · babel/metro defaults (template)
├─ .env.example                      # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_DATA_SOURCE
├─ assets/fonts/                     # Inter-*.ttf, Fraunces[SOFT,WONK,opsz,wght].ttf (OFL)
├─ assets/images/                    # app icon, splash, tab PNGs
├─ design/
│  ├─ tokens.json                    # exported Figma variables (source for tokens.ts test)
│  └─ figma/*.png                    # reference exports: desktop 1440×1024, iPhone 402×874
├─ src/
│  ├─ app/                           # Expo Router routes
│  │  ├─ _layout.tsx                 # providers: fonts, QueryClient, Auth, SafeArea
│  │  ├─ (auth)/_layout.tsx, sign-in.tsx, create-account.tsx, forgot-password.tsx, reset-password.tsx
│  │  ├─ (app)/_layout.tsx           # session gate + <AppShell/>
│  │  ├─ (app)/index.tsx             # Home
│  │  ├─ (app)/sensors/index.tsx, sensors/export.tsx
│  │  ├─ (app)/timeline/index.tsx, timeline/log-care.tsx, timeline/upcoming.tsx, timeline/filter.tsx
│  │  ├─ (app)/chat/index.tsx, chat/[threadId].tsx, chat/history.tsx
│  │  ├─ (app)/plants/index.tsx, plants/new.tsx, plants/[plantId].tsx
│  │  ├─ (app)/notifications.tsx, (app)/search.tsx
│  │  ├─ (app)/settings/_layout.tsx (+ _layout.web.tsx two-pane), index.tsx, care-targets.tsx,
│  │  │     personality.tsx, devices.tsx, pair.tsx, calibrate.tsx, notifications.tsx, account.tsx
│  │  └─ (dev)/gallery.tsx           # component + chart gallery (dev only; used by visual tests)
│  ├─ components/
│  │  ├─ shell/   AppShell.tsx, AppShell.web.tsx, Sidebar.tsx, PlantSwitcher.tsx, GatewayStatus.tsx
│  │  ├─ ui/      Button, Field, Notice, Card, ListRow, Modal, PageHeader, NavBar, SectionHeader,
│  │  │           SectionFooter, SearchField, Alert, Toggle, Segmented, GlassButton(.tsx/.web.tsx)
│  │  ├─ icons/   generated from Figma SVGs + index.ts
│  │  ├─ charts/  scales.ts, LineArea.tsx, StepLine.tsx, HourBars.tsx, Gauge.tsx, RangeBar.tsx,
│  │  │           Sparkline.tsx, TimelineStrip.tsx, HealthBar.tsx
│  │  └─ avatar/  PlantAvatar.tsx, glyphs.ts, MoodPill.tsx, SpeechBubble.tsx
│  ├─ features/   home/, sensors/, timeline/, chat/, plants/, settings/, auth/, notifications/, search/
│  ├─ data/
│  │  ├─ supabase.ts                 # createClient<Database>, platform storage
│  │  ├─ database.types.ts           # synced from olvar-gateway (do not edit)
│  │  ├─ source/  index.ts (DataSource interface), supabase.ts, fixtures.ts
│  │  ├─ fixtures/ generate.ts (seeded 30-day peace-lily series, events, avatar, chat)
│  │  ├─ queries/ readings.ts, plants.ts, avatar.ts, care.ts, insights.ts, notifications.ts, chat.ts, devices.ts
│  │  └─ realtime.ts                 # subscribe + cache merge
│  ├─ domain/     targets.ts (presets, status eval), format.ts, time.ts, light.ts (good-light hours)
│  └─ theme/      tokens.ts, typography.ts, fonts.ts, breakpoints.ts, useBreakpoint.ts
├─ e2e/web/       *.spec.ts, playwright.config.ts, figma-diff.ts
├─ .maestro/      home.yaml, log-care.yaml, chat.yaml
├─ .eas/workflows/ ci.yml, deploy-web.yml, e2e-ios.yml
├─ scripts/       sync-types.sh, export-figma.md (how to refresh design/figma)
└─ docs/PLAN.md
```

### 5.4 Responsive strategy

**Breakpoints** (from window width, via `useWindowDimensions`):

| Range | Layout |
|---|---|
| `compact` < 768 | Phone layout (iOS, narrow web) |
| `medium` 768–1279 | Sidebar collapses to a 72 px icon rail; Home grid becomes 2 columns |
| `wide` 1280–1679 | Figma desktop layout |
| `xwide` ≥ 1680 | Same layout, wider |

**Desktop layout rules** (no fixed page heights):
- Sidebar is a fixed **248 px**.
- Main padding is 32 px.
- Content width is fluid and capped at **1560 px**, left-aligned next to the sidebar. Proposed; the designer should confirm.
- Home grid:
  - Plant card: 1 column × 2 rows.
  - Sensor cards: 2×2.
  - Bottom row: timeline + insights.
  - Columns use flex percentages with 24 px gaps.
- Charts are measured with `onLayout` and redraw at any width, so cards widen at 1920.
- Heights follow content. At **1512×982** (MacBook Pro 14" default scaled resolution, DPR 2) Home scrolls by about 40 px. At **1920×1080** (DPR 1) it fits with spare room.

**iOS differences:**
- Single column, large titles, glass header buttons, native tab bar.
- Sensors become a 2×2 mini-card grid on Home (Figma `20:55`).
- Settings is a grouped list instead of two panes.
- iOS 27 makes iPhone apps resizable, so phone screens must also be width-fluid (the same breakpoint hook).
- iPad is not targeted in v1.

---

## 6. Task breakdown (parallelizable, disjoint file ownership)

**Order.** **T0 first**. It installs every dependency, so later tasks never touch `package.json`. After T0, **T1–T5 run in parallel**; **T6–T12 run in parallel** once T1/T2/T4 have merged (or against their stubbed interfaces); **T13–T14 run in parallel** with T6–T12.

**Without hardware or a backend.** Every task can be built and tested with `EXPO_PUBLIC_DATA_SOURCE=fixtures`. Real-backend checks are marked "(live)" and use the gateway's local `supabase start` plus its seed or simulator.

### T0: Scaffold

**Owns:** `package.json`, lockfile, `app.json`, `eas.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `src/app/+not-found.tsx`, `.eas/workflows/ci.yml`, `jest.config.js`.

**Work:**
- `npx create-expo-app --template default@sdk-58`, then strip the demo content.
- Set `web.output: "single"`, `scheme: "olvar"`, iOS bundle id `dev.olvar.dashboard` (placeholder), `supportsTablet: false`.
- Configure the expo-font plugin.
- Install: `expo-router`, `react-native-svg`, `d3-scale`, `d3-shape`, `@supabase/supabase-js`, `expo-sqlite`, `@tanstack/react-query`, `expo-glass-effect`, `expo-font`, `expo-file-system`, `expo-sharing`, `zod`.
- Dev dependencies: `jest-expo`, `@testing-library/react-native`, `@playwright/test`, `pixelmatch`, `pngjs`, `@svgr/cli`.
- `eas.json` profiles: `development` (dev client), `preview` (internal), `production`, `e2e-test` (iOS simulator).

**Accept:** `npx expo-doctor` reports no issues. `npm test` and `npx tsc --noEmit` pass. `npx expo export -p web` succeeds. `npx expo run:ios` launches a blank app on an iOS simulator.

**Verify:** CI runs lint, typecheck, jest and web export on each PR.

### T1: Tokens, fonts, icons

**Owns:** `src/theme/**`, `assets/fonts/**`, `design/tokens.json`, `src/components/icons/**`.

**Work:**
- Copy all Figma variables and text styles (extract text styles via `get_design_context` on the components) into typed `tokens.ts` and `typography.ts`.
- Fonts: bundle Inter and the variable Fraunces. Fraunces titles use `fontVariationSettings: "'SOFT' 0, 'WONK' 1"`.
- Export the 36 SVG icons into generated components.

**Accept:**
- A jest test asserts `tokens.ts` equals `design/tokens.json`.
- The gallery shows Fraunces titles with the WONK "n/h" shapes on web and iOS.
- Icons render with `color` props.

**Verify:** Jest. Manual gallery check on web and the iOS simulator.

### T2: UI primitives

**Owns:** `src/components/ui/**`, `src/app/(dev)/gallery.tsx`.

**Work:**
- Implement every Figma component listed in §2.1 except Sidebar/Settings nav (T6) and Range card (T3).
- `GlassButton.tsx` uses `GlassView` with an availability check and a fallback.
- `GlassButton.web.tsx` uses `backdrop-filter`.

**Accept:**
- Each component has an RNTL test for props and states (disabled, error, selected).
- The gallery matches Figma component screenshots at 1× within the visual tolerance (T13).

**Verify:** Jest. Playwright gallery snapshot. iOS 26+ simulator shows real glass; an iOS 18 simulator shows the fallback.

### T3: Charts

**Owns:** `src/components/charts/**`.

**Work:**
- Pure SVG components fed by `{t, v}` series.
- Ideal band, null gaps, "Now" marker, axis ticks in local time.

**Accept:**
- Unit tests for scales, path generation with gaps, and bucketing edge cases (DST, empty series).
- Gallery renders every chart in Figma states: just watered (step), bright light bars, comfortable temperature, humidity gauge.

**Verify:** Jest and Playwright gallery snapshots. No Skia in the web bundle (check with `expo export` stats).

### T4: Data layer

**Owns:** `src/data/**`, `scripts/sync-types.sh`.

**Work:**
- A `DataSource` interface with Supabase and fixtures implementations.
- TanStack hooks per query.
- `realtime.ts` merges INSERTs into the cache with de-duplication by id and re-fetches on reconnect.
- Auth session storage: expo-sqlite localStorage on native, `window.localStorage` on web.
- Until the gateway types exist, use a hand-written `database.types.ts` that mirrors §4, clearly marked as provisional.

**Accept:**
- Fixture generator is deterministic for a given seed.
- Realtime merge unit tests (out-of-order, duplicate, reconnect).
- **(live)** Against a local Supabase: sign in, read readings and receive a Realtime insert within 2 s. A second user cannot read the first user's rows.

**Verify:** Jest, plus `e2e/web/live.spec.ts` (skipped unless `SUPABASE_LOCAL=1`).

### T5: Domain logic

**Owns:** `src/domain/**`.

**Work:**
- Peace-lily presets from Figma.
- Status evaluation, which produces the "Optimal · 35–60%", "Comfortable" and "Good" labels.
- Good-light hours.
- Number and relative-time formatting, in English for v1 (see open questions).

**Accept:** 100% branch coverage on `targets.ts`.

**Verify:** Jest.

### T6: Shell and auth

**Owns:** `src/app/_layout.tsx`, `src/app/(auth)/**`, `src/app/(app)/_layout.tsx`, `src/components/shell/**`, `src/features/auth/**`.

**Work:**
- Session gate.
- NativeTabs (4 tabs) on iOS and the Sidebar on web.
- Plant switcher.
- Gateway status footer, fed by `gateways.last_seen_at`.
- Sign in, create account and forgot/reset password, including deep links.

**Accept:**
- Unauthenticated users are redirected to sign-in.
- Routes deep-link on web (`/sensors` reload works).
- Tab bar shows Liquid Glass on an iOS 26+ simulator.
- Sign-in screens match Figma `133:1175` / `134:3297`.

**Verify:** RNTL for gate logic, Playwright auth flow on fixtures, Maestro `sign-in.yaml`.

### T7: Home and avatar

**Owns:** `src/app/(app)/index.tsx`, `src/features/home/**`, `src/components/avatar/**`.

**Work:**
- Desktop grid (`1:8`) and iPhone stack (`18:154`/`20:55`).
- `PlantAvatar` maps the `mood` enum to a glyph variant (droop, tint and accent per mood). Unknown moods fall back to `content`.
- `offline` is shown when the device has been offline for more than 3× the interval.

**Accept:** Figma-diff at 1440×1024 is under threshold. Snapshots at 1512×982 and 1920×1080 show no overflow or clipping. Realtime: a new fixture reading updates the cards without a reload.

**Verify:** Playwright + figma-diff, RNTL for avatar mapping, Maestro `home.yaml`.

### T8: Sensors and export

**Owns:** `src/app/(app)/sensors/**`, `src/features/sensors/**`.

**Work:**
- 24 h / 7 d / 30 d ranges (7 d and 30 d use `readings_bucketed`).
- Offline state (`145:1322`).
- CSV export: browser download on web; `expo-file-system` + `expo-sharing` share sheet on iOS (`155:3043`).

**Accept:** CSV columns equal the `readings` columns with ISO timestamps. Snapshots for both states.

**Verify:** Jest (CSV builder), Playwright, Maestro.

### T9: Timeline and care log

**Owns:** `src/app/(app)/timeline/**`, `src/features/timeline/**`.

**Work:**
- Day strip.
- Merged event list (care_events + insights + daily report).
- Log care modal (insert into `care_events`).
- Upcoming care (from `next_water_at`).
- Filter.

**Accept:** A logged event appears immediately (optimistic) and survives a reload **(live)**.

**Verify:** RNTL, Playwright, Maestro `log-care.yaml`.

### T10: Chat

**Owns:** `src/app/(app)/chat/**`, `src/features/chat/**`.

**Work:**
- Threads, messages, suggestion chips.
- Invoke the `chat` Edge Function.
- "Based on readings from …" footer.
- Context panel on desktop (`32:86`).
- Error and rate-limit states.

**Accept:** With fixtures, a canned assistant reply. **(live)** A round trip through the local Edge Function with a stubbed DeepSeek.

**Verify:** RNTL, Playwright, Maestro `chat.yaml`.

### T11: Plants and settings

**Owns:** `src/app/(app)/plants/**`, `src/app/(app)/settings/**`, `src/features/plants/**`, `src/features/settings/**`.

**Work:**
- Add, profile and remove plant.
- No-plants state.
- Care targets: preset toggle, sliders, per-metric enable.
- Personality, with a preview message.
- Devices list.
- Pair: list unclaimed devices and enter a code, which calls `claim_device`.
- Calibration wizard, which writes `soil_dry_raw/wet_raw`. v1 waits for the next reading.
- Notification preferences, account and edit profile.

**Accept:** All Settings frames (`44:193`, `51:479`, `131:479`, `144:832`, `132:1590`, `154:2728`, `144:1051`) and their iPhone counterparts snapshot-match. Validation: dry > wet, and min < max.

**Verify:** Jest (validators), Playwright, Maestro.

### T12: Notifications and search

**Owns:** `src/app/(app)/notifications.tsx`, `src/app/(app)/search.tsx`, `src/features/notifications/**`, `src/features/search/**`.

**Work:**
- In-app notification list with mark-read.
- Header bell badge (exported component consumed by T6 via props).
- ⌘K search over plants, settings, events and chat titles (client-side index).

**Accept:** ⌘K opens search on web. Unread count updates via Realtime.

**Verify:** RNTL, Playwright.

### T13: Web visual and E2E harness

**Owns:** `e2e/web/**`, `design/figma/**`, `scripts/export-figma.md`.

**Work:**
- Playwright projects:
  - `figma-1440` (1440×1024, DPR 1)
  - `mbp-1512` (1512×982, DPR 2)
  - `fhd-1920` (1920×1080, DPR 1)
  - `web-narrow` (402×874)
- Test setup:
  - Serve `expo export -p web` with `npx expo serve`.
  - Use fixtures mode.
  - Freeze time with `page.clock.install({ time: '2026-11-06T14:32:00' })`, matching the Figma "Fri, Nov 6, 14:32".
  - Disable animations.
- `toHaveScreenshot` baselines for all four projects.
- `figma-diff.ts` uses pixelmatch to compare `figma-1440` captures with `design/figma/*.png` and reports mismatch %. It is **advisory** (start with an 8% threshold), because font rasterization differs.

**Accept:** CI runs the suite on every PR and uploads the diff report as an artifact.

**Verify:** The suite fails on a deliberate one-token color change.

### T14: iOS pipeline and release

**Owns:** `.maestro/**`, `.eas/workflows/e2e-ios.yml`, `.eas/workflows/deploy-web.yml`, `assets/images/**`.

**Work:**
- Maestro flows run on an iPhone 17 Pro simulator (iOS 27).
- EAS Workflow: `e2e-test` build, then the Maestro job (alpha, optional).
- `deploy-web.yml`: `expo export -p web` + `eas deploy` (preview on PR, `--prod` on main).
- App icon, splash and launch screen (required on iOS 27).

**Accept:** `maestro test .maestro` passes locally on fixtures. A web preview URL is posted per PR. A `preview` build installs via TestFlight internal testing.

**Verify:** Workflow logs and the TestFlight build visible in App Store Connect.

### Hardware-free vs live summary

| | No hardware needed | Needs the real chain |
|---|---|---|
| Testing | Everything with fixtures; local Supabase + the gateway's simulator/seed for (live) tests | Calibration with a real probe; end-to-end latency ESP32 → screen |

---

## 7. Things the user must do by hand

1. **Expo account.** Run `npx eas-cli login`; Expo Go now also needs a login. Create the EAS project (`eas init`).
2. **Apple Developer Program.** Enroll ($99/yr) with an individual Apple Account. In App Store Connect, create the app record or let `eas submit` create it, and add yourself as an internal TestFlight tester.
3. **Xcode 27.1.** Install it with the iOS 27 simulator runtime (minimum for SDK 58 is 26.4, but iOS 27 features need 27). Accept the license, and install Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`) if you want local iOS E2E.
4. **iPhone for dev builds.** Enable Developer Mode on the iPhone and register it with `eas device:create` for internal-distribution builds.
5. **Supabase.** Get from the gateway owner the project URL and **publishable key**. Put them in `.env.local` and in EAS environment variables (`eas env:create`), never a secret key. Create your user account through the app's sign-up.
6. **Auth redirect URLs.** Add `olvar://reset-password` and the web URL in Supabase Auth settings.
7. **Figma exports.** Export the reference frames as PNG at 1× into `design/figma/`, or give a worker Figma access again. Ask the designer to confirm max content width and behaviour at 1920/1512 (§9).
8. **Hosting choice.** Accept an `*.expo.app` URL (EAS free), or pick a custom domain: EAS Starter at $19/mo, or Vercel Hobby (free).
9. **GitHub access.** Make sure `gh` can read `olvar-gh/olvar-gateway`, which the type sync uses.

---

## 8. Risks

- **Scope.** The Figma file has about 50 frames across 20 sections, while the contract describes a sensor feed plus an avatar. Without trimming, the dashboard is several times the planned work, and the gateway schema grows to match (§4).
- **Expo Router SDK 58 core rework and the newly stable native tabs.** These are fresh APIs that may have bugs. Mitigation: pin patch versions and keep the shell isolated in `components/shell`.
- **Liquid Glass gotchas.** Opacity animation or mounting on demand blanks the glass. Glass appears only on iOS 26+. Below that, users see the fallback.
- **Figma fidelity on web.** Inter and Fraunces rasterize differently in Chromium than in Figma, which is why the Figma diff is advisory.
- **Realtime at 60 s cadence** is cheap. Postgres Changes RLS checks run per subscriber per event, which is fine for one household.
- **DeepSeek.** Chat text and sensor data go to a third-party API. The model alias `deepseek-flash` moves to newer models silently, so log `model` in `avatar_states`.

---

## 9. Open questions for the user

1. **v1 scope.** Proposed MVP: auth, Home, Sensors, Timeline + Log care, Chat, Settings (plant profile, care targets, personality, devices, calibration), in-app notifications.
   - Defer: LAN pairing discovery, search, multi-plant management UI (the data model supports it), CSV export on iOS.
   - OK?
2. **Update rate.** The design says every 10 s; the contract says 60 s. Keep 60 s and change the copy?
3. **Design copy vs hardware.** Fix "Raspberry Pi 4" (it's a 3B) and "USB serial to gateway" (it's Wi-Fi/MQTT)?
4. **Desktop sizes.** Figma has only 1440×1024. Is a 1560 px max content width at 1920 right, or should the layout stretch fully? Can the designer add 1512 and 1920 frames?
5. **Avatar art.** Figma shows one plant glyph. May I derive mood variants (droop/tint), or will the designer supply them?
6. **Push notifications** to iOS (APNs + expo-notifications + server sender): in v1, or in-app only?
7. **Dark mode and language.** Figma is light-only and English. Korean UI? Dark mode later?
8. **Hosting domain.** Is a free `*.expo.app` URL fine?
9. **Data residency.** OK to send plant data and chat text to DeepSeek's API?
10. **Pairing.** Is a printed pairing code acceptable, or is "gateway auto-claims for its configured owner" enough for v1 (one household)?
