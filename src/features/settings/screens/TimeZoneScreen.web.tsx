import { Redirect } from 'expo-router';

import { hrefs } from '@/components/shell';

/** The desktop Account pane picks the time zone in a dialog. */
export function TimeZoneScreen() {
  return <Redirect href={hrefs.account} />;
}
