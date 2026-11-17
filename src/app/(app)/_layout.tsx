import { Redirect, usePathname } from 'expo-router';

import { AppShell, hrefs } from '@/components/shell';
import { usePlant, useSession } from '@/data';

/** Session gate: signed-out visitors go to sign in and come back to the page they asked for. */
export default function AppLayout() {
  const { session, isLoading } = useSession();
  const pathname = usePathname();
  const plant = usePlant();
  if (isLoading) return null;
  if (!session) {
    return <Redirect href={{ pathname: hrefs.signIn, params: pathname === hrefs.home ? {} : { next: pathname } }} />;
  }
  return <AppShell noPlant={plant.data === null} />;
}
