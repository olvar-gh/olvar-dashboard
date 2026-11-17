import * as React from "react";
import Svg, { G, Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgOlvarMark = (props: SvgProps) => (
  <Svg
    width={34.857}
    height={44}
    fill="none"
    viewBox="0 0 34.857 44"
    {...props}
  >
    <G id="Logo/Olvar mark">
      <Path
        id="Olvar logo"
        fill="#7D8A64"
        d="M18.286 0a3.143 3.143 0 0 1 3.142 3.143v18.089c2.71-1.951 6.047-4.601 9.66-7.685a2.286 2.286 0 0 1 2.967 3.477c-4.788 4.088-9.298 7.6-12.626 9.75v14.083a3.143 3.143 0 1 1-6.286 0v-6.073c-3.726-2.38-8.86-6.374-14.34-11.044a2.286 2.286 0 1 1 2.965-3.48c4.294 3.66 8.24 6.782 11.375 9.006V18.763c-2.927-1.916-6.814-4.946-10.915-8.455A2.286 2.286 0 0 1 7.2 6.835c2.937 2.512 5.668 4.692 7.943 6.358V3.143A3.143 3.143 0 0 1 18.286 0"
      />
    </G>
  </Svg>
);
export default SvgOlvarMark;
