import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgChevLeft = (props: SvgProps) => (
  <Svg width={22} height={22} fill="none" viewBox="0 0 22 22" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
      d="M13.75 16.5 8.25 11l5.5-5.5"
    />
  </Svg>
);
export default SvgChevLeft;
