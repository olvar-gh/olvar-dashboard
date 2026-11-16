import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgInfo = (props: SvgProps) => (
  <Svg width={12} height={12} fill="none" viewBox="0 0 12 12" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M6 10.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9M6 8V6m0-2h.005" />
    </G>
  </Svg>
);
export default SvgInfo;
