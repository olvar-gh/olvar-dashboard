import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgClock = (props: SvgProps) => (
  <Svg width={24} height={24} fill="none" viewBox="0 0 24 24" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" />
      <Path d="M12 7v5l3 2" />
    </G>
  </Svg>
);
export default SvgClock;
