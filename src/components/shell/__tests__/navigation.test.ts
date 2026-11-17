import { appTabs } from '@/components/ui';

import { gatewayStatusText } from '../GatewayStatus';
import { safeNext, sectionFor, shellTabs } from '../navigation';

describe('shell navigation', () => {
  it('maps the four Figma tabs to their route folders and URLs', () => {
    expect(shellTabs.map((t) => [t.label, t.route, t.href, t.sf])).toEqual([
      ['Home', '(home)', '/', 'house'],
      ['Sensors', 'sensors', '/sensors', 'waveform.path.ecg'],
      ['Timeline', 'timeline', '/timeline', 'clock'],
      ['Chat', 'chat', '/chat', 'bubble.left'],
    ]);
    expect(shellTabs).toHaveLength(appTabs.length);
  });

  it.each([
    ['/', 'home'],
    ['/sensors', 'sensors'],
    ['/timeline', 'timeline'],
    ['/chat', 'chat'],
    ['/settings', 'settings'],
    ['/settings/account', 'settings'],
    ['/calibrate', 'settings'],
    ['/unknown', 'home'],
  ])('%s highlights %s', (path, section) => {
    expect(sectionFor(path)).toBe(section);
  });

  it.each([
    ['/sensors', '/sensors'],
    ['/settings/account', '/settings/account'],
    [undefined, '/'],
    ['', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/sign-in', '/'],
    [['/chat'], '/'],
  ])('sign-in returns to %p as %p', (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });

  it('describes the gateway heartbeat with the 420 s rule applied by the data layer', () => {
    expect(gatewayStatusText(null, false)).toBe('not seen yet');
    expect(gatewayStatusText(12, false)).toBe('12 s ago');
    expect(gatewayStatusText(600, true)).toBe('offline · 10 min ago');
  });
});
