import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgBell = (props: SvgProps) => (
  <Svg width={22} height={22} fill="none" viewBox="0 0 22 22" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M5.5 7.333a5.5 5.5 0 1 1 11 0c0 6.417 2.75 8.25 2.75 8.25H2.75S5.5 13.75 5.5 7.333M9.442 19.25a1.778 1.778 0 0 0 3.117 0" />
    </G>
  </Svg>
);
export default SvgBell;
