import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgWifiOff = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.417}
      d="M8.5 14.167h.007m-2.486-2.53a3.54 3.54 0 0 1 4.958 0M3.542 9.11a7.1 7.1 0 0 1 3.662-1.905m6.254 1.905a7 7 0 0 0-1.423-1.076M1.417 6.248a10.6 10.6 0 0 1 2.96-1.878m11.206 1.877a10.63 10.63 0 0 0-7.997-2.663m-6.17-2.167 14.167 14.166"
    />
  </Svg>
);
export default SvgWifiOff;
