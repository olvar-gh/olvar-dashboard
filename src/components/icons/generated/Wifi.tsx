import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgWifi = (props: SvgProps) => (
  <Svg width={18} height={18} fill="none" viewBox="0 0 18 18" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M3.75 9.413a8.25 8.25 0 0 1 10.5 0m-7.875 2.91a4.5 4.5 0 0 1 5.25 0M1.5 6.615a11.25 11.25 0 0 1 15 0M9 15h.008"
    />
  </Svg>
);
export default SvgWifi;
