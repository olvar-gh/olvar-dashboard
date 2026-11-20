# olvar-dashboard

The Olvar plant dashboard: one Expo app (SDK 58, Expo Router) that serves desktop web and native iOS.
It shows live soil, light, temperature and humidity readings, a week timeline, soil calibration and a
chat with your plant. Data and the chat function come from
[olvar-gateway](https://github.com/olvar-gh/olvar-gateway) (Supabase).

## Getting started

```bash
npm ci
cp .env.example .env.local   # or set EXPO_PUBLIC_DATA_SOURCE=fixtures to run without a backend
npm run web                  # or: npm run ios (development build)
```

- Design and architecture: [`docs/PLAN.md`](docs/PLAN.md)
- Deploying web and iOS: [`docs/DEPLOY.md`](docs/DEPLOY.md)
- Web E2E and visual tests: [`e2e/README.md`](e2e/README.md)

## Contributing

Run `npm run lint`, `npm run typecheck` and `npm test` before opening a pull request. Project rules
are in [`AGENTS.md`](AGENTS.md); among them, no em dashes anywhere in the project.

## License

[MIT](LICENSE)
