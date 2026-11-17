import type { Href } from 'expo-router';

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

/** Where sign-in returns to: only in-app paths, never another origin or the auth screens. */
export function safeNext(next: unknown): Href {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return hrefs.home;
  if (next.startsWith(hrefs.signIn)) return hrefs.home;
  return next as Href;
}
