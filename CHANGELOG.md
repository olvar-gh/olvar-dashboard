# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-20

First public release. One Expo app (SDK 58, Expo Router) for desktop web and native iOS, reading the
data of [olvar-gateway](https://github.com/olvar-gh/olvar-gateway) from a hosted Supabase project.

### Added

- Email and password sign-in for the single plant owner (Supabase Auth).
- Home: plant status and summary from `plant_status_v`, live soil moisture, light, temperature and
  humidity cards, today's 24 h track and the latest plant reply.
- Sensors: 24 h, 7 d and 30 d charts with min, average and max per metric, hardware footers and an
  offline state.
- Timeline: week view with daily extremes, offline periods, calibration events and a week summary.
- Chat with your plant through the gateway's `chat` Edge Function (Claude), with reading context,
  rate-limit countdown and Retry for unanswered questions while offline.
- Soil calibration wizard (dry and wet raw values) for the capacitive probe on GPIO34.
- Settings: plant profile, care targets (preset or custom ranges), devices and calibration, account,
  password and time zone.
- Devices list that names the climate sensor from `devices.climate_sensor`: "SHT31 + GY-302",
  "DHT11 + GY-302", or a neutral "Climate sensor + GY-302" when it is unknown.
- Realtime updates for readings, device status and chat, with timers so a silent gateway still turns
  the app offline after 180 s.
- Fixtures data source with demo scenarios (normal, offline, failed reads, uncalibrated), used by
  the tests and by Cloudflare Pages preview builds.
- Web deploy on Cloudflare Pages with an export check (`scripts/check-web-export.js`), and local iOS
  Release and TestFlight archive builds with Xcode (`npm run ios:release`, `npm run ios:archive`).
- CI on GitHub Actions: em dash check, lint, typecheck, Jest, web export check and a Pages smoke test.
- Playwright web E2E and full-page visual tests (run locally on macOS).

[0.1.0]: https://github.com/olvar-gh/olvar-dashboard/commits/v0.1.0
