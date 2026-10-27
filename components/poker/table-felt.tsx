import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { Felt } from '@/constants/poker-theme';

const RAIL = 20;

/**
 * The table surface: a dark rail with the felt inside it. Given a square box it
 * draws a true circle, which is how the table screen uses it. Radial gradients
 * need SVG — expo-linear-gradient is linear only.
 *
 * Only the top arc of the circle is on screen, so the light sits high, under
 * the pot, rather than at the circle's true centre.
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
          <RadialGradient id="feltFill" cx="50%" cy="24%" rx="58%" ry="58%">
            <Stop offset="0" stopColor={Felt.centre} />
            <Stop offset="0.5" stopColor={Felt.mid} />
            <Stop offset="1" stopColor={Felt.edge} />
          </RadialGradient>
          <RadialGradient id="railFill" cx="50%" cy="20%" rx="60%" ry="60%">
            <Stop offset="0" stopColor={Felt.railHighlight} />
            <Stop offset="1" stopColor={Felt.rail} />
          </RadialGradient>
        </Defs>

        {/* A faint lit edge on the rail, so the table's outline reads against
            the dark room the way it does in the design. */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx - 1}
          ry={ry - 1}
          fill="url(#railFill)"
          stroke="rgba(185,163,255,0.16)"
          strokeWidth={1.5}
        />
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
