/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
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
} from '../ios-release';

const root = path.resolve(__dirname, '../..');
const supabase = {
  EXPO_PUBLIC_DATA_SOURCE: 'supabase',
  EXPO_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefgh',
};

describe('parseArgs', () => {
  it('defaults to a device build on the only connected iPhone', () => {
    expect(parseArgs([])).toMatchObject({ mode: 'device', device: undefined, clean: false, dryRun: false });
  });

  it('takes a device name, a bare --device and --device=', () => {
    expect(parseArgs(['--device', "Owner's iPhone"]).device).toBe("Owner's iPhone");
    expect(parseArgs(['--device', '--dry-run'])).toMatchObject({ device: true, dryRun: true });
    expect(parseArgs(['--device=00008140-001A']).device).toBe('00008140-001A');
  });

  it('rejects unknown options and a device for an archive', () => {
    expect(() => parseArgs(['--profile', 'production'])).toThrow(/Unknown option --profile/);
    expect(() => parseArgs(['--archive', '--device', 'x'])).toThrow(/cannot be combined/);
  });
});

describe('checkReleaseEnv', () => {
  it('accepts a Supabase build', () => {
    expect(checkReleaseEnv(supabase, { allowFixtures: false })).toEqual([]);
  });

  it('refuses fixtures unless asked for', () => {
    const env = { EXPO_PUBLIC_DATA_SOURCE: 'fixtures' };
    expect(checkReleaseEnv(env, { allowFixtures: false })).toEqual([expect.stringMatching(/--allow-fixtures/)]);
    expect(checkReleaseEnv(env, { allowFixtures: true })).toEqual([]);
  });

  it('refuses a secret key and a missing URL', () => {
    const problems = checkReleaseEnv(
      { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' },
      { allowFixtures: false },
    );
    expect(problems.join('\n')).toMatch(/secret keys must never be used/);
    expect(problems.join('\n')).toMatch(/EXPO_PUBLIC_SUPABASE_URL: required/);
  });

  it('checks the shape of APPLE_TEAM_ID', () => {
    expect(checkReleaseEnv({ ...supabase, APPLE_TEAM_ID: 'ABCDE12345' }, { allowFixtures: false })).toEqual([]);
    expect(checkReleaseEnv({ ...supabase, APPLE_TEAM_ID: 'me@example.com' }, { allowFixtures: false })).toEqual([
      expect.stringMatching(/APPLE_TEAM_ID/),
    ]);
  });

  it('treats a blank APPLE_TEAM_ID as unset, as the template leaves it', () => {
    expect(checkReleaseEnv({ ...supabase, APPLE_TEAM_ID: '' }, { allowFixtures: false })).toEqual([]);
  });
});

describe('resolveBuildEnv', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-env-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads the production files in Expo order, with the shell winning', () => {
    fs.writeFileSync(path.join(dir, '.env.local'), 'EXPO_PUBLIC_DATA_SOURCE=fixtures\nEXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n');
    fs.writeFileSync(
      path.join(dir, '.env.production.local'),
      'EXPO_PUBLIC_SUPABASE_URL=https://ref.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_abc\n',
    );
    fs.writeFileSync(path.join(dir, '.env.development.local'), 'EXPO_PUBLIC_SUPABASE_URL=http://dev\n');

    const { env, sources, files } = resolveBuildEnv(dir, { EXPO_PUBLIC_DATA_SOURCE: 'supabase' });
    expect(env).toEqual({
      EXPO_PUBLIC_DATA_SOURCE: 'supabase',
      EXPO_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
    });
    expect(sources).toEqual({
      EXPO_PUBLIC_DATA_SOURCE: 'shell',
      EXPO_PUBLIC_SUPABASE_URL: '.env.production.local',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '.env.production.local',
    });
    expect(files).toEqual(['.env.production.local', '.env.local']);
  });

  it('ignores a blank APPLE_TEAM_ID in the shell or a file', () => {
    fs.writeFileSync(path.join(dir, '.env.production.local'), 'APPLE_TEAM_ID=\n');
    expect(resolveBuildEnv(dir, {}).env).not.toHaveProperty('APPLE_TEAM_ID');
    fs.writeFileSync(path.join(dir, '.env.production.local'), 'APPLE_TEAM_ID=ABCDE12345\n');
    const { env, sources } = resolveBuildEnv(dir, { APPLE_TEAM_ID: '' });
    expect(env.APPLE_TEAM_ID).toBe('ABCDE12345');
    expect(sources.APPLE_TEAM_ID).toBe('.env.production.local');
  });

  it('lets a lower-priority file fill a key the release file leaves out', () => {
    fs.writeFileSync(path.join(dir, '.env.local'), 'EXPO_PUBLIC_DATA_SOURCE=fixtures\n');
    fs.writeFileSync(path.join(dir, '.env.production.local'), 'EXPO_PUBLIC_SUPABASE_URL=https://ref.supabase.co\n');
    const { env, sources } = resolveBuildEnv(dir, {});
    expect(env.EXPO_PUBLIC_DATA_SOURCE).toBe('fixtures');
    expect(sources.EXPO_PUBLIC_DATA_SOURCE).toBe('.env.local');
    expect(checkReleaseEnv(env, { allowFixtures: false }).join('\n')).toMatch(/fixtures/);
  });
});

describe('describeEnv', () => {
  it('never prints a whole key', () => {
    const lines = describeEnv({
      env: { ...supabase, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnop' },
      sources: {
        EXPO_PUBLIC_DATA_SOURCE: 'shell',
        EXPO_PUBLIC_SUPABASE_URL: '.env.production.local',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '.env.production.local',
      },
    });
    expect(lines.join('\n')).toContain('sb_publishable_abcd…');
    expect(lines.join('\n')).not.toContain('efgh');
    expect(lines).toContain('APPLE_TEAM_ID = (not set)');
  });
});

describe('listIphones', () => {
  const device = (reality: string, deviceType: string, state: string, name: string, udid: string) => ({
    properties: {
      hardware: { reality, deviceType, udid },
      connection: { pairingState: 'paired', state },
      state: { name },
    },
  });

  it('keeps physical iPhones only and marks the unreachable ones', () => {
    const json = {
      result: {
        devices: [
          device('simulated', 'iPhone', 'connected', 'Sim', '541D8631-A015-47B9-8B84-7F9E7A257283'),
          device('physical', 'iPad', 'connected', 'iPad', '00008103-000A'),
          device('physical', 'iPhone', 'disconnected', 'Phone', '00008140-001E'),
          device('physical', 'iPhone', 'unavailable', 'Old phone', '00008030-0002'),
        ],
      },
    };
    expect(listIphones(json)).toEqual([
      { name: 'Phone', udid: '00008140-001E', connected: true },
      { name: 'Old phone', udid: '00008030-0002', connected: false },
    ]);
  });

  it('reads the deprecated fields of older devicectl output', () => {
    const json = {
      result: {
        devices: [
          {
            hardwareProperties: { reality: 'physical', deviceType: 'iPhone', udid: '00008140-001E' },
            connectionProperties: { pairingState: 'paired', tunnelState: 'connected' },
            deviceProperties: { name: 'Phone' },
          },
        ],
      },
    };
    expect(listIphones(json)).toEqual([{ name: 'Phone', udid: '00008140-001E', connected: true }]);
  });

  it('handles no devices', () => {
    expect(listIphones({})).toEqual([]);
  });
});

describe('pickIphone', () => {
  const phone = { name: "Owner's iPhone", udid: '00008140-001E', connected: true };
  const spare = { name: 'Spare', udid: '00008030-0002', connected: true };
  const away = { name: 'Away', udid: '00008110-0003', connected: false };

  it('uses the only connected iPhone', () => {
    expect(pickIphone([phone, away], undefined)).toBe(phone);
    expect(pickIphone([phone], true)).toBe(phone);
  });

  it('fails clearly when no iPhone is connected', () => {
    expect(() => pickIphone([away], undefined)).toThrow(/No iPhone is connected/);
    expect(() => pickIphone([], true)).toThrow(/No iPhone is connected/);
  });

  it('asks for --device when several are connected', () => {
    expect(() => pickIphone([phone, spare], undefined)).toThrow(/--device <udid>[\s\S]*00008030-0002/);
  });

  it('matches --device by name or UDID, ignoring case', () => {
    expect(pickIphone([phone, spare], 'spare')).toBe(spare);
    expect(pickIphone([phone, spare], '00008140-001e')).toBe(phone);
  });

  it('rejects an unknown or unreachable --device, such as a simulator', () => {
    expect(() => pickIphone([phone], 'iPhone 17 Pro')).toThrow(/No iPhone named or with UDID "iPhone 17 Pro"/);
    expect(() => pickIphone([phone, away], 'Away')).toThrow(/paired but not reachable/);
  });
});

describe('releasePlan', () => {
  const ctx = { name: 'olvar', teamId: undefined, archive: '/A/olvar.xcarchive', udid: '00008140-001E' };

  it('keeps ios/ and installs the Release build on the chosen iPhone by UDID', () => {
    expect(releasePlan(parseArgs(['--device', 'iPhone']), ctx)).toEqual([
      { cmd: 'npx', args: ['expo', 'prebuild', '--platform', 'ios', '--no-clean'] },
      {
        cmd: 'npx',
        args: ['expo', 'run:ios', '--configuration', 'Release', '--no-bundler', '--device', '00008140-001E'],
      },
    ]);
  });

  it('regenerates ios/ only with --clean', () => {
    expect(releasePlan(parseArgs(['--clean']), ctx)[0].args).toEqual(['expo', 'prebuild', '--platform', 'ios', '--clean']);
    expect(releasePlan(parseArgs(['--archive']), ctx)[0].args).toContain('--no-clean');
  });

  it('archives for any iOS device and opens the archive in Xcode', () => {
    const steps = releasePlan(parseArgs(['--archive']), { ...ctx, teamId: 'ABCDE12345' });
    expect(steps.map((s) => s.cmd)).toEqual(['npx', 'xcodebuild', 'open']);
    expect(steps[1].args).toEqual(
      expect.arrayContaining(['-workspace', 'ios/olvar.xcworkspace', '-scheme', 'olvar', 'archive', 'DEVELOPMENT_TEAM=ABCDE12345']),
    );
    expect(steps[1].args.join(' ')).toContain('-configuration Release -destination generic/platform=iOS');
    expect(steps[2].args).toEqual(['/A/olvar.xcarchive']);
  });

  it('leaves signing to the Xcode project without a team ID', () => {
    for (const teamId of [undefined, '']) {
      const [, archive] = releasePlan(parseArgs(['--archive']), { ...ctx, teamId });
      expect(archive.args.join(' ')).not.toContain('DEVELOPMENT_TEAM');
    }
  });
});

describe('helpers', () => {
  it('reads the Xcode major version', () => {
    expect(xcodeMajor('Xcode 27.2\nBuild version 27B52\n')).toBe(27);
    expect(xcodeMajor('')).toBeUndefined();
  });

  it('derives the Xcode project name from app.json', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    expect(projectName(appJson)).toBe('olvar');
    expect(projectName({ expo: { name: 'My App!' } })).toBe('MyApp');
  });

  it('puts archives where the Xcode Organizer finds them', () => {
    expect(archivePath('olvar', new Date(2026, 10, 19, 9, 5, 7), '/Users/me')).toBe(
      '/Users/me/Library/Developer/Xcode/Archives/2026-11-19/olvar 2026-11-19 09.05.07.xcarchive',
    );
  });
});

describe('example env file', () => {
  const example = fs.readFileSync(path.join(root, '.env.production.local.example'), 'utf8');

  it('holds placeholders only', () => {
    expect(example).toMatch(/^EXPO_PUBLIC_SUPABASE_URL=https:\/\/your-project-ref\.supabase\.co$/m);
    expect(example).toMatch(/^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_x+$/m);
    expect(example).not.toMatch(/sb_secret_[A-Za-z0-9]/);
  });

  it('is committed while its filled-in copy is ignored', () => {
    const ignored = (file: string) => {
      try {
        execFileSync('git', ['check-ignore', '-q', file], { cwd: root });
        return true;
      } catch {
        return false;
      }
    };
    expect(ignored('.env.production.local')).toBe(true);
    expect(ignored('.env.production.local.example')).toBe(false);
  });
});
