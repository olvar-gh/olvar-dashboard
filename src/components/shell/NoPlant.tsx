import { StyleSheet, View } from 'react-native';

import { Card, EmptyState } from '@/components/ui';
import { useSignOut } from '@/data';

import { PageScroll } from './PageScroll';

/** Shown instead of every screen while the gateway setup has not created the plant row. */
export function NoPlant() {
  const signOut = useSignOut();
  return (
    <PageScroll testID="no-plant" contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.body}>
          <EmptyState
            title="No plant set up yet"
            body="Run the gateway setup to add your plant and its sensors, then reload this page."
            action={{ label: 'Sign out', onPress: () => signOut.mutate() }}
          />
        </View>
      </Card>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 96 },
  body: { minHeight: 240 },
});
