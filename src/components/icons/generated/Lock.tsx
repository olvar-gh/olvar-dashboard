import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgLock = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <Path
      fill="#3B4630"
      d="M9.625 6.417h-5.25c-.805 0-1.458.653-1.458 1.458v2.917c0 .805.653 1.458 1.458 1.458h5.25c.806 0 1.458-.653 1.458-1.458V7.875c0-.805-.652-1.458-1.458-1.458"
    />
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.4}
      d="M4.667 6.417v-1.75a2.333 2.333 0 1 1 4.666 0v1.75"
    />
  </Svg>
);
export default SvgLock;
