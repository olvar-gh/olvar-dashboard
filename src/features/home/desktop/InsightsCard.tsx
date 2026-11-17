import { StyleSheet, View } from 'react-native';

import { Card, Notice } from '@/components/ui';

/** "Recent insights" placeholder (Figma 226:7652): the feature is deferred, so the card says it is coming soon. */
export function InsightsCard({ plantName, minHeight }: { plantName: string; minHeight: number }) {
  return (
    <Card testID="insights-card" title="Recent insights" subtitle="Coming soon" minHeight={minHeight} style={styles.card}>
      <View style={styles.body}>
        <Notice icon="leaf">
          Insights are coming soon. {plantName} will point out trends from your plant’s sensor history here.
        </Notice>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0 },
  body: { flex: 1, justifyContent: 'center' },
});
