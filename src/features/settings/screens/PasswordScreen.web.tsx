import { Redirect } from 'expo-router';

import { hrefs } from '@/components/shell';

/** The desktop Account pane edits the password inline. */
export function PasswordScreen() {
  return <Redirect href={hrefs.account} />;
}
