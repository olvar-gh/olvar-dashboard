import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgCamera = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M8.458 2.333H5.542l-1.459 1.75h-1.75A1.167 1.167 0 0 0 1.167 5.25v5.25a1.167 1.167 0 0 0 1.166 1.167h9.334a1.167 1.167 0 0 0 1.166-1.167V5.25a1.167 1.167 0 0 0-1.166-1.167h-1.75z" />
      <Path d="M7 9.333a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5" />
    </G>
  </Svg>
);
export default SvgCamera;
