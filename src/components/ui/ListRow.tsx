import { View } from 'react-native';

import { colors } from '@/theme';

import { IosListRow } from './IosListRow';
import type { ListRowProps } from './ListRow.types';

export type { ListRowProps, ListRowStatus } from './ListRow.types';
export { IosListRow, type IosListAccessory, type IosListRowProps } from './IosListRow';

/** On iOS a list row is the grouped iPhone row: icon tile, title, status as the value. Put it in a ListSection. */
export function ListRow({ title, subtitle, icon = 'leaf', status, action, divider = false, onPress, style, testID }: ListRowProps) {
  const row = (
    <IosListRow
      label={title}
      subtitle={subtitle}
      icon={icon}
      iconTint={colors.text.secondary}
      value={status?.label}
      valueDot={status ? (status.live ? colors.status.live : colors.text.tertiary) : undefined}
      trailing={action}
      accessory={onPress ? 'chevron' : 'none'}
      onPress={onPress}
      separator={divider}
      testID={testID}
    />
  );
  return style ? <View style={style}>{row}</View> : row;
}
