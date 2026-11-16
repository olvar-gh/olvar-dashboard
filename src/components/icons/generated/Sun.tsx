import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSun = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
    >
      <Path d="M7 9.333a2.333 2.333 0 1 0 0-4.666 2.333 2.333 0 0 0 0 4.666M7 1.167v1.166m0 9.334v1.166M2.876 2.876l.822.822m6.604 6.604.822.822M1.167 7h1.166m9.334 0h1.166m-9.135 3.302-.822.822m8.248-8.248-.822.822" />
    </G>
  </Svg>
);
export default SvgSun;
