import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgDroplet = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M7 12.833a4.084 4.084 0 0 0 4.083-4.083c0-1.167-.583-2.275-1.75-3.208S7.292 3.208 7 1.75c-.292 1.458-1.167 2.858-2.333 3.792s-1.75 2.041-1.75 3.208A4.083 4.083 0 0 0 7 12.833"
    />
  </Svg>
);
export default SvgDroplet;
