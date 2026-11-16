import type { ReactNode } from 'react';

export type PageHeaderDateNav = {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel?: string;
  nextLabel?: string;
};

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Page actions slot. */
  actions?: ReactNode;
  dateNav?: PageHeaderDateNav;
  /** Initial shown in the olive avatar circle. */
  avatar?: string;
  onAvatarPress?: () => void;
};
