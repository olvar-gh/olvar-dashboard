# olvar-dashboard

The Olvar plant dashboard: one Expo app (SDK 58, Expo Router) that serves desktop web and native iOS.
It shows live soil, light, temperature and humidity readings, a week timeline, soil calibration and a
chat with your plant. Data and the chat function come from
[olvar-gateway](https://github.com/olvar-gh/olvar-gateway) (Supabase).

## How it fits together

Olvar is three repositories:

| Part | Repository | What it is |
| --- | --- | --- |
| Sensor node | [olvar-firmware](https://github.com/olvar-gh/olvar-firmware) | ESP32-WROOM-32D: SHT31 temperature and humidity on I²C 0x44 (or a DHT11 on GPIO4 when no SHT31 answers), GY-302 (BH1750) light on I²C 0x23, capacitive soil probe on GPIO34. Publishes telemetry over MQTT every 60 s. |
| Gateway | [olvar-gateway](https://github.com/olvar-gh/olvar-gateway) | Raspberry Pi 3B running Mosquitto and a bridge into a hosted Supabase project (Postgres, Auth, Realtime). Also owns the `chat` Edge Function, which answers as the plant with Claude (Anthropic API). |
| Dashboard | this repo | Reads Supabase with the owner's session and the publishable key, and calls the `chat` function. Web is hosted on Cloudflare Pages; iOS is built locally with Xcode (no EAS). |

The Settings device list names the climate sensor the firmware reports (`devices.climate_sensor`: `sht31`, `dht11`, or NULL).

## Getting started

You need Node 24 (`.node-version`). Without a backend, the app runs on built-in demo data:

```bash
npm ci
cp .env.example .env.local   # EXPO_PUBLIC_DATA_SOURCE=fixtures: demo data, no Supabase needed
npm run web
```

For real data, set `EXPO_PUBLIC_DATA_SOURCE=supabase` plus the project URL and the publishable key
from the gateway setup in `.env.local`, and sign in with the owner account the gateway created.
`npm run ios` builds and runs a development build in the iOS Simulator; it needs Xcode 27 or later
and CocoaPods.

- Design and architecture: [`docs/PLAN.md`](docs/PLAN.md)
- Deploying web and iOS: [`docs/DEPLOY.md`](docs/DEPLOY.md)
- Web E2E and visual tests: [`e2e/README.md`](e2e/README.md)
- Changes: [`CHANGELOG.md`](CHANGELOG.md)

The screens were designed in a private Figma file. Node IDs in comments and in `docs/PLAN.md` point
into it; the colour and layout values the code uses are exported to [`design/`](design).

## Contributing

Run `npm run lint`, `npm run typecheck` and `npm test` before opening a pull request. Project rules
are in [`AGENTS.md`](AGENTS.md); among them, no em dashes anywhere in the project.

## License

[MIT](LICENSE)
