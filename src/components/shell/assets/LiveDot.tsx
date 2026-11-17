import * as React from "react";
import Svg, { G, Circle, Defs, RadialGradient, Stop, Filter, FeFlood, FeColorMatrix, FeOffset, FeGaussianBlur, FeBlend } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgLiveDot = (props: SvgProps) => (
  <Svg width={18} height={18} fill="none" viewBox="0 0 18 18" {...props}>
    <G id="Live dot">
      <G id="Halo" filter="url(#filter0_f_0_50)" opacity={0.5}>
        <Circle cx={9} cy={9} r={6} fill="#C7FD56" />
      </G>
      <G id="Core" filter="url(#filter1_d_0_50)">
        <Circle cx={9} cy={9} r={4} fill="url(#paint0_radial_0_50)" />
      </G>
    </G>
    <Defs>
      <Filter id="filter0_f_0_50" x={0} y={0} width={18} height={18} filterUnits="userSpaceOnUse">
        <FeFlood floodOpacity={0} result="BackgroundImageFix" />
        <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <FeGaussianBlur stdDeviation={1.5} result="effect1_foregroundBlur_0_50" />
      </Filter>
      <Filter id="filter1_d_0_50" x={2} y={2} width={14} height={14} filterUnits="userSpaceOnUse">
        <FeFlood floodOpacity={0} result="BackgroundImageFix" />
        <FeColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <FeOffset />
        <FeGaussianBlur stdDeviation={1.5} />
        <FeColorMatrix type="matrix" values="0 0 0 0 0.780392 0 0 0 0 0.992157 0 0 0 0 0.337255 0 0 0 0.9 0" />
        <FeBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_0_50" />
        <FeBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_0_50" result="shape" />
      </Filter>
      <RadialGradient
        id="paint0_radial_0_50"
        cx={0}
        cy={0}
        r={1}
        gradientTransform="matrix(4 0 0 4 9 9)"
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor="#FAFFE6" />
        <Stop offset={0.6} stopColor="#C7FD56" />
        <Stop offset={1} stopColor="#B8F047" />
      </RadialGradient>
    </Defs>
  </Svg>
);
export default SvgLiveDot;
