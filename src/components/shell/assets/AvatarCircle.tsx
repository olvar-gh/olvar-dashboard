import * as React from "react";
import Svg, { G, Rect, Path, Defs, Filter, FeFlood, FeColorMatrix, FeOffset, FeGaussianBlur, FeBlend } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgAvatarCircle = (props: SvgProps) => (
  <Svg width={196} height={196} fill="none" viewBox="0 0 196 196" {...props}>
    <G id="Avatar circle" filter="url(#filter0_d_0_33)">
      <Rect width={176} height={176} x={10} y={8} fill="#fff" rx={88} />
      <Path
        id="Olvar mark"
        fill="#7D8A64"
        d="M100.104 40a7.714 7.714 0 0 1 7.714 7.714v44.4c6.652-4.788 14.842-11.293 23.708-18.862a5.611 5.611 0 0 1 7.285 8.535c-11.753 10.033-22.823 18.652-30.993 23.932v34.567a7.714 7.714 0 0 1-15.429 0v-14.908c-9.144-5.843-21.745-15.645-35.197-27.108a5.61 5.61 0 1 1 7.278-8.54c10.539 8.981 20.224 16.645 27.92 22.105v-25.78c-7.185-4.704-16.725-12.141-26.791-20.753a5.611 5.611 0 0 1 7.295-8.526c7.21 6.168 13.911 11.518 19.495 15.608v-24.67A7.714 7.714 0 0 1 100.104 40"
      />
    </G>
    <Defs>
      <Filter id="filter0_d_0_33" x={0} y={0} width={196} height={196} filterUnits="userSpaceOnUse">
        <FeFlood floodOpacity={0} result="BackgroundImageFix" />
        <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <FeOffset dy={2} />
        <FeGaussianBlur stdDeviation={5} />
        <FeColorMatrix type="matrix" values="0 0 0 0 0.12 0 0 0 0 0.14 0 0 0 0 0.1 0 0 0 0.06 0" />
        <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_33" />
        <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_33" result="shape" />
      </Filter>
    </Defs>
  </Svg>
);
export default SvgAvatarCircle;
