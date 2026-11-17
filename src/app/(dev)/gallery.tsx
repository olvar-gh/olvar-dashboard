import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChartsGallery } from '@/components/charts/ChartsGallery';

// Placeholder route from the T0 scaffold; T2 replaces it.
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID="gallery-scroll"
      contentContainerStyle={{
        alignItems: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <Text>Gallery</Text>
      <ChartsGallery />
    </ScrollView>
  );
}
