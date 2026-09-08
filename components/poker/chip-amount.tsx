import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Palette } from '@/constants/poker-theme';
import { formatChips } from '@/lib/poker';

/** A poker chip: dark disc with the classic edge spots around the rim. */
export function Chip({ size = 16, color = '#1B1E22' }: { size?: number; color?: string }) {
  const r = size / 2;
  const ringRadius = r * 0.72;
  const circumference = 2 * Math.PI * ringRadius;
  const dash = circumference / 12;

  return (
    <Svg width={size} height={size}>
      <Circle cx={r} cy={r} r={r - 0.5} fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      <Circle
        cx={r}
        cy={r}
        r={ringRadius}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={r * 0.42}
        strokeDasharray={`${dash} ${dash}`}
      />
      <Circle cx={r} cy={r} r={r * 0.46} fill={color} />
    </Svg>
  );
}

interface Props {
  amount: number;
  size?: number;
  emphasis?: boolean;
}

/** Chip + number, as it appears on the felt for bets and for the pot. */
export function ChipAmount({ amount, size = 16, emphasis = false }: Props) {
  if (!amount) return null;
  return (
    <View style={[styles.row, emphasis && styles.rowEmphasis]}>
      <Chip size={size} color={emphasis ? '#12161A' : '#1B1E22'} />
      <Text style={[styles.text, { fontSize: size * 0.82 }, emphasis && styles.textEmphasis]}>
        {formatChips(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 3
  },
  rowEmphasis: {
    backgroundColor: 'rgba(6,8,10,0.55)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  text: {
    color: Palette.text,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 }
  },
  textEmphasis: { fontWeight: '800' }
});
