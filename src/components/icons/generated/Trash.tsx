import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgTrash = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.417}
      d="M2.125 4.25h12.75m-1.417 0v9.917a1.417 1.417 0 0 1-1.416 1.416H4.958a1.417 1.417 0 0 1-1.416-1.416V4.25m2.125 0V2.833a1.417 1.417 0 0 1 1.416-1.416h2.834a1.417 1.417 0 0 1 1.416 1.416V4.25"
    />
  </Svg>
);
export default SvgTrash;
