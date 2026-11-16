import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgThermo = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M8.167 2.333v6.149a2.333 2.333 0 1 1-2.334 0V2.333a1.167 1.167 0 1 1 2.334 0"
    />
  </Svg>
);
export default SvgThermo;
