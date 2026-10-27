import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { AnimatedRect } from '@/components/poker/animated-svg';
import { ChipAspect, ChipImages } from '@/constants/poker-assets';
import { CLOCK_CRITICAL_MS, Palette, Status } from '@/constants/poker-theme';
import { useClock } from '@/hooks/use-clock';
import { formatChips } from '@/lib/poker';

const PILL_W = 122;
const PILL_H = 40;
const PILL_STROKE = 2;
// The pulse is pure opacity and scale, so it can run on the native driver.
const NATIVE = Platform.OS !== 'web';

interface Props {
  stack: number;
  /** What you have in front of you this betting round. */
  bet: number;
  isDealer: boolean;
  allIn: boolean;
  isMyTurn: boolean;
  /** When your action clock runs out, while it is your turn. */
  deadline: number | null;
  totalMs: number;
}

/**
 * Your side of the table, bottom right: dealer button, current bet, your stack
 * labelled Bank, and the Your Turn capsule, whose gold border drains as the
 * action clock runs down while its glow pulses.
 */
export function BankPanel({ stack, bet, isDealer, allIn, isMyTurn, deadline, totalMs }: Props) {
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
          <Image source={ChipImages.blue} style={{ width: 13 * ChipAspect.blue, height: 13 }} />
          <Text style={styles.betText}>Bet {formatChips(bet)}</Text>
        </View>
      )}
      <View style={styles.stackRow}>
        <Image source={ChipImages.gold} style={{ width: 20 * ChipAspect.gold, height: 20 }} />
        <Text style={styles.stack}>{formatChips(stack)}</Text>
      </View>
      <Text style={styles.label}>Bank</Text>
      {isMyTurn && <TurnPill deadline={deadline} totalMs={totalMs} />}
    </View>
  );
}

function TurnPill({ deadline, totalMs }: { deadline: number | null; totalMs: number }) {
  const { progress, remainingMs } = useClock(deadline, totalMs);
  const [pulse] = useState(() => new Animated.Value(0));

  // A slow breathing glow while it is your turn, so the capsule draws the eye.
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE
        })
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [pulse]);

  const seconds = Math.ceil(remainingMs / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const urgent = remainingMs <= CLOCK_CRITICAL_MS;
  const accent = urgent ? Palette.danger : Palette.gold;

  // Perimeter of a stadium shape: two straights plus one full circle.
  const w = PILL_W - PILL_STROKE;
  const h = PILL_H - PILL_STROKE;
  const perimeter = 2 * (w - h) + Math.PI * h;

  return (
    <View style={styles.pillWrap}>
      <Animated.View
        style={[
          styles.pillGlow,
          {
            backgroundColor: urgent ? 'rgba(255,77,79,0.35)' : 'rgba(245,200,76,0.32)',
            shadowColor: accent,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }]
          }
        ]}
      />
      <View style={styles.pill}>
        <Svg width={PILL_W} height={PILL_H} style={StyleSheet.absoluteFill}>
          <Rect
            x={PILL_STROKE / 2}
            y={PILL_STROKE / 2}
            width={w}
            height={h}
            rx={h / 2}
            fill="rgba(20,17,29,0.94)"
            stroke="rgba(245,200,76,0.18)"
            strokeWidth={PILL_STROKE}
          />
          <AnimatedRect
            x={PILL_STROKE / 2}
            y={PILL_STROKE / 2}
            width={w}
            height={h}
            rx={h / 2}
            fill="none"
            stroke={accent}
            strokeWidth={PILL_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${perimeter} ${perimeter}`}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [perimeter, 0]
            })}
          />
        </Svg>
        <Text style={styles.pillText}>Your Turn!</Text>
        <Text style={[styles.pillClock, urgent && styles.pillClockUrgent]}>{clock}</Text>
      </View>
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
  stack: { color: Palette.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  label: { color: Palette.textDim, fontSize: 12, fontWeight: '600', marginTop: -4 },
  pillWrap: { marginTop: 8, width: PILL_W, height: PILL_H },
  pillGlow: {
    position: 'absolute',
    left: -5,
    top: -5,
    width: PILL_W + 10,
    height: PILL_H + 10,
    borderRadius: (PILL_H + 10) / 2,
    // iOS turns this into a real coloured glow; elsewhere the translucent
    // capsule above carries the pulse on its own.
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 }
  },
  pill: {
    width: PILL_W,
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  pillText: { color: Palette.text, fontSize: 13, fontWeight: '700' },
  pillClock: {
    color: Palette.textDim,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  pillClockUrgent: { color: Palette.danger }
});
