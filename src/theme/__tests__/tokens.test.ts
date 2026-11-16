import tokensJson from '../../../design/tokens.json';
import { colors, iosColors, liquidGlass, radius, space, textStyles } from '../tokens';
import { typography } from '../typography';

const camel = (s: string) =>
  s
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toLowerCase());

describe('tokens.ts matches design/tokens.json', () => {
  it('has every Figma colour variable, and nothing else', () => {
    const fromJson: Record<string, Record<string, string>> = {};
    for (const [name, value] of Object.entries(tokensJson.color)) {
      const [group, key] = name.split('/');
      (fromJson[group] ??= {})[camel(key)] = value;
    }
    expect(colors).toEqual(fromJson);
  });

  it('has the iOS colours', () => {
    const map: Record<string, string> = {
      'Labels/Primary': 'labelPrimary',
      'Labels/Secondary': 'labelSecondary',
      'Labels/Tertiary': 'labelTertiary',
      'Backgrounds – Grouped/Secondary': 'groupedBackgroundSecondary',
      'Separators/Non-opaque': 'separatorNonOpaque',
      'Fills/Tertiary': 'fillTertiary',
      'Fills - Vibrant/Tertiary': 'fillVibrantTertiary',
      'Accents/Green': 'accentGreen',
      'Accents/Blue': 'accentBlue',
      'Accents/Yellow': 'accentYellow',
      'Accents/Orange': 'accentOrange',
      'Accents/Teal': 'accentTeal',
    };
    const fromJson = Object.fromEntries(
      Object.entries(tokensJson.iosColor).map(([k, v]) => [map[k], v]),
    );
    expect(iosColors).toEqual(fromJson);
  });

  it('has the Liquid Glass, radius and spacing values', () => {
    expect(liquidGlass).toEqual(
      Object.fromEntries(Object.entries(tokensJson.liquidGlass).map(([k, v]) => [camel(k), v])),
    );
    expect(radius).toEqual(tokensJson.radius);
    expect(space).toEqual(tokensJson.space);
  });

  it('has every text style', () => {
    const fromJson = Object.fromEntries(
      Object.entries(tokensJson.typography).map(([name, v]) => {
        const [platform, key] = name.split('/');
        return [camel(platform === 'ios' ? `ios-${key}` : key), v];
      }),
    );
    expect(textStyles).toEqual(fromJson);
  });

  it('colours are lowercase hex', () => {
    for (const value of [...Object.values(tokensJson.color), ...Object.values(tokensJson.iosColor)]) {
      expect(value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  });
});

describe('typography', () => {
  it('uses the Inter file for each weight', () => {
    expect(typography.cardTitle).toEqual({ fontSize: 16, fontFamily: 'Inter-SemiBold' });
    expect(typography.iosLargeTitle).toEqual({
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: 0.4,
      fontFamily: 'Inter-Bold',
    });
  });

  it('sets the Fraunces axes WONK 1, SOFT 0', () => {
    expect(typography.pageTitle).toEqual({
      fontSize: 30,
      fontFamily: 'Fraunces',
      fontWeight: '600',
      fontVariationSettings: "'wght' 600, 'opsz' 30, 'SOFT' 0, 'WONK' 1",
    });
  });
});
