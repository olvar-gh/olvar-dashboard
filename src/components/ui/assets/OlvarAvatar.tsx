import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgOlvarAvatar = (props: SvgProps) => (
  <Svg width={96} height={96} fill="none" viewBox="0 0 96 96" {...props}>
    <Rect width={96} height={96} fill="#EEF1E7" rx={48} />
    <Path
      fill="#7D8A64"
      d="M49.122 19.2a4.114 4.114 0 0 1 4.114 4.114v23.68c3.548-2.554 7.916-6.023 12.645-10.06a2.992 2.992 0 0 1 3.885 4.552c-6.268 5.352-12.172 9.948-16.53 12.764v18.436a4.114 4.114 0 1 1-8.228 0v-7.951c-4.877-3.116-11.598-8.344-18.772-14.458a2.992 2.992 0 1 1 3.881-4.554c5.621 4.79 10.786 8.877 14.89 11.789v-13.75c-3.831-2.508-8.92-6.474-14.287-11.068a2.993 2.993 0 0 1 3.89-4.547c3.845 3.29 7.42 6.143 10.398 8.324V23.314a4.114 4.114 0 0 1 4.114-4.114"
    />
  </Svg>
);
export default SvgOlvarAvatar;
