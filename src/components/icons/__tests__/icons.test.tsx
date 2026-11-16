import type { ReactElement } from 'react';
import type { SvgProps } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { Icon, icons, type IconName } from '..';

// The Icon/<name> symbols in Figma section 138:622 and their frame sizes.
const figmaIcons: Record<IconName, number> = {
  home: 24, activity: 24, clock: 24, chat: 24, leaf: 17, chevRight: 14, chevLeft: 22, chevDown: 14,
  bell: 22, plus: 22, droplet: 14, sun: 14, thermo: 14, droplets: 14, alert: 17, sliders: 17,
  check: 17, gear: 19, search: 16, settings: 15, user: 17, wifi: 18, cpu: 13, lock: 14, info: 12,
  sprout: 18, target: 17, camera: 14, calendar: 14, arrow: 16, sparkle: 13, updown: 14, mail: 17,
  trash: 17, refresh: 17, wifiOff: 17,
};

// react-native-svg renders nothing under jest, so these inspect elements directly.
const element = (node: unknown) => node as ReactElement<SvgProps & { children?: unknown }>;

describe('icons', () => {
  it('has all 36 Figma icons', () => {
    expect(Object.keys(icons).sort()).toEqual(Object.keys(figmaIcons).sort());
    expect(Object.keys(icons)).toHaveLength(36);
  });

  it.each(Object.entries(figmaIcons) as [IconName, number][])('%s is %i px and tints with currentColor', (name, size) => {
    const root = element(icons[name]({}));
    expect(root.props).toMatchObject({ width: size, height: size, viewBox: `0 0 ${size} ${size}` });
    expect(JSON.stringify(root.props.children)).toContain('currentColor');
  });

  it('defaults to text/secondary at the Figma size', () => {
    const el = element(Icon({ name: 'home' }));
    expect(el.type).toBe(icons.home);
    expect(el.props.color).toBe(colors.text.secondary);
    expect(el.props.width).toBeUndefined();
  });

  it('accepts size and colour', () => {
    const el = element(Icon({ name: 'droplet', size: 16, color: colors.data.water }));
    expect(el.props).toMatchObject({ width: 16, height: 16, color: colors.data.water });
  });
});
