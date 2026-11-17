import type { SFSymbol } from 'sf-symbols-typescript';

import type { IconName } from '@/components/icons';

export type NavBarAction = {
  label: string;
  /** SF Symbol for the native iOS toolbar button. */
  sf: SFSymbol;
  /** Olvar icon for the web glass button. */
  icon: IconName;
  onPress?: () => void;
  disabled?: boolean;
};

export type NavBarProps = {
  title: string;
  /** Shows a back button; on iOS the native stack adds one by itself when there is history. */
  onBack?: () => void;
  backLabel?: string;
  /** Trailing toolbar buttons. */
  actions?: readonly NavBarAction[];
};
