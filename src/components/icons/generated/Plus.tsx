import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgPlus = (props: SvgProps) => (
  <Svg width={22} height={22} fill="none" viewBox="0 0 22 22" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 4.583v12.834M4.584 11h12.833"
    />
  </Svg>
);
export default SvgPlus;
