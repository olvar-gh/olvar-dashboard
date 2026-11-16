import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSearch = (props: SvgProps) => (
  <Svg width={16} height={16} fill="none" viewBox="0 0 16 16" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M7.333 12a4.667 4.667 0 1 0 0-9.333 4.667 4.667 0 0 0 0 9.333M13.333 13.333 11 11" />
    </G>
  </Svg>
);
export default SvgSearch;
