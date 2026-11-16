import { useContext, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  GlassButton,
  IosListRow,
  ListRow,
  ListSection,
  Modal,
  ModalCard,
  NavBar,
  Notice,
  OfflineBanner,
  PageHeader,
  Segmented,
  SelectField,
  SkeletonCard,
  StatusPill,
} from '@/components/ui';
import { colors, iosColors, typography, useAppFonts, useBreakpoint } from '@/theme';

const OVERALL: [string, string][] = [
  ['great', 'Thriving'],
  ['okay', 'Doing okay'],
  ['needs_attention', 'Needs attention'],
  ['in_trouble', 'In trouble'],
  ['offline', 'Offline'],
  ['no_data', 'No data yet'],
];

const METRIC: [string, string][] = [
  ['critical_low', 'Too dry'],
  ['low', 'Getting dry'],
  ['ok', 'Just right'],
  ['high', 'A bit warm'],
  ['critical_high', 'Too hot'],
  ['unknown', 'No data'],
];

const RANGES = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
] as const;

type Range = (typeof RANGES)[number]['value'];

export default function GalleryScreen() {
  const [fontsLoaded, fontError] = useAppFonts();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const bp = useBreakpoint();
  const [range, setRange] = useState<Range>('24h');
  const [preset, setPreset] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('Sparks');
  const columns = bp.isDesktop ? styles.columns : styles.stack;
  const padY = bp.shell.paddingTop || 16;

  // Text measured before the custom fonts load keeps its fallback width on iOS, which truncates labels.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingHorizontal: bp.shell.paddingX || 16, paddingTop: insets.top + padY, paddingBottom: insets.bottom + padY }}>
      <View testID="gallery" style={[styles.content, { maxWidth: bp.isDesktop ? bp.contentWidth : undefined }]}>
        <PageHeader
          title="Gallery"
          subtitle={`UI primitives and states · tier ${bp.tier} · ${bp.width}px`}
          dateNav={{ label: 'Fri, Nov 6, 2026', prevLabel: 'Previous week', nextLabel: 'Next week', nextDisabled: true }}
          avatar="D"
        />

        <Section title="Buttons">
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
        </Section>

        <Section title="Range, status and banners">
          <Row>
            <Segmented accessibilityLabel="Range" options={RANGES} value={range} onChange={setRange} />
          </Row>
          <Row>
            {OVERALL.map(([key, label]) => (
              <StatusPill key={key} status={key} label={label} />
            ))}
          </Row>
          <Row>
            {METRIC.map(([key, label]) => (
              <StatusPill key={key} kind="metric" status={key} label={label} />
            ))}
          </Row>
          <OfflineBanner since="14:02" detail="Last reading 14:02 · values resume when it reconnects" />
          <Notice>Care targets will follow the Spathiphyllum preset. You can adjust them later in Settings.</Notice>
          <Notice tone="warn" action={<Button label="Calibrate" variant="secondary" />}>
            Soil sensor not calibrated. Showing the raw value.
          </Notice>
        </Section>

        <View style={columns}>
          <Card
            title="Plant profile"
            subtitle="Name and location shown across the app"
            actions={<Button label="Save" />}
            style={styles.flex}
          >
            <Field label="Nickname" value={name} onChangeText={setName} maxLength={60} />
            <Field label="Location" placeholder="e.g. Living room window" hint="Up to 60 characters" />
            <SelectField label="Time zone" value="Asia/Seoul" />
            <Field label="Species" value="Spathiphyllum" editable={false} />
          </Card>
          <Card title="Devices" subtitle="Sensors stay paired to the gateway." style={styles.flex}>
            <View>
              <ListRow icon="wifi" title="olvar-gateway" subtitle="Raspberry Pi 3B · Wi-Fi · MQTT" status={{ label: 'Live', live: true }} />
              <ListRow divider icon="cpu" title="olvar-node" subtitle="ESP32 · every minute" status={{ label: 'Offline', live: false }} />
              <ListRow
                divider
                icon="droplet"
                title="Soil probe"
                subtitle="Capacitive v1.2 · GPIO34"
                status={{ label: 'Live', live: true }}
                action={<Button label="Recalibrate" variant="secondary" onPress={() => setModalOpen(true)} />}
              />
            </View>
          </Card>
        </View>

        <View style={columns}>
          <Card title="Recent insights" minHeight={232} style={styles.flex}>
            <EmptyState comingSoon title="Insights are coming soon" body="Sparks will point out trends here." />
          </Card>
          <Card title="Chat" minHeight={232} style={styles.flex}>
            <EmptyState icon="chat" title="No messages yet" body="Ask Sparks how it’s doing." action={{ label: 'Open chat', onPress: () => {} }} />
          </Card>
        </View>

        <View style={columns}>
          <SkeletonCard minHeight={232} style={styles.flex} testID="skeleton-card" />
          <ErrorState title="Soil moisture" minHeight={232} onRetry={() => {}} style={styles.flex} />
        </View>

        <Section title="Modal">
          <ModalCard
            title="Recalibrate soil probe"
            subtitle="Values update every minute"
            cancel={{ label: 'Cancel', onPress: () => {} }}
            confirm={{ label: 'Save', onPress: () => {} }}
          >
            <Notice>Hold the probe in dry air, then capture.</Notice>
          </ModalCard>
          <Row>
            <Button label="Open modal" variant="secondary" onPress={() => setModalOpen(true)} testID="open-modal" />
          </Row>
        </Section>

        <Section title="iPhone">
          <View style={styles.phone}>
            <NavBar
              title="Settings"
              onBack={() => {}}
              trailing={<GlassButton icon="gear" accessibilityLabel="Settings" testID="glass-gear" />}
            />
            <ListSection header="Care targets" footer="Ranges will follow the Spathiphyllum preset. You can change them later in Settings.">
              <IosListRow icon="sliders" iconTint={colors.brand.sage} label="Use preset" accessory="toggle" on={preset} onToggle={setPreset} />
              <IosListRow separator icon="droplet" iconTint={iosColors.accentBlue} label="Soil moisture" value="40–70 %" accessory="chevron" onPress={() => {}} />
              <IosListRow separator icon="sun" iconTint={iosColors.accentYellow} label="Light" value="Bright" accessory="check" onPress={() => {}} />
              <IosListRow separator label="Added" value="Nov 2, 2026" />
            </ListSection>
            <View style={styles.phoneButtons}>
              <Button size="ios" label="Save" />
              <Button size="ios" variant="destructive" label="Sign out" />
              <Button size="ios" variant="plain" label="Cancel" />
            </View>
          </View>
        </Section>
      </View>

      <Modal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        title="Recalibrate soil probe"
        subtitle="Values update every minute"
        cancel={{ label: 'Cancel', onPress: () => setModalOpen(false) }}
        confirm={{ label: 'Save', onPress: () => setModalOpen(false) }}
        testID="modal"
      >
        <Notice>Hold the probe in dry air, then capture.</Notice>
      </Modal>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg.canvas },
  content: { width: '100%', gap: 32 },
  section: { gap: 12 },
  sectionTitle: { ...typography.cardTitle, color: colors.text.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 24 },
  stack: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
  phone: { width: '100%', maxWidth: 402, padding: 16, gap: 8, backgroundColor: colors.bg.sidebar, borderRadius: 24 },
  phoneButtons: { gap: 8, marginTop: 8 },
});
