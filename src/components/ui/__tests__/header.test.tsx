import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';

import { NavBar, PageHeader } from '..';

type Node = { type: string; props: Record<string, unknown>; children: Node[] | null } | Node[] | string | null;

function headerConfig(node: Node): Record<string, unknown> | null {
  if (!node || typeof node === 'string') return null;
  if (Array.isArray(node)) return node.map(headerConfig).find(Boolean) ?? null;
  return node.type === 'RNSScreenStackHeaderConfig' ? node.props : headerConfig(node.children);
}

const sf = (items: unknown) => (items as { icon: { name: string }; accessibilityLabel: string }[]).map((i) => [i.accessibilityLabel, i.icon.name]);

describe('native header (iOS)', () => {
  it('NavBar sets a large title and SF Symbol toolbar buttons on the native stack header', async () => {
    await renderRouter({
      _layout: () => <Stack />,
      index: () => <NavBar title="Settings" onBack={() => {}} actions={[{ label: 'Add', sf: 'plus', icon: 'plus' }]} />,
    });
    const config = headerConfig(screen.toJSON() as Node)!;
    expect(config).toMatchObject({ title: 'Settings', largeTitle: true, largeTitleFontFamily: 'Inter-Bold' });
    expect(sf(config.headerLeftBarButtonItems)).toEqual([['Back', 'chevron.left']]);
    expect(sf(config.headerRightBarButtonItems)).toEqual([['Add', 'plus']]);
  });

  it('PageHeader maps date navigation and account to toolbar buttons and keeps the subtitle in the page', async () => {
    await renderRouter({
      _layout: () => <Stack />,
      index: () => <PageHeader title="Timeline" subtitle="This week" avatar="D" dateNav={{ label: 'Nov 6', nextDisabled: true }} />,
    });
    expect(screen.getByText('This week · Nov 6')).toBeTruthy();
    const config = headerConfig(screen.toJSON() as Node)!;
    // UIKit lists right bar items from the trailing edge inwards.
    expect(sf(config.headerRightBarButtonItems)).toEqual([
      ['Account', 'person.crop.circle'],
      ['Next', 'chevron.right'],
      ['Previous', 'chevron.left'],
    ]);
  });
});
