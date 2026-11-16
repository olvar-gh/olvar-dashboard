import { LineArea, type LineAreaProps } from './LineArea';

export type StepLineProps = Omit<LineAreaProps, 'curve'>;

/** Soil moisture: each reading holds until the next, so a watering shows as a vertical jump. */
export function StepLine(props: StepLineProps) {
  return <LineArea testID="step-line" {...props} curve="step" />;
}
