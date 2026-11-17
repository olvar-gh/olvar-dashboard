import { AccountPane } from '../web/AccountPane';
import { SettingsFrame } from '../web/SettingsFrame';

export function AccountScreen() {
  return (
    <SettingsFrame active="account">
      <AccountPane />
    </SettingsFrame>
  );
}
