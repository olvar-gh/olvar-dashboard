import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgUpdown = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M4.083 8.75 7 11.667 9.917 8.75m-5.834-3.5L7 2.333 9.917 5.25"
    />
  </Svg>
);
export default SvgUpdown;
