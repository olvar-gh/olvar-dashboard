import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { View } from 'react-native';

import { useLatest, usePlant, useThresholds } from '@/data';

import { CareTargetsCard } from './CareTargetsCard';
import { DevicesCard } from './DevicesCard';
import { PlantProfileCard } from './PlantProfileCard';
import { SettingsFrame } from './SettingsFrame';

type Section = 'plant' | 'care' | 'devices';

/** Desktop Settings: the plant, care-target and device cards on one page; the nav scrolls to a card. */
export function SettingsOverview({ active }: { active: Section }) {
  const care = useRef<ComponentRef<typeof View>>(null);
  const devices = useRef<ComponentRef<typeof View>>(null);
  // The cards above the target start as skeletons, so scroll again once they first hold their real
  // height. Later refetches (after a save) must not move the page.
  const pending = [usePlant(), useThresholds(), useLatest()].some((q) => q.isPending);
  const laidOut = useRef(false);
  const scrollToActive = useCallback(() => {
    const target = active === 'care' ? care.current : active === 'devices' ? devices.current : null;
    // On web a View ref is the DOM element.
    const el = target as unknown as { scrollIntoView?: (o: ScrollIntoViewOptions) => void } | null;
    if (el?.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    else if (active === 'plant') globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [active]);
  useEffect(scrollToActive, [scrollToActive]);
  useEffect(() => {
    if (pending || laidOut.current) return;
    laidOut.current = true;
    scrollToActive();
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <SettingsFrame active={active}>
      <PlantProfileCard />
      <View ref={care}>
        <CareTargetsCard />
      </View>
      <View ref={devices}>
        <DevicesCard />
      </View>
    </SettingsFrame>
  );
}
