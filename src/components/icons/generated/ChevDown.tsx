import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgChevDown = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.6}
      d="M3.5 5.25 7 8.75l3.5-3.5"
    />
  </Svg>
);
export default SvgChevDown;
