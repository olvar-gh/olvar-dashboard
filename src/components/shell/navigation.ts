import type { Href } from 'expo-router';
import { Platform } from 'react-native';

import { appTabs, type AppTab } from '@/components/ui';

export type Section = 'home' | 'sensors' | 'timeline' | 'chat' | 'settings';

export type ShellTab = AppTab & {
  section: Exclude<Section, 'settings'>;
  /** Route name of the tab's folder in src/app/(app)/(tabs). */
  route: string;
  href: Href;
};

const tabRoutes: Record<string, Pick<ShellTab, 'section' | 'route' | 'href'>> = {
  index: { section: 'home', route: '(home)', href: '/' },
  sensors: { section: 'sensors', route: 'sensors', href: '/sensors' },
  timeline: { section: 'timeline', route: 'timeline', href: '/timeline' },
  chat: { section: 'chat', route: 'chat', href: '/chat' },
};

/** Room the narrow-web bottom bar takes at the foot of the viewport. */
export const BOTTOM_BAR_CLEARANCE = 96;

/** Home · Sensors · Timeline · Chat: the iOS tab bar, the desktop sidebar and the narrow-web bottom bar. */
export const shellTabs: readonly ShellTab[] = appTabs.map((tab) => ({ ...tab, ...tabRoutes[tab.name] }));

export const hrefs = {
  home: '/',
  signIn: '/sign-in',
  settings: '/settings',
  account: '/settings/account',
  devices: '/settings/devices',
  calibrate: '/calibrate',
} as const satisfies Record<string, Href>;

/** The sidebar item a pathname belongs to; Settings, Account and calibration highlight no tab. */
export function sectionFor(pathname: string): Section {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first === undefined) return 'home';
  if (first === 'settings' || first === 'calibrate') return 'settings';
  return shellTabs.find((t) => t.section === first)?.section ?? 'home';
}

// Characters browsers drop (tabs, newlines) or read as `/` (backslash) when parsing a URL, which can
// turn `/\evil.example` into `//evil.example`, a URL on another origin.
const UNSAFE_CHARS = /[\\\u0000-\u001f\u007f]/;
// `.` and `..` segments (also percent-encoded) can collapse `/..//evil.example` into `//evil.example`.
const DOT_SEGMENT = /(^|\/)(\.|%2e){1,2}(?=\/|$)/i;

function webOrigin(): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  return (globalThis as { location?: { origin?: string } }).location?.origin;
}

/**
 * Where sign-in returns to: an in-app path on the app's own origin, never the auth screens. Anything
 * else returns Home. `origin` defaults to the page origin on web; native has no origin to leave.
 */
export function safeNext(next: unknown, origin: string | undefined = webOrigin()): Href {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return hrefs.home;
  const pathname = next.split(/[?#]/)[0];
  if (UNSAFE_CHARS.test(next) || DOT_SEGMENT.test(pathname)) return hrefs.home;
  if (origin) {
    try {
      if (new URL(next, origin).origin !== origin) return hrefs.home;
    } catch {
      return hrefs.home;
    }
  }
  if (pathname === hrefs.signIn || pathname.startsWith(`${hrefs.signIn}/`)) return hrefs.home;
  return next as Href;
}
