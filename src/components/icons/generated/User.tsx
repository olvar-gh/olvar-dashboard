import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgUser = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M8.5 8.5a2.833 2.833 0 1 0 0-5.667 2.833 2.833 0 0 0 0 5.667M2.833 14.875a5.667 5.667 0 1 1 11.334 0" />
    </G>
  </Svg>
);
export default SvgUser;
