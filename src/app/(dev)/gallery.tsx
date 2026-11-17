import { useContext, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ChartsGallery } from '@/components/charts/ChartsGallery';
import { Modal, Notice, PageHeader } from '@/components/ui';
import { iosGroupedBackground } from '@/components/ui/color';
import { DesktopGallery } from '@/components/ui/gallery/DesktopGallery';
import { IphoneGallery } from '@/components/ui/gallery/IphoneGallery';
import { GallerySection } from '@/components/ui/gallery/shared';
import { StatesGallery } from '@/components/ui/gallery/StatesGallery';
import { colors, iosColors, typography, useAppFonts, useBreakpoint } from '@/theme';

const isWeb = Platform.OS === 'web';

export default function GalleryScreen() {
  const [fontsLoaded, fontError] = useAppFonts();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const bp = useBreakpoint();
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  // Text measured before the custom fonts load keeps its fallback width on iOS, which truncates labels.
  if (!fontsLoaded && !fontError) return null;

  const meta = `UI primitives and states · ${Platform.OS} · tier ${bp.tier} · ${bp.width}px`;
  const dateNav = { label: 'Fri, Nov 6, 2026', prevLabel: 'Previous week', nextLabel: 'Next week', nextDisabled: true };
  const header = isWeb ? (
    <PageHeader title="Gallery" subtitle={meta} dateNav={dateNav} avatar="D" />
  ) : (
    <>
      <PageHeader title="Gallery" dateNav={dateNav} avatar="D" />
      <Text style={styles.meta}>
        <Text>Gallery</Text> · {meta} · {dateNav.label}
      </Text>
    </>
  );

  return (
    <ScrollView
      testID="gallery-scroll"
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.page, !isWeb && styles.pageIos]}
      contentContainerStyle={
        isWeb
          ? { paddingHorizontal: bp.shell.paddingX || 16, paddingTop: insets.top + (bp.shell.paddingTop || 16), paddingBottom: 40 }
          : styles.contentIos
      }
    >
      <View testID="gallery" style={[styles.content, isWeb && bp.isDesktop && { maxWidth: bp.contentWidth }]}>
        {header}
        {isWeb ? (
          <>
            <DesktopGallery onOpenModal={openModal} />
            <StatesGallery />
            <ChartsGallery />
            <GallerySection title="iPhone components (web preview)">
              <View style={styles.phone}>
                <IphoneGallery onOpenSheet={openModal} />
              </View>
            </GallerySection>
          </>
        ) : (
          <>
            <IphoneGallery onOpenSheet={openModal} />
            <StatesGallery />
            <ChartsGallery />
          </>
        )}
      </View>

      <Modal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
        title="Recalibrate"
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg.canvas },
  pageIos: { backgroundColor: iosGroupedBackground },
  contentIos: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
  content: { width: '100%', gap: 32 },
  meta: { ...typography.iosSubheadline, color: iosColors.labelSecondary, marginTop: -16 },
  phone: { width: '100%', maxWidth: 402, padding: 16, backgroundColor: iosGroupedBackground, borderRadius: 24 },
});
