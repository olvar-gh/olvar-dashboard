# Deploying the dashboard

The dashboard ships two ways:

- **Web:** a static Expo web export (`web.output: "single"`) hosted on **Cloudflare Pages**.
- **iOS:** built with **EAS Build** and delivered to **TestFlight** with EAS Submit.

EAS Hosting is not used, so the `eas deploy` steps in `docs/PLAN.md` T14 no longer apply.

Every step below runs under your own accounts. The repository holds no credentials. CI only builds and checks the web export; it deploys nothing.

## What the repository already does

| Piece | Where | What it does |
| --- | --- | --- |
| CI | `.github/workflows/ci.yml` | On every PR and push to `main`: lint, typecheck and Jest. Then it exports the web build with fixtures, runs `scripts/check-web-export.js` and `scripts/smoke-pages.sh`, and uploads `dist/` as the `web-dist` artifact. |
| SPA fallback | none needed | Cloudflare Pages serves `index.html` for any unknown path as long as the output has no top-level `404.html`, so deep links like `/settings/devices` work. Do not add a `_redirects` rule like `/* /index.html 200`: Pages flags it as an infinite loop and ignores it. |
| Response headers | `public/_headers` | Expo copies this file to `dist/_headers`. It sets security headers only. Caching stays at Pages' default (`max-age=0, must-revalidate`, with ETags), so a new deploy shows up right away. When a later deploy removes a bundle URL, Pages answers it with the SPA fallback `index.html`. Under a long-lived cache rule, a browser would keep that HTML in place of the script, even after a rollback restores the bundle. |
| Export check | `scripts/check-web-export.js` | Part of the Pages build command, so a failing check stops the publish. It reads the build env the way the production export does (process env, then `.env.production.local`, `.env.local`, `.env.production`, `.env`). It fails if `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set but does not start with `sb_publishable_` (this catches secret and legacy JWT keys), or if a `supabase` build lacks the URL or key. It also fails if the export has no `index.html`, has a `404.html`, has an `index.html` rewrite rule, is missing `_headers`, or contains an `sb_secret_` key. |
| Node version | `.node-version` | Node 24, read by both CI and the Cloudflare Pages build image. |
| Export compliance | `app.json` → `ios.config.usesNonExemptEncryption: false` | TestFlight does not ask the encryption question for every build. The app only uses standard HTTPS. |

The older `.eas/workflows/ci.yml` runs only after the project is linked to EAS with its GitHub integration. GitHub Actions is the PR gate either way.

## Environment variables

Expo inlines every `EXPO_PUBLIC_*` value into the bundle **at build time**. These values are public by design.

| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_DATA_SOURCE` | `supabase` for real data, `fixtures` for demo data. With `fixtures`, the two Supabase values are not needed. |
| `EXPO_PUBLIC_SUPABASE_URL` | The project URL, `https://<project-ref>.supabase.co` (Supabase → Project Settings → API). |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key, which starts with `sb_publishable_`. |

> **Never use the secret key (`sb_secret_…`) or the legacy `service_role` key here.** Anything you put here ships to every browser and phone. `src/env.ts` refuses to start with an `sb_secret_` key, and CI fails if one appears in the web export.

Because the values are baked in, **changing a variable has no effect until you build again.** On Pages, use "Retry deployment"; for iOS, run a new EAS build.

## Web: Cloudflare Pages

### 1. Create the Pages project (one time)

Use the Git integration, so each push builds and deploys automatically.

1. Sign in at <https://dash.cloudflare.com> and go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize the Cloudflare GitHub app for `olvar-gh/olvar-dashboard` and select that repository.
3. Fill in the build settings:

   | Setting | Value |
   | --- | --- |
   | Project name | `olvar-dashboard` (this gives you `https://olvar-dashboard.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | None |
   | Build command | `npx expo export -p web && node scripts/check-web-export.js dist` |
   | Build output directory | `dist` |
   | Root directory | *(leave empty)* |

4. Before the first deploy, open **Environment variables (advanced)** and add the variables from step 2. Then select **Save and Deploy**.

> A Pages project created by Direct Upload (`wrangler pages deploy`) cannot be switched to the Git integration later. Pick the Git integration unless you specifically want manual uploads (see [Manual deploys](#manual-deploys-alternative)).

### 2. Set the build variables

Go to **Workers & Pages → olvar-dashboard → Settings → Variables and Secrets**. Add the variables as type **Text**: they are public, and a secret type adds nothing.

| Variable | Production | Preview |
| --- | --- | --- |
| `EXPO_PUBLIC_DATA_SOURCE` | `supabase` | `fixtures` |
| `EXPO_PUBLIC_SUPABASE_URL` | your project URL | *(not set)* |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_…` key | *(not set)* |

With these settings, preview deployments run on fixtures. Each PR then gets a working `https://<hash>.olvar-dashboard.pages.dev` link that never touches your data, and preview hosts never need to be on the Supabase allow-list. If you would rather have previews use real data, set the Supabase variables for Preview too and add the preview wildcard in step 4.

After you change a variable, go to **Deployments**, open the latest production deployment, and select **Retry deployment**.

### 3. Custom domain (optional)

Go to **olvar-dashboard → Custom domains → Set up a custom domain** and follow the DNS prompt. If you add one, use it as the origin in step 4.

### 4. Supabase Auth URLs for the deployed origin

In the Supabase dashboard of the gateway's hosted project, go to **Authentication → URL Configuration**:

- **Site URL:** `https://olvar-dashboard.pages.dev`, or your custom domain.
- **Redirect URLs:** add
  - `https://olvar-dashboard.pages.dev/**`
  - your custom domain with `/**`, if you have one
  - `olvar://**`, the iOS app's scheme
  - `https://*.olvar-dashboard.pages.dev/**`, only if previews use real data (see step 2)

The dashboard signs in with email and password and does not read sessions from URLs (`detectSessionInUrl: false`), so sign-in itself never redirects. These URLs matter for the links in emails that Supabase sends, such as password recovery or an email change. Without them, those links point at `localhost`. Supabase's REST API already accepts requests from any origin, so you do not need any CORS settings.

The gateway's `supabase/config.toml` (`[auth] site_url`) configures only the local stack, not the hosted project.

### 5. Check the deployment

Open the production URL and sign in with the owner account. Then reload on `/settings/devices`: the page should load instead of returning a 404. To check headers from a terminal:

```bash
curl -sI https://olvar-dashboard.pages.dev/settings/devices | grep -iE '^HTTP|content-type'
```

### Manual deploys (alternative)

This applies only if you chose Direct Upload instead of the Git integration:

```bash
npx wrangler@4 login
npx wrangler@4 pages project create olvar-dashboard --production-branch main
# Uses the EXPO_PUBLIC_* values in .env.local
npx expo export -p web && node scripts/check-web-export.js dist
npx wrangler@4 pages deploy dist --project-name olvar-dashboard --branch main
```

## iOS: EAS Build to TestFlight

### Apple requirements (one time)

- **Apple Developer Program** membership ($99/yr) on an Apple ID with two-factor authentication. Use the Account Holder or an Admin, because EAS needs to create certificates and profiles.
- The **bundle ID** `app.olvar.dashboard` (from `app.json`). EAS registers it in your developer account on the first build. Keep it unchanged once the App Store Connect record exists.
- An **App Store Connect app record**. `eas submit` offers to create it. The store name must be unique across the App Store, so if "olvar" is taken, enter another name; the name on the home screen still comes from `app.json` → `name`.
- **TestFlight testers:** internal testers (up to 100 App Store Connect users) need no review. External testers need Beta App Review, plus a privacy policy URL and beta test information in App Store Connect.
- You do not need Xcode for EAS builds. You need it only for local `expo run:ios` and the simulator (Xcode 27.1, see `docs/PLAN.md` §7).

### 1. Link the project to EAS (one time)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` creates the EAS project and writes `owner` and `extra.eas.projectId` into `app.json`. Commit that change.

### 2. Set the EAS environment variables (one time)

EAS builds read variables from the environment named in the build profile (`eas.json`): `production`, `preview` or `development`. Client variables must use `plaintext` or `sensitive` visibility, never `secret`.

```bash
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_DATA_SOURCE --value supabase --visibility plaintext
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --visibility sensitive
```

To give `preview` and `development` builds real data too, repeat these commands with `--environment preview` and `--environment development`. (`env:create` is deprecated.) `--force` is not needed: `env:set` updates an existing variable. To check the stored values:

```bash
npx eas-cli@latest env:list --environment production
```

### 3. Build

```bash
npx eas-cli@latest build --platform ios --profile production
```

On the first run, sign in with your Apple ID when prompted and let EAS generate and manage the distribution certificate and provisioning profile. The `production` profile takes its build number from EAS (`appVersionSource: remote`) and increments it on every build (`autoIncrement`). To ship a new user-facing version, raise `expo.version` in `app.json`.

### 4. Submit to TestFlight

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

The first submit asks for your Apple ID, offers to create the App Store Connect record, and can set up an App Store Connect API key for later submits. Afterwards, find the app's **Apple ID** in App Store Connect under App Information → General Information. Pin it in `eas.json` so later submits run without prompts:

```json
"submit": {
  "production": {
    "ios": { "ascAppId": "1234567890" }
  }
}
```

To build and submit in one step from then on:

```bash
npx eas-cli@latest build --platform ios --profile production --auto-submit
```

App Store Connect processes the build in about 10 to 15 minutes. Then, in **TestFlight → Internal Testing**, add yourself to a group and install the build with the TestFlight app.

### Other profiles

| Profile | Use |
| --- | --- |
| `development` | Dev client for the simulator (`ios.simulator: true`). |
| `preview` | Internal ad-hoc build. Register devices first with `npx eas-cli@latest device:create`. |
| `e2e-test` | Simulator build on fixtures for Maestro. It needs no credentials. |

## Verify locally before you deploy

These commands need no accounts:

```bash
npm run lint && npm run typecheck && npm test
EXPO_PUBLIC_DATA_SOURCE=fixtures npx expo export -p web
node scripts/check-web-export.js dist
scripts/smoke-pages.sh dist   # Cloudflare's local Pages server (wrangler pages dev); checks deep links and that the fallback is not cached long-term; fails if the port is taken
```
