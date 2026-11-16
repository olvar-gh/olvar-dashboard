import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgAlert = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
    >
      <Path d="m7.296 2.763-6.02 9.987a1.417 1.417 0 0 0 1.203 2.125h12.042a1.417 1.417 0 0 0 1.204-2.125l-6.02-9.987a1.417 1.417 0 0 0-2.41 0M8.5 6.375v2.833m0 2.834h.007" />
    </G>
  </Svg>
);
export default SvgAlert;
