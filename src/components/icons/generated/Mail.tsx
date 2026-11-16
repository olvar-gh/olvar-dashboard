import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgMail = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <G stroke="currentColor" strokeWidth={1.417}>
      <Path d="M14.167 2.833H2.833c-.782 0-1.416.635-1.416 1.417v8.5c0 .782.634 1.417 1.416 1.417h11.334c.782 0 1.416-.635 1.416-1.417v-8.5c0-.782-.634-1.417-1.416-1.417Z" />
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.583 4.958 9.23 8.996a1.37 1.37 0 0 1-1.46 0L1.418 4.958"
      />
    </G>
  </Svg>
);
export default SvgMail;
