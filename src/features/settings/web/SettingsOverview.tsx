import { useEffect, useRef, type ComponentRef } from 'react';
import { View } from 'react-native';

import { CareTargetsCard } from './CareTargetsCard';
import { DevicesCard } from './DevicesCard';
import { PlantProfileCard } from './PlantProfileCard';
import { SettingsFrame } from './SettingsFrame';

type Section = 'plant' | 'care' | 'devices';

/** Desktop Settings: the plant, care-target and device cards on one page; the nav scrolls to a card. */
export function SettingsOverview({ active }: { active: Section }) {
  const care = useRef<ComponentRef<typeof View>>(null);
  const devices = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const target = active === 'care' ? care.current : active === 'devices' ? devices.current : null;
    // On web a View ref is the DOM element.
    const el = target as unknown as { scrollIntoView?: (o: ScrollIntoViewOptions) => void } | null;
    if (el?.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    else if (active === 'plant') globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [active]);
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
