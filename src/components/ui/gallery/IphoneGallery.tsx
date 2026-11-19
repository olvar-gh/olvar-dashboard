import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors, iosColors, typography } from '@/theme';

import { confirmAlert, showActionSheet } from '../alert';
import { BrandHeader } from '../BrandHeader';
import { Button } from '../Button';
import { Field } from '../Field';
import { GlassButton } from '../GlassButton';
import { GlassSurface } from '../GlassSurface';
import { IosListRow, ListRow } from '../ListRow';
import { RangeCard } from '../RangeCard';
import { SearchField } from '../SearchField';
import { ListSection } from '../Section';
import { Segmented } from '../Segmented';
import { appTabs } from '../tabs';
import { GallerySection, Row } from './shared';

const RANGES = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

type Range = (typeof RANGES)[number]['value'];

/** The Figma iPhone components, as the iOS variants render them. */
export function IphoneGallery({ onOpenSheet }: { onOpenSheet: () => void }) {
  const [range, setRange] = useState<Range>('24h');
  const [preset, setPreset] = useState(true);
  const [email, setEmail] = useState('');
  const [last, setLast] = useState('-');
  const native = Platform.OS !== 'web';

  return (
    <View style={styles.root}>
      <GallerySection title="Brand header">
        <BrandHeader />
      </GallerySection>

      <GallerySection title="Search field">
        <SearchField placeholder="Search" />
      </GallerySection>

      {native ? (
        <GallerySection title="Form rows and buttons">
          <ListSection>
            <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Field separator label="Password" placeholder="Required" secureTextEntry />
          </ListSection>
          <Button size="large" label="Sign In" />
          <Button size="large" variant="plain" label="Create Account" />
          <Button size="large" variant="destructive" label="Sign Out" />
          <Row>
            <Button label="Save" />
            <Button label="Recalibrate" variant="secondary" />
            <Button label="Remove" variant="destructive" />
            <Button label="Cancel" variant="plain" />
          </Row>
        </GallerySection>
      ) : null}

      <GallerySection title="List section and rows">
        <ListSection header="Care targets" footer="Ranges follow the Spathiphyllum preset. Turn it off to set your own.">
          <IosListRow icon="sliders" iconTint={colors.brand.sage} label="Use preset" accessory="toggle" on={preset} onToggle={setPreset} />
          <IosListRow separator icon="droplet" iconTint={iosColors.accentBlue} label="Soil moisture" value="35–60%" accessory="chevron" onPress={() => {}} />
          <IosListRow separator icon="sun" iconTint={iosColors.accentYellow} label="Light" value="500–1,500 lux" accessory="chevron" onPress={() => {}} />
          <IosListRow separator icon="check" iconTint={colors.brand.olive} label="Cheerful" accessory="check" onPress={() => {}} />
          <IosListRow separator label="Added" value="Nov 2, 2026" />
        </ListSection>
        {native ? (
          <ListSection header="Devices">
            <ListRow icon="wifi" title="olvar-gateway" status={{ label: 'Online', live: true }} onPress={() => {}} />
            <ListRow divider icon="cpu" title="olvar-node" subtitle="ESP32 · every minute" status={{ label: 'Offline', live: false }} />
            <ListRow divider icon="sliders" title="Soil probe" action={<Button label="Recalibrate" variant="secondary" />} />
          </ListSection>
        ) : null}
      </GallerySection>

      <GallerySection title="Range card">
        {native ? <Segmented accessibilityLabel="Range" options={RANGES} value={range} onChange={setRange} /> : null}
        <RangeCard testID="range-soil" caption="Soil moisture" value="42" status="% · Getting dry" unit="%" min={0} max={100} minLabel="0%" maxLabel="100%" low={35} high={60} current={42} color={iosColors.accentBlue} />
        <RangeCard caption="Light" value="1,240" status="lux · Just right" unit=" lux" min={0} max={4000} minLabel="0" maxLabel="4,000 lux" low={500} high={1500} current={1240} color={iosColors.accentYellow} />
        <RangeCard caption="Temperature" value="23.4" status="°C · Just right" unit=" °C" min={10} max={35} minLabel="10 °C" maxLabel="35 °C" low={18} high={27} current={23.4} color={iosColors.accentOrange} />
        <RangeCard caption="Humidity" value="-" status="Read failed at 14:02" unit="%" min={0} max={100} minLabel="0%" maxLabel="100%" low={40} high={70} current={null} color={iosColors.accentTeal} />
      </GallerySection>

      <GallerySection title="Glass buttons">
        <Row>
          <GlassButton icon="chevLeft" accessibilityLabel="Back" testID="glass-back" />
          <GlassButton icon="bell" accessibilityLabel="Notifications" />
          <GlassButton icon="plus" accessibilityLabel="Add" disabled />
        </Row>
      </GallerySection>

      {native ? (
        <GallerySection title="Alert, action sheet and sheet">
          <Text style={styles.note}>Last choice: {last}</Text>
          <Row>
            <Button
              label="Alert"
              variant="secondary"
              onPress={async () => {
                const ok = await confirmAlert({ title: 'Remove Sparks?', message: 'Readings stay on the gateway.', confirmLabel: 'Remove', destructive: true });
                setLast(ok ? 'Remove' : 'Cancel');
              }}
            />
            <Button
              label="Action sheet"
              variant="secondary"
              onPress={async () => {
                const i = await showActionSheet({ title: 'Soil probe', options: ['Recalibrate', 'Forget device'], destructiveIndex: 1 });
                setLast(i === null ? 'Cancel' : ['Recalibrate', 'Forget device'][i]);
              }}
            />
            <Button label="Sheet" variant="secondary" onPress={onOpenSheet} testID="open-modal" />
          </Row>
        </GallerySection>
      ) : null}

      <GallerySection title="Tab bar">
        <Text style={styles.note}>The app shell uses the system Liquid Glass tab bar with these items; this is a static preview.</Text>
        <GlassSurface style={styles.tabBar}>
          {appTabs.map((t, i) => (
            <View key={t.name} style={[styles.tab, i === 0 && styles.tabActive]}>
              <Icon name={t.icon} size={24} color={i === 0 ? colors.brand.olive : iosColors.labelPrimary} />
              <Text style={[styles.tabLabel, i === 0 && { color: colors.brand.olive }]}>{t.label}</Text>
            </View>
          ))}
        </GlassSurface>
      </GallerySection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 28 },
  note: { ...typography.iosFootnote, color: iosColors.labelSecondary, paddingHorizontal: 4 },
  tabBar: { flexDirection: 'row', alignItems: 'center', height: 62, borderRadius: 1000, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, height: 54, borderRadius: 100 },
  tabActive: { backgroundColor: iosColors.fillVibrantTertiary },
  tabLabel: { ...typography.iosTabLabel, color: iosColors.labelPrimary },
});
