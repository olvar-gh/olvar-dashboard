import { useRouter } from 'expo-router';

import { useSession } from '@/data';

import { hrefs } from './navigation';

/** Props for PageHeader's account avatar: the owner's initial, opening Settings → Account. */
export function useAccountButton(): { avatar?: string; onAvatarPress: () => void } {
  const { session } = useSession();
  const router = useRouter();
  const initial = (session?.name?.trim() || session?.email || '').slice(0, 1).toUpperCase();
  return { avatar: initial || undefined, onAvatarPress: () => router.push(hrefs.account) };
}
