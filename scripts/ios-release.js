#!/usr/bin/env node
// Builds the iOS app in Release on this Mac, with no cloud build service (docs/DEPLOY.md).
// The JS bundle is embedded, so the app runs without Metro. The EXPO_PUBLIC_* values come
// from the same files Expo reads when it bundles a Release build (process env, then
// .env.production.local, .env.local, .env.production, .env) and are checked first.
//
//   node scripts/ios-release.js [--device <name|udid>]   build, install and launch on a connected iPhone
//   node scripts/ios-release.js --archive                archive for TestFlight, open it in Xcode
//
// Options: --clean (regenerate ios/ from app.json), --allow-fixtures, --dry-run (check only).
/* global __dirname */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkBuildEnv } = require('./check-web-export');

const ROOT = path.resolve(__dirname, '..');
const MIN_XCODE = 27;
const ENV_KEYS = ['EXPO_PUBLIC_DATA_SOURCE', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

const USAGE = `Usage: npm run ios:release -- [--device <name|udid>] [--clean] [--allow-fixtures] [--dry-run]
       npm run ios:archive -- [--clean] [--allow-fixtures] [--dry-run]`;

function parseArgs(argv) {
  const opts = { mode: 'device', device: undefined, clean: false, allowFixtures: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--archive') opts.mode = 'archive';
    else if (arg === '--clean') opts.clean = true;
    else if (arg === '--allow-fixtures') opts.allowFixtures = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--device' || arg === '-d') {
      // Without a value, the only connected iPhone is used.
      const next = argv[i + 1];
      opts.device = next && !next.startsWith('-') ? argv[++i] : true;
    } else if (arg.startsWith('--device=')) opts.device = arg.slice('--device='.length);
    else throw new Error(`Unknown option ${arg}\n${USAGE}`);
  }
  if (opts.mode === 'archive' && opts.device !== undefined) {
    throw new Error('--device and --archive cannot be combined: an archive is not installed on a device');
  }
  return opts;
}

/**
 * The build env as the Release bundle step resolves it: the shell wins over the .env files.
 * @param {string} root
 * @param {Record<string, string | undefined>} [systemEnv]
 */
function resolveBuildEnv(root, systemEnv = process.env) {
  const { parseProjectEnv } = require('@expo/env');
  const { env: fileEnv, files } = parseProjectEnv(root, { mode: 'production', systemEnv: { ...systemEnv } });
  /** @type {Record<string, string>} */
  const env = {};
  /** @type {Record<string, string>} */
  const sources = {};
  for (const key of [...ENV_KEYS, 'APPLE_TEAM_ID']) {
    // Expo keeps an empty shell value over the files; APPLE_TEAM_ID is ours, and blank means unset.
    if (key === 'APPLE_TEAM_ID' && !systemEnv[key] && !fileEnv[key]) continue;
    if (systemEnv[key] !== undefined && (key !== 'APPLE_TEAM_ID' || systemEnv[key])) {
      env[key] = systemEnv[key];
      sources[key] = 'shell';
    } else if (fileEnv[key] !== undefined) {
      env[key] = fileEnv[key];
      sources[key] = files.map((f) => path.basename(f)).find((f) => readsKey(path.join(root, f), key)) ?? '.env';
    }
  }
  return { env, sources, files: files.map((f) => path.relative(root, f)) };
}

function readsKey(file, key) {
  try {
    return new RegExp(`^\\s*(export\\s+)?${key}\\s*=`, 'm').test(fs.readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
}

function checkReleaseEnv(env, { allowFixtures }) {
  const problems = checkBuildEnv(env);
  if ((env.EXPO_PUBLIC_DATA_SOURCE ?? 'supabase') === 'fixtures' && !allowFixtures) {
    problems.push('EXPO_PUBLIC_DATA_SOURCE is fixtures: the app would show demo data (pass --allow-fixtures if intended)');
  }
  if (env.APPLE_TEAM_ID && !/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID)) {
    problems.push('APPLE_TEAM_ID must be the 10-character Team ID from developer.apple.com → Membership');
  }
  return problems;
}

/** Prints which value is baked in, without echoing the whole key. */
function describeEnv({ env, sources }) {
  const show = (key, value) => {
    if (value === undefined || value === '') return `${key} = (not set)`;
    const prefix = value.startsWith('sb_publishable_') ? 'sb_publishable_'.length + 4 : 6;
    const shown = key.endsWith('_KEY') ? `${value.slice(0, prefix)}…` : value;
    return `${key} = ${shown}  [${sources[key]}]`;
  };
  return [...ENV_KEYS, 'APPLE_TEAM_ID'].map((key) => show(key, env[key]));
}

function xcodeMajor(versionOutput) {
  const match = /^Xcode (\d+)/m.exec(versionOutput ?? '');
  return match ? Number(match[1]) : undefined;
}

/** The Xcode project name prebuild derives from app.json `name`. */
function projectName(appJson) {
  return appJson.expo.name.replace(/[^A-Za-z0-9]/g, '');
}

function archivePath(name, now = new Date(), home = os.homedir()) {
  // Xcode's Organizer lists every archive under this folder.
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
  return path.join(home, 'Library/Developer/Xcode/Archives', day, `${name} ${day} ${time}.xcarchive`);
}

/**
 * Physical iPhones from `xcrun devicectl list devices --json-output`. devicectl lists simulators
 * and every paired phone too; a phone it cannot reach right now is in state "unavailable".
 */
function listIphones(devicectlJson) {
  return (devicectlJson?.result?.devices ?? [])
    .map((d) => {
      const hardware = d.properties?.hardware ?? d.hardwareProperties ?? {};
      const connection = d.properties?.connection ?? {};
      const state = connection.state ?? d.connectionProperties?.tunnelState;
      const pairing = connection.pairingState ?? d.connectionProperties?.pairingState;
      return {
        name: d.properties?.state?.name ?? d.deviceProperties?.name ?? hardware.marketingName ?? hardware.udid,
        udid: hardware.udid,
        physical: hardware.reality === 'physical' && hardware.deviceType === 'iPhone',
        connected: pairing === 'paired' && state !== undefined && state !== 'unavailable',
      };
    })
    .filter((d) => d.physical && d.udid)
    .map(({ name, udid, connected }) => ({ name, udid, connected }));
}

/** The iPhone to install on, as a UDID, so `expo run:ios` can never fall back to a simulator. */
function pickIphone(iphones, wanted) {
  const connected = iphones.filter((d) => d.connected);
  const list = (devices) => devices.map((d) => `\n  ${d.name}  ${d.udid}`).join('');
  if (typeof wanted === 'string') {
    const match = iphones.find((d) => d.udid.toLowerCase() === wanted.toLowerCase() || d.name.toLowerCase() === wanted.toLowerCase());
    if (!match) throw new Error(`No iPhone named or with UDID "${wanted}". Connected iPhones:${list(connected) || ' none'}`);
    if (!match.connected) throw new Error(`${match.name} is paired but not reachable: connect it by USB and unlock it`);
    return match;
  }
  if (connected.length === 1) return connected[0];
  if (connected.length === 0) {
    throw new Error(
      'No iPhone is connected: connect it by USB, unlock it, tap Trust and turn on Developer Mode (docs/DEPLOY.md)',
    );
  }
  throw new Error(`Several iPhones are connected; pick one with --device <udid>:${list(connected)}`);
}

function connectedIphones() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olvar-devicectl-'));
  try {
    const out = path.join(dir, 'devices.json');
    const run = spawnSync('xcrun', ['devicectl', 'list', 'devices', '--quiet', '--json-output', out], { encoding: 'utf8' });
    if (run.status !== 0 || !fs.existsSync(out)) throw new Error(`xcrun devicectl list devices failed: ${run.stderr || run.error}`);
    return listIphones(JSON.parse(fs.readFileSync(out, 'utf8')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function releasePlan(opts, { name, teamId, archive, udid }) {
  // Prebuild recreates ios/ unless told not to, which would drop the team chosen in Xcode.
  const steps = [{ cmd: 'npx', args: ['expo', 'prebuild', '--platform', 'ios', opts.clean ? '--clean' : '--no-clean'] }];
  if (opts.mode === 'device') {
    steps.push({ cmd: 'npx', args: ['expo', 'run:ios', '--configuration', 'Release', '--no-bundler', '--device', udid] });
    return steps;
  }
  steps.push({
    cmd: 'xcodebuild',
    args: [
      '-workspace', `ios/${name}.xcworkspace`,
      '-scheme', name,
      '-configuration', 'Release',
      '-destination', 'generic/platform=iOS',
      '-archivePath', archive,
      '-allowProvisioningUpdates',
      'archive',
      ...(teamId ? [`DEVELOPMENT_TEAM=${teamId}`, 'CODE_SIGN_STYLE=Automatic'] : []),
    ],
  });
  steps.push({ cmd: 'open', args: [archive] });
  return steps;
}

const quote = (arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`);
const formatStep = ({ cmd, args }) => [cmd, ...args].map(quote).join(' ');

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  const problems = [];
  if (process.platform !== 'darwin') problems.push('iOS builds need macOS with Xcode');
  const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' });
  const major = xcodeMajor(xcode.stdout);
  if (major === undefined) problems.push('xcodebuild not found: install Xcode and run `sudo xcode-select -s /Applications/Xcode.app`');
  else if (major < MIN_XCODE) problems.push(`Xcode ${major} is too old: iOS 27 devices need Xcode ${MIN_XCODE} or later`);

  const resolved = resolveBuildEnv(ROOT);
  problems.push(...checkReleaseEnv(resolved.env, opts));

  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const name = projectName(appJson);

  let iphone;
  if (opts.mode === 'device' && major !== undefined) {
    try {
      iphone = pickIphone(connectedIphones(), opts.device);
    } catch (error) {
      problems.push(error.message);
    }
  }

  console.log(`iOS ${opts.mode === 'device' ? 'release build for a connected iPhone' : 'archive for TestFlight'}`);
  console.log(`  Xcode: ${major ?? 'missing'}`);
  if (iphone) console.log(`  iPhone: ${iphone.name} (${iphone.udid})`);
  console.log(`  env files: ${resolved.files.length ? resolved.files.join(', ') : '(none; copy .env.production.local.example)'}`);
  for (const line of describeEnv(resolved)) console.log(`  ${line}`);
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p}`);
    return 1;
  }
  const steps = releasePlan(opts, { name, teamId: resolved.env.APPLE_TEAM_ID, archive: archivePath(name), udid: iphone?.udid });
  console.log(opts.dryRun ? 'Would run:' : 'Running:');
  for (const step of steps) console.log(`  $ ${formatStep(step)}`);
  if (opts.dryRun) return 0;

  for (const step of steps) {
    // The children read the .env files themselves; pass only the shell env, as Expo expects.
    const result = spawnSync(step.cmd, step.args, { cwd: ROOT, stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`✗ ${formatStep(step)} failed`);
      return result.status ?? 1;
    }
  }
  return 0;
}

module.exports = {
  archivePath,
  checkReleaseEnv,
  describeEnv,
  listIphones,
  parseArgs,
  pickIphone,
  projectName,
  releasePlan,
  resolveBuildEnv,
  xcodeMajor,
};

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
