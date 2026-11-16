import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSprout = (props: SvgProps) => (
  <Svg width={18} height={18} fill="none" viewBox="0 0 18 18" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M5.25 15h7.5M7.5 15c4.125-1.875.6-4.8 2.25-7.5" />
      <Path d="M7.125 7.05c.825.6 1.35 1.65 1.725 2.775-1.5.3-2.625.3-3.6-.225-.9-.45-1.725-1.425-2.25-3.15 2.1-.375 3.3 0 4.125.6M10.575 4.5a5.25 5.25 0 0 0-.825 3c1.425-.075 2.475-.45 3.225-1.05.75-.75 1.2-1.725 1.275-3.45-2.025.075-3 .75-3.675 1.5" />
    </G>
  </Svg>
);
export default SvgSprout;
