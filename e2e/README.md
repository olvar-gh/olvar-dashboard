# Web E2E and visual tests

Playwright runs against the **fixtures** web build (no network, no keys). The config exports the build,
serves it with `e2e/web/serve-spa.mjs` on `WEB_PORT` (default 8099), and runs these projects:

| Project | Viewport | Used for |
|---|---|---|
| `fhd-1920` | 1920×1080, DPR 1 | desktop layout checks, full-page baselines |
| `mbp-1512` | 1512×982, DPR 2 (captured at `scale: 'css'`, so 1512×982) | desktop layout checks, full-page baselines |
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
is opened on the fixtures with the clock fixed to the design frames' time (Home Fri Nov 6 14:32 Seoul,
the rest Sat Nov 7 14:30) and compared with a **full-page baseline**: `toHaveScreenshot` against
`e2e/web/__screenshots__/visual.spec.ts/<Screen>-<project>-<platform>.png`. The viewport grows to the
document height before the capture, because Playwright's `fullPage` resize can catch the charts
while they re-measure. Baselines exist for macOS only, so run the visual suite locally on a Mac. It does
not run in CI.

## Live checks (`e2e/web/live.spec.ts`)

These run against the local Supabase stack of [olvar-gateway](https://github.com/olvar-gh/olvar-gateway),
the public backend repo: clone it, then run `supabase start` and its seed there. Take the keys from
`supabase status -o env` in that checkout:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
SUPABASE_SECRET_KEY=sb_secret_... \
npm run test:live
```

The checks only run in the `fhd-1920` project. Before they start, the suite reads the last 32 h of
`readings` straight from the table, not through the app's data source. Every whole minute with no
reading within 30 s gets one synthetic reading under a new boot id. It only appends, then checks
coverage again, so a seed that is days old still passes. The 24 h test compares the paginated result
with an exact `count` of the same window.

The suite writes **only** when `SUPABASE_SECRET_KEY` is set **and** `EXPO_PUBLIC_SUPABASE_URL` points
at `localhost` or `127.0.0.1`; it never writes readings to a hosted project. Otherwise, missing minutes
skip the history checks and the Realtime write check skips, each with a message saying why.
