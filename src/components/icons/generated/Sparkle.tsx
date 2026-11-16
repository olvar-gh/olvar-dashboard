import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSparkle = (props: SvgProps) => (
  <Svg width={13} height={13} fill="none" viewBox="0 0 13 13" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m6.5 1.625 1.03 2.763 2.762 1.029-2.763 1.029L6.5 9.208 5.472 6.446l-2.763-1.03 2.763-1.029z"
    />
  </Svg>
);
export default SvgSparkle;
