import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgDroplets = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
    >
      <Path d="M4.083 9.508c1.284 0 2.334-1.067 2.334-2.362 0-.677-.333-1.319-.998-1.861a3.9 3.9 0 0 1-1.336-2.193 3.84 3.84 0 0 1-1.336 2.193c-.67.537-.997 1.19-.997 1.86 0 1.296 1.05 2.363 2.333 2.363" />
      <Path d="M7.327 3.85a6.4 6.4 0 0 0 .84-2.088C8.458 3.22 9.333 4.62 10.5 5.553c1.167.934 1.75 2.042 1.75 3.209a4.072 4.072 0 0 1-6.948 2.899" />
    </G>
  </Svg>
);
export default SvgDroplets;
