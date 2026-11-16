import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgSliders = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      d="M2.833 14.875V9.917m0-2.834V2.125M8.5 14.875V8.5m0-2.833V2.125m5.667 12.75v-3.542m0-2.833V2.125M.708 9.917h4.25m1.417-4.25h4.25m1.417 5.666h4.25"
    />
  </Svg>
);
export default SvgSliders;
