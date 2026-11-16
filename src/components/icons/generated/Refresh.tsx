import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgRefresh = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.417}
      d="M14.875 8.5a6.375 6.375 0 1 1-1.87-4.505l1.87 1.672m-3.542 0h3.542V2.125"
    />
  </Svg>
);
export default SvgRefresh;
