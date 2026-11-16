import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgLeaf = (props: SvgProps) => (
  <Svg width={17} height={17} fill="none" viewBox="0 0 17 17" {...props}>
    <G
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    >
      <Path d="M7.792 14.167a4.959 4.959 0 0 1-.85-9.846c4.037-.78 5.1-1.148 6.516-2.904.709 1.416 1.417 2.96 1.417 5.666 0 3.896-3.386 7.084-7.083 7.084" />
      <Path d="M1.417 14.875c0-2.125 1.31-3.797 3.598-4.25C6.729 10.285 8.5 9.208 9.208 8.5" />
    </G>
  </Svg>
);
export default SvgLeaf;
