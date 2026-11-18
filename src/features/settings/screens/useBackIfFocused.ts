import { useNavigation, useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * `router.back()` for a save that resolves later: if the owner already left this screen, going back
 * again would pop the screen they are on now (and its unsaved edits).
 */
export function useBackIfFocused() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    if (navigation.isFocused()) router.back();
  }, [navigation, router]);
}
