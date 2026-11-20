# Deploying the dashboard

The dashboard ships two ways:

- **Web:** a static Expo web export (`web.output: "single"`) hosted on **Cloudflare Pages**.
- **iOS:** built **locally on the Mac mini** with Xcode (`npm run ios:release`), installed straight onto a connected iPhone, and optionally archived and uploaded to **TestFlight** from Xcode.

No EAS service is used: no EAS Build, Submit, Hosting or Workflows, and there is no `eas.json`.

Every step below runs under your own accounts. The repository holds no credentials. CI only builds and checks the web export; it deploys nothing.

## What the repository already does

| Piece | Where | What it does |
| --- | --- | --- |
| CI | `.github/workflows/ci.yml` | On every PR and push to `main`: lint, typecheck and Jest. Then it exports the web build with fixtures, runs `scripts/check-web-export.js` and `scripts/smoke-pages.sh`, and uploads `dist/` as the `web-dist` artifact. |
| SPA fallback | none needed | Cloudflare Pages serves `index.html` for any unknown path as long as the output has no top-level `404.html`, so deep links like `/settings/devices` work. Do not add a `_redirects` rule like `/* /index.html 200`: Pages flags it as an infinite loop and ignores it. |
| Response headers | `public/_headers` | Expo copies this file to `dist/_headers`. It sets security headers only. Caching stays at Pages' default (`max-age=0, must-revalidate`, with ETags), so a new deploy shows up right away. When a later deploy removes a bundle URL, Pages answers it with the SPA fallback `index.html`. Under a long-lived cache rule, a browser would keep that HTML in place of the script, even after a rollback restores the bundle. |
| Export check | `scripts/check-web-export.js` | Part of the Pages build command, so a failing check stops the publish. It reads the build env the way the production export does (process env, then `.env.production.local`, `.env.local`, `.env.production`, `.env`). It validates that env with the app's own `parseEnv` (`src/env.ts`), so an unknown `EXPO_PUBLIC_DATA_SOURCE`, a malformed Supabase URL or a missing value fails the build instead of the app's startup. On top of that, it fails if `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set but does not start with `sb_publishable_` (this catches secret and legacy JWT keys). It also fails if the export has no `index.html`, has a `404.html`, has an `index.html` rewrite rule, is missing `_headers`, or contains an `sb_secret_` key. |
| Node version | `.node-version` | Node 24, read by both CI and the Cloudflare Pages build image. |
| iOS release build | `scripts/ios-release.js` (`npm run ios:release`, `npm run ios:archive`) | Checks Xcode and the build env, then builds Release on this Mac. See [iOS](#ios-local-release-build-on-the-mac-mini). |
| Export compliance | `app.json` → `ios.config.usesNonExemptEncryption: false` | TestFlight does not ask the encryption question for every build. The app only uses standard HTTPS. |

GitHub Actions is the only CI. There is no EAS workflow on pull requests.

## Environment variables

Expo inlines every `EXPO_PUBLIC_*` value into the bundle **at build time**. These values are public by design.

| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_DATA_SOURCE` | `supabase` for real data, `fixtures` for demo data. With `fixtures`, the two Supabase values are not needed. |
| `EXPO_PUBLIC_SUPABASE_URL` | The project URL, `https://<project-ref>.supabase.co` (Supabase → Project Settings → API). |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key, which starts with `sb_publishable_`. |

> **Never use the secret key (`sb_secret_…`) or the legacy `service_role` key here.** Anything you put here ships to every browser and phone. `src/env.ts` refuses to start with an `sb_secret_` key, and CI fails if one appears in the web export.

Because the values are baked in, **changing a variable has no effect until you build again.** On Pages, use "Retry deployment"; for iOS, build and install again with `npm run ios:release`.

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

## iOS: local release build on the Mac mini

The iOS app is built on the Mac mini with Xcode. Nothing is built in the cloud, and the repository holds no signing material: Xcode manages the certificate and provisioning profile in your login keychain, and the Supabase values live in a git-ignored file.

### Requirements (one time)

- **Xcode 27 or later** (the script checks this; iOS 27 devices need the iOS 27 SDK). Select it with `sudo xcode-select -s /Applications/Xcode.app` and open it once to install its components.
- **Node 24** (`.node-version`) and **CocoaPods** (`brew install cocoapods`). Prebuild runs `pod install`.
- **An Apple ID signed in to Xcode** (Xcode → Settings → Accounts). A free Personal Team is enough to install on your own iPhone; its builds expire after 7 days. TestFlight needs the **Apple Developer Program** ($99/yr).
- **The iPhone:** connect it by USB (or pair it once and use Wi-Fi), tap **Trust**, and turn on **Settings → Privacy & Security → Developer Mode**. The first time, Xcode may need a minute to prepare the device (Window → Devices and Simulators).
- The **bundle ID** `app.olvar.dashboard` (from `app.json`). Xcode registers it in your team on the first signed build. Keep it unchanged once an App Store Connect record exists.

### 1. Create the env file (one time)

```bash
cp .env.production.local.example .env.production.local
```

Fill in `EXPO_PUBLIC_DATA_SOURCE=supabase`, the project URL and the `sb_publishable_…` key (see [Environment variables](#environment-variables)). `.env.production.local` is git-ignored (`.env*.local`). Expo reads it, in this order, whenever it bundles a Release build: the shell environment, then `.env.production.local`, `.env.local`, `.env.production`, `.env`. A value in the shell wins, and a key missing from `.env.production.local` falls back to the files after it, so a `fixtures` line in your dev `.env.local` would leak into the release build. The script prints every value it is going to bake in, and which file it came from, before it builds.

`APPLE_TEAM_ID` is optional: the 10-character Team ID from <https://developer.apple.com/account> → Membership. It is used only to sign archives; it is not secret and is not bundled into the app.

### 2. Build and install on the iPhone

With the iPhone connected and unlocked:

```bash
npm run ios:release                            # installs on the one connected iPhone
npm run ios:release -- --device "My iPhone"    # with several connected: by name or UDID (xcrun devicectl list devices)
```

`scripts/ios-release.js` does the following:

1. Fails early if Xcode is older than 27 or the build env is wrong. It validates the env with the app's own `parseEnv` (`src/env.ts`) and the same check as the web build (a key that does not start with `sb_publishable_` fails). It also refuses `EXPO_PUBLIC_DATA_SOURCE=fixtures` unless you pass `--allow-fixtures`.
2. Finds the iPhone with `xcrun devicectl`. It considers only physical iPhones that are paired and reachable, never a simulator. With none connected it stops and says so. With several connected it asks for `--device`.
3. Runs `npx expo prebuild --platform ios --no-clean` to generate `ios/` from `app.json`, or update it in place (Continuous Native Generation; `ios/` is git-ignored, never edit it by hand). `--no-clean` keeps the signing team you set in Xcode.
4. Runs `npx expo run:ios --configuration Release --no-bundler --device <UDID>` for that iPhone, which builds the Release configuration with the JS bundle embedded, signs it, installs it and launches it. The app then runs without Metro or the Mac. Release builds do not include the dev client.

On the first build, Expo asks which signing team to use and writes it into the generated project. If signing still fails, run `xed ios`, select the `olvar` target → **Signing & Capabilities**, tick **Automatically manage signing**, pick your team, and run the script again.

Options:

| Option | Effect |
| --- | --- |
| `--dry-run` | Checks Xcode, the env and (for `ios:release`) the connected iPhone, prints the commands, builds nothing. |
| `--clean` | Regenerates `ios/` from scratch (`prebuild --clean`). Use it after changing plugins or native config in `app.json`, or after an Expo SDK upgrade. It drops the team chosen in Xcode, so you pick it again (or set `APPLE_TEAM_ID` for archives). |
| `--allow-fixtures` | Builds a demo app on fixtures. |

Because the env values are baked in, **changing `.env.production.local` has no effect until you build again.**

### 3. TestFlight (optional): archive and upload with Xcode

This needs the paid Apple Developer Program and an App Store Connect record:

1. In <https://appstoreconnect.apple.com> → **Apps → + → New App**: platform iOS, bundle ID `app.olvar.dashboard`, any SKU. The store name must be unique across the App Store, so if "olvar" is taken, enter another name; the name on the home screen still comes from `app.json` → `name`.
2. Archive:

   ```bash
   npm run ios:archive
   ```

   This runs the same checks and prebuild, then `xcodebuild archive` for `generic/platform=iOS` with automatic signing (`-allowProvisioningUpdates`, plus `DEVELOPMENT_TEAM` when `APPLE_TEAM_ID` is set). The archive goes to `~/Library/Developer/Xcode/Archives/<date>/`, and the script opens it in Xcode's **Organizer**.
3. In the Organizer, select the archive → **Distribute App → App Store Connect → Upload**. Keep **Manage Version and Build Number** ticked, so Xcode raises the build number when one is already taken. To keep build numbers in the repo instead, raise `expo.ios.buildNumber` in `app.json` before each upload; to ship a new user-facing version, raise `expo.version`.
4. App Store Connect processes the build in about 10 to 15 minutes. Then, in **TestFlight → Internal Testing**, add yourself to a group and install the build with the TestFlight app. Internal testers (up to 100 App Store Connect users) need no review. External testers need Beta App Review, plus a privacy policy URL and beta test information.

You can also archive entirely from the Xcode UI (`xed ios`, then **Product → Archive** with the `olvar` scheme). This path does not use the script and its checks. It also does not see your terminal's environment: Xcode's bundling step runs `expo export:embed` in production mode, which takes its values only from the env files (`.env.production.local`, then `.env.local`, `.env.production`, `.env`) and from the environment Xcode itself was started with. So make sure `.env.production.local` sets all three `EXPO_PUBLIC_*` values, or a `fixtures` line in `.env.local` ends up in the build. If you override values in the shell, use `npm run ios:archive`, so the check and the archive see the same values.

Export compliance is already answered in `app.json` (`usesNonExemptEncryption: false`), so TestFlight does not ask about encryption for each build.

## Verify locally before you deploy

These commands need no accounts:

```bash
npm ci
npm run lint && npm run typecheck && npm test
export EXPO_PUBLIC_DATA_SOURCE=fixtures   # for the export and the checker alike
npx expo export -p web
node scripts/check-web-export.js dist
scripts/smoke-pages.sh dist   # Cloudflare's local Pages server (wrangler pages dev); checks deep links and that the fallback is not cached long-term; fails if the port is taken
npm run ios:archive -- --dry-run   # on the Mac mini: checks Xcode and .env.production.local, prints the build commands, builds nothing (ios:release also needs the iPhone connected)
```
