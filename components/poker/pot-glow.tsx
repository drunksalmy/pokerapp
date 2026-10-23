import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { Palette } from '@/constants/poker-theme';

/**
 * The violet wash behind the pot number, fading downward into the felt.
 * This is what makes the table read as lit from the pot rather than as a flat
 * dark rectangle -- it matters more than it sounds (CONTEXT.md 12.2).
 *
 * Radial gradients need SVG; expo-linear-gradient is linear only.
 */
export function PotGlow({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="potGlow" cx="50%" cy="0%" rx="50%" ry="100%">
            <Stop offset="0" stopColor={Palette.accent} stopOpacity={0.42} />
            <Stop offset="0.4" stopColor={Palette.accent} stopOpacity={0.16} />
            <Stop offset="1" stopColor={Palette.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width / 2}
          cy={0}
          rx={width * 0.42}
          ry={height}
          fill="url(#potGlow)"
        />
      </Svg>
    </View>
  );
}
