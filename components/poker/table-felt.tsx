import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { Felt } from '@/constants/poker-theme';

const RAIL = 14;

/**
 * The table surface: a dark rail with the felt inside it, lit from just above
 * the middle. Radial gradients need SVG — expo-linear-gradient is linear only.
 */
export function TableFelt({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="feltFill" cx="50%" cy="42%" rx="62%" ry="78%">
            <Stop offset="0" stopColor={Felt.centre} />
            <Stop offset="0.5" stopColor={Felt.mid} />
            <Stop offset="1" stopColor={Felt.edge} />
          </RadialGradient>
          <RadialGradient id="railFill" cx="50%" cy="35%" rx="60%" ry="75%">
            <Stop offset="0" stopColor={Felt.railHighlight} />
            <Stop offset="1" stopColor={Felt.rail} />
          </RadialGradient>
        </Defs>

        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#railFill)" />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx - RAIL}
          ry={ry - RAIL}
          fill="url(#feltFill)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
