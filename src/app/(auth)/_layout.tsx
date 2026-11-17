import { Redirect, Slot, useGlobalSearchParams } from 'expo-router';
import { useState } from 'react';

import { safeNext } from '@/components/shell';
import { useSession } from '@/data';

export default function AuthLayout() {
  const { session, isLoading } = useSession();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  // The redirect clears the query before this layout unmounts; a second redirect without `next` would win.
  const [target, setTarget] = useState(next);
  if (next && next !== target) setTarget(next);
  if (isLoading) return null;
  if (session) return <Redirect href={safeNext(target)} />;
  return <Slot />;
}
