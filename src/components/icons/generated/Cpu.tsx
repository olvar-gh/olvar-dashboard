import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgCpu = (props: SvgProps) => (
  <Svg width={13} height={13} fill="none" viewBox="0 0 13 13" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M9.208 2.708H3.792c-.599 0-1.084.485-1.084 1.084v5.416c0 .599.485 1.084 1.084 1.084h5.416c.599 0 1.084-.485 1.084-1.084V3.792c0-.599-.485-1.084-1.084-1.084" />
      <Path d="M8.125 4.875h-3.25v3.25h3.25zM4.875 1.083v1.625m3.25-1.625v1.625m-3.25 7.584v1.625m3.25-1.625v1.625M1.083 4.875h1.625m-1.625 3.25h1.625m7.584-3.25h1.625m-1.625 3.25h1.625" />
    </G>
  </Svg>
);
export default SvgCpu;
