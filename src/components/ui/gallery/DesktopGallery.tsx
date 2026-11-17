import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useBreakpoint } from '@/theme';

import { Button } from '../Button';
import { Card } from '../Card';
import { Field, SelectField } from '../Field';
import { ListRow } from '../ListRow';
import { ModalCard } from '../Modal';
import { Notice } from '../Notice';
import { Segmented } from '../Segmented';
import { GallerySection, Row } from './shared';

const RANGES = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
] as const;

type Range = (typeof RANGES)[number]['value'];

/** The Figma Desktop components, as the web variants render them. */
export function DesktopGallery({ onOpenModal }: { onOpenModal: () => void }) {
  const bp = useBreakpoint();
  const [range, setRange] = useState<Range>('24h');
  const [name, setName] = useState('Sparks');
  const columns = bp.isDesktop ? styles.columns : styles.stack;
  // flex: 1 means flexBasis 0, which collapses a card's height when the columns stack vertically.
  const column = bp.isDesktop ? styles.flex : undefined;

  return (
    <View style={styles.root}>
      <GallerySection title="Buttons">
        <Row>
          <Button label="Save" />
          <Button label="Cancel" variant="secondary" />
          <Button label="Remove" variant="destructive" />
          <Button label="Saving" loading />
          <Button label="Disabled" disabled />
        </Row>
        <Row>
          <Button label="Sign in" size="large" />
          <Button label="Change password" size="large" variant="secondary" />
          <Button label="Sign out" size="large" variant="destructive" />
        </Row>
      </GallerySection>

      <GallerySection title="Range">
        <Row>
          <Segmented accessibilityLabel="Range" options={RANGES} value={range} onChange={setRange} />
        </Row>
      </GallerySection>

      <View style={columns}>
        <Card title="Plant profile" subtitle="Name and location shown across the app" actions={<Button label="Save" />} style={column} testID="plant-profile">
          <Field label="Nickname" value={name} onChangeText={setName} maxLength={60} />
          <Field label="Location" placeholder="e.g. Living room window" hint="Up to 60 characters" />
          <SelectField label="Time zone" value="Asia/Seoul" />
          <Field label="Species" value="Spathiphyllum" editable={false} />
        </Card>
        <Card title="Devices" subtitle="Sensors stay paired to the gateway." style={column} testID="devices">
          <View>
            <ListRow icon="wifi" title="olvar-gateway" subtitle="Raspberry Pi 3B · Wi-Fi · MQTT" status={{ label: 'Live', live: true }} />
            <ListRow divider icon="cpu" title="olvar-node" subtitle="ESP32 · every minute" status={{ label: 'Offline', live: false }} />
            <ListRow
              divider
              icon="droplet"
              title="Soil probe"
              subtitle="Capacitive v1.2 · GPIO34"
              status={{ label: 'Live', live: true }}
              action={<Button label="Recalibrate" variant="secondary" onPress={onOpenModal} />}
            />
          </View>
        </Card>
      </View>

      <GallerySection title="Modal">
        <ModalCard
          title="Recalibrate soil probe"
          subtitle="Values update every minute"
          cancel={{ label: 'Cancel', onPress: () => {} }}
          confirm={{ label: 'Save', onPress: () => {} }}
        >
          <Notice>Hold the probe in dry air, then capture.</Notice>
        </ModalCard>
        <Row>
          <Button label="Open modal" variant="secondary" onPress={onOpenModal} testID="open-modal" />
        </Row>
      </GallerySection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 32 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 24 },
  stack: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
});
