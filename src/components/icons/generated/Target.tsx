import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgTarget = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M8.5 14.875a6.375 6.375 0 1 0 0-12.75 6.375 6.375 0 0 0 0 12.75" />
      <Path d="M8.5 12.042a3.542 3.542 0 1 0 0-7.084 3.542 3.542 0 0 0 0 7.084" />
      <Path d="M8.5 9.208a.708.708 0 1 0 0-1.416.708.708 0 0 0 0 1.416" />
    </G>
  </Svg>
);
export default SvgTarget;
