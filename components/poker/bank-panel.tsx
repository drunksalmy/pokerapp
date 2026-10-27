import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Chip } from '@/components/poker/chip-amount';
import { CLOCK_CRITICAL_MS, Palette, Status } from '@/constants/poker-theme';
import { formatChips } from '@/lib/poker';

const PILL_W = 120;
const PILL_H = 40;
const PILL_STROKE = 2;

interface Props {
  stack: number;
  /** What you have in front of you this betting round. */
  bet: number;
  isDealer: boolean;
  allIn: boolean;
  isMyTurn: boolean;
  remainingMs: number | null;
  totalMs: number;
}

/**
 * Your side of the table, bottom right: dealer chip, current bet, your stack
 * labelled Bank, and the Your Turn pill whose gold border drains as the action
 * clock runs down.
 */
export function BankPanel({ stack, bet, isDealer, allIn, isMyTurn, remainingMs, totalMs }: Props) {
  return (
    <View style={styles.column} pointerEvents="none">
      {isDealer && (
        <View style={styles.dealer}>
          <Text style={styles.dealerText}>D</Text>
        </View>
      )}
      {allIn && (
        <View style={[styles.allIn, { backgroundColor: Status.allIn.bg }]}>
          <Text style={[styles.allInText, { color: Status.allIn.fg }]}>{Status.allIn.label}</Text>
        </View>
      )}
      {bet > 0 && (
        <View style={styles.bet}>
          <Chip size={13} color="#2a2338" />
          <Text style={styles.betText}>Bet {formatChips(bet)}</Text>
        </View>
      )}
      <View style={styles.stackRow}>
        <View style={styles.coin} />
        <Text style={styles.stack}>{formatChips(stack)}</Text>
      </View>
      <Text style={styles.label}>Bank</Text>
      {isMyTurn && <TurnPill remainingMs={remainingMs} totalMs={totalMs} />}
    </View>
  );
}

function TurnPill({ remainingMs, totalMs }: { remainingMs: number | null; totalMs: number }) {
  const ms = Math.max(0, remainingMs ?? 0);
  const fraction = Math.min(1, ms / totalMs);
  const seconds = Math.ceil(ms / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const urgent = ms <= CLOCK_CRITICAL_MS;

  // Perimeter of a stadium shape: two straights plus one full circle.
  const w = PILL_W - PILL_STROKE;
  const h = PILL_H - PILL_STROKE;
  const perimeter = 2 * (w - h) + Math.PI * h;

  return (
    <View style={styles.pill}>
      <Svg width={PILL_W} height={PILL_H} style={StyleSheet.absoluteFill}>
        <Rect
          x={PILL_STROKE / 2}
          y={PILL_STROKE / 2}
          width={w}
          height={h}
          rx={h / 2}
          fill="rgba(20,17,29,0.92)"
          stroke="rgba(245,200,76,0.18)"
          strokeWidth={PILL_STROKE}
        />
        <Rect
          x={PILL_STROKE / 2}
          y={PILL_STROKE / 2}
          width={w}
          height={h}
          rx={h / 2}
          fill="none"
          stroke={urgent ? Palette.danger : Palette.gold}
          strokeWidth={PILL_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${perimeter * fraction} ${perimeter}`}
        />
      </Svg>
      <Text style={styles.pillText}>Your Turn!</Text>
      <Text style={[styles.pillClock, urgent && styles.pillClockUrgent]}>{clock}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'flex-end', gap: 4 },
  dealer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 2
  },
  dealerText: { color: '#3a2a05', fontSize: 14, fontWeight: '900' },
  allIn: { paddingHorizontal: 9, height: 18, borderRadius: 9, justifyContent: 'center' },
  allInText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  bet: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  betText: { color: Palette.gold, fontSize: 13, fontWeight: '800' },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  coin: { width: 14, height: 14, borderRadius: 7, backgroundColor: Palette.gold },
  stack: { color: Palette.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  label: { color: Palette.textDim, fontSize: 12, fontWeight: '600', marginTop: -4 },
  pill: {
    marginTop: 6,
    width: PILL_W,
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  pillText: { color: Palette.text, fontSize: 13, fontWeight: '700' },
  pillClock: { color: Palette.textDim, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillClockUrgent: { color: Palette.danger }
});
