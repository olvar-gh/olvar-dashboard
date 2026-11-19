import { onlineManager } from '@tanstack/react-query';
import { getNetworkStateAsync } from 'expo-network';

/**
 * Whether the device has no connection right now. React Query only hears the browser's
 * online/offline events, so on iPhone it always reports online; ask the OS as well.
 * An unknown state counts as online, so a failed check never blocks a send.
 */
export async function isOffline(): Promise<boolean> {
  if (!onlineManager.isOnline()) return true;
  try {
    const state = await getNetworkStateAsync();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}
