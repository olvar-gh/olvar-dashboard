import { Text, View } from 'react-native';

import { ChartsGallery } from '@/components/charts/ChartsGallery';

// Placeholder route from the T0 scaffold; T2 replaces it.
export default function GalleryScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Gallery</Text>
      <ChartsGallery />
    </View>
  );
}
