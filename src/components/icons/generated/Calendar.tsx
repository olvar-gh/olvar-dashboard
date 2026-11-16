import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgCalendar = (props: SvgProps) => (
  <Svg width={14} height={14} fill="none" viewBox="0 0 14 14" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M11.083 2.333H2.917c-.645 0-1.167.523-1.167 1.167v8.167c0 .644.522 1.166 1.167 1.166h8.166c.645 0 1.167-.522 1.167-1.166V3.5c0-.644-.522-1.167-1.167-1.167M9.333 1.167V3.5M4.667 1.167V3.5M1.75 5.833h10.5" />
    </G>
  </Svg>
);
export default SvgCalendar;
