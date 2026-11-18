# Web E2E and visual tests

Playwright runs against the **fixtures** web build (no network, no keys). The config exports the build,
serves it with `e2e/web/serve-spa.mjs` on `WEB_PORT` (default 8099), and runs these projects:

| Project | Viewport | Used for |
|---|---|---|
| `fhd-1920` | 1920×1080, DPR 1 | Figma comparison, full-page baselines |
| `mbp-1512` | 1512×982, DPR 2 (captured at `scale: 'css'`, so 1512×982) | Figma comparison, full-page baselines |
| `layout-1000`, `layout-2560` | | layout checks only |
| `web-narrow` | 402×874 | phone layout on the web |

## Commands

```bash
npm run test:e2e              # everything (exports the fixtures build first)
npm run test:visual           # the visual suite at 1920 and 1512
npm run test:visual:update    # re-record the full-page baselines after an intended UI change
npm run test:live             # live checks against the gateway's local Supabase stack (see below)
```

To reuse a build you already serve, set `PLAYWRIGHT_BASE_URL`:

```bash
EXPO_PUBLIC_DATA_SOURCE=fixtures npx expo export -p web
node e2e/web/serve-spa.mjs dist 8171 &
PLAYWRIGHT_BASE_URL=http://localhost:8171 npm run test:visual
```

## Visual suite (`e2e/web/visual.spec.ts`)

Each of the 8 v1 screens (Sign in, Home, Sensors, Timeline, Chat, Soil calibration, Settings, Account)
is opened on the fixtures with the clock fixed to the Figma frames' time (Home Fri Nov 6 14:32 Seoul,
the rest Sat Nov 7 14:30). Two tests run per screen and size:

- **Figma comparison.** The first screenful is diffed against `design/figma/<Screen>-<width>.png`, the
  1× export of the frame `<Screen> / Desktop <width>`. Regions that v1 removes or changes on purpose
  (PLAN §2.1.1) are masked from `e2e/web/figma-masks.json`, in CSS px. The share of differing pixels is
  printed (`figma-diff <Screen>-<width>: x %`), added as a test annotation, and must stay at or under the
  screen's `budget`. The budget is the current value plus a small margin, so a drift away from Figma
  fails, and a fix toward Figma lets you lower it. The capture and diff images are written to
  `test-results/<test>/figma/`.
- **Full-page baseline.** `toHaveScreenshot` against
  `e2e/web/__screenshots__/visual.spec.ts/<Screen>-<project>-<platform>.png`. The viewport grows to the
  document height before the capture, because Playwright's `fullPage` resize can catch the charts
  while they re-measure. Baselines are per platform. Record Linux baselines on CI with
  `npm run test:visual:update`.

### Refreshing the Figma exports

The PNGs in `design/figma/` come from file `ZMGAYBFUZjGsECpL54uEJg` (node ids in PLAN §2.1). Export
each frame at 1× (a 1512 frame may be taller than 982; only the first 982 px are compared). With the
Figma MCP, call `get_screenshot` with `maxDimension` equal to the frame width, then download the URL.
Keep the names `<Screen>-1920.png`, `<Screen>-1512.png` and `<Screen>-iphone.png`, with
`Screen` ∈ SignIn, Home, Sensors, Timeline, Chat, Calibration, Settings, Account.

## Live checks (`e2e/web/live.spec.ts`)

These run against the gateway's local stack (`supabase start` plus the seed in olvar-gateway). Take
the keys from `supabase status -o env` in the gateway checkout:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
SUPABASE_SECRET_KEY=sb_secret_... \
npm run test:live
```

The checks only run in the `fhd-1920` project. Before they start, the suite looks at the last 32 h of
readings. Wherever two readings are more than 2 min apart, it adds one reading a minute under a new
boot id, ending at now. It only appends, so a seed that is days old still passes. Without
`SUPABASE_SECRET_KEY`, a gap skips the history checks with a message instead of failing them.
