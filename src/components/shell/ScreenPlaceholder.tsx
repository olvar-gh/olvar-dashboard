import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, PageHeader } from '@/components/ui';

import { PageScroll } from './PageScroll';
import { useAccountButton } from './useAccountButton';

export type ScreenPlaceholderProps = {
  title: string;
  /** What the finished screen will show. */
  body?: string;
};

/** Stand-in for a screen that has not been built yet, inside the real shell (header, scroll, tabs). */
export function ScreenPlaceholder({ title, body }: ScreenPlaceholderProps) {
  const account = useAccountButton();
  return (
    <PageScroll testID="screen-placeholder">
      <PageHeader title={title} {...account} />
      <Card minHeight={232}>
        <View style={styles.body}>
          <EmptyState comingSoon title={title} body={body} />
        </View>
      </Card>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, minHeight: 192 },
});
