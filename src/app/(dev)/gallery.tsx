import { ScrollView, Text } from 'react-native';

import { ChartsGallery } from '@/components/charts/ChartsGallery';

// Placeholder route from the T0 scaffold; T2 replaces it.
export default function GalleryScreen() {
  return (
    <ScrollView testID="gallery-scroll" contentContainerStyle={{ alignItems: 'center' }}>
      <Text>Gallery</Text>
      <ChartsGallery />
    </ScrollView>
  );
}
