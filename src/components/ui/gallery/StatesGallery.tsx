import { StyleSheet, View } from 'react-native';

import { useBreakpoint } from '@/theme';

import { Button } from '../Button';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Notice } from '../Notice';
import { OfflineBanner } from '../OfflineBanner';
import { SkeletonCard } from '../Skeleton';
import { StatusPill } from '../StatusPill';
import { GallerySection, METRIC, OVERALL, Row } from './shared';

/** Status pills, banners and the loading / empty / error states. */
export function StatesGallery() {
  const bp = useBreakpoint();
  const columns = bp.isDesktop ? styles.columns : styles.stack;
  return (
    <View style={styles.root}>
      <GallerySection title="Status and banners">
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
      </GallerySection>

      <GallerySection title="Loading, empty and error">
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
      </GallerySection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 28 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 24 },
  stack: { gap: 16 },
  flex: { flex: 1, minWidth: 0 },
});
