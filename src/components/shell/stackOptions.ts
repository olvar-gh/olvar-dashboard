import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { iosGroupedBackground } from '@/components/ui/color';
import { iosColors, typography } from '@/theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/** Native iOS header defaults: large title over the scroll view, Liquid Glass bar, minimal back button. */
export const nativeStackOptions = {
  headerLargeTitle: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerLargeTitleStyle: { fontFamily: typography.iosLargeTitle.fontFamily, color: iosColors.labelPrimary },
  headerTitleStyle: { fontFamily: typography.iosSubheadlineEmphasized.fontFamily, color: iosColors.labelPrimary },
  contentStyle: { backgroundColor: iosGroupedBackground },
} satisfies StackOptions;

