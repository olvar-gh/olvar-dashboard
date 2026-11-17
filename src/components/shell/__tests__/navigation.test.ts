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

  describe.each([
    ['native (no origin)', undefined],
    ['web', 'https://app.olvar.test'],
  ])('sign-in return path on %s', (_name, origin) => {
    it.each([
      ['/sensors', '/sensors'],
      ['/settings/account', '/settings/account'],
      ['/timeline?week=2026-11-16', '/timeline?week=2026-11-16'],
      ['/settings#account', '/settings#account'],
      ['/sign-inx', '/sign-inx'],
    ])('keeps the in-app path %p', (next, expected) => {
      expect(safeNext(next, origin)).toBe(expected);
    });

    it.each([
      [undefined],
      [''],
      [['/chat']],
      ['sensors'],
      ['https://evil.example'],
      ['//evil.example'],
      ['/\\evil.example'],
      ['/\\/evil.example'],
      ['/\\\\evil.example'],
      ['/sensors\\..\\..\\evil.example'],
      ['/\t/evil.example'],
      ['/\n/evil.example'],
      ['/\r/evil.example'],
      ['/\u0000/evil.example'],
      ['/..//evil.example'],
      ['/.//evil.example'],
      ['/%2e%2e//evil.example'],
      ['/%2E//evil.example'],
      ['/sensors/../../evil.example'],
      ['/sign-in'],
      ['/sign-in?next=/sensors'],
      ['/sign-in/again'],
    ])('sends %p home', (next) => {
      expect(safeNext(next, origin)).toBe('/');
    });
  });

  it('rejects a path that resolves to another origin', () => {
    const RealURL = URL;
    const spy = jest
      .spyOn(globalThis, 'URL')
      .mockImplementation(
        (url: string | URL, base?: string | URL) =>
          ({ ...new RealURL(String(url), base), origin: 'https://evil.example' } as unknown as URL)
      );
    expect(safeNext('/sensors', 'https://app.olvar.test')).toBe('/');
    spy.mockRestore();
  });

  it('describes the gateway heartbeat with the 420 s rule applied by the data layer', () => {
    expect(gatewayStatusText(null, false)).toBe('not seen yet');
    expect(gatewayStatusText(12, false)).toBe('12 s ago');
    expect(gatewayStatusText(600, true)).toBe('offline · 10 min ago');
  });
});
