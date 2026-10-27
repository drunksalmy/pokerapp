import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Chip } from '@/components/poker/chip-amount';
import { PlayingCard } from '@/components/poker/playing-card';
import {
  AvatarGradients,
  CardSize,
  CLOCK_CRITICAL_MS,
  Palette,
  Ring,
  Status
} from '@/constants/poker-theme';
import { formatChips, type HandPlayerView, type SeatView } from '@/lib/poker';

export const AVATAR = 64;
const RING_WIDTH = 3;
const RING_BOX = AVATAR + RING_WIDTH * 2 + 4;
const PILL_HEIGHT = 18;
const PILL_GAP = 4;

/** Width of the seat widget, and how far down it the avatar's centre sits. */
export const SEAT_WIDTH = 108;
export const SEAT_HEIGHT = 156;
export const SEAT_ANCHOR_Y = PILL_HEIGHT + PILL_GAP + RING_BOX / 2;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function avatarGradient(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AvatarGradients[hash % AvatarGradients.length];
}

interface Props {
  seat: SeatView | null;
  player?: HandPlayerView;
  isToAct: boolean;
  isDealer: boolean;
  /** Time left on this seat's action clock. Null when it isn't on the clock. */
  remainingMs: number | null;
  totalMs: number;
  /** Showdown: this player's cards are face-up. */
  revealed: boolean;
  /** Empty chairs are tappable only before you have a seat. */
  canSit: boolean;
  onSit?: () => void;
}

/**
 * An opponent around the table: status pill, avatar, then name, stack and
 * current bet as plain text. Your own seat is drawn differently (your cards and
 * the bank panel), so this component never renders the viewer.
 */
export function Seat({
  seat,
  player,
  isToAct,
  isDealer,
  remainingMs,
  totalMs,
  revealed,
  canSit,
  onSit
}: Props) {
  if (!seat) {
    return (
      <View style={styles.wrap}>
        <View style={styles.pillSpace} />
        <Pressable
          style={[styles.empty, !canSit && styles.emptyClosed]}
          onPress={onSit}
          disabled={!canSit}
          hitSlop={6}>
          <Text style={styles.emptyPlus}>{canSit ? '+' : ''}</Text>
          <Text style={styles.emptyLabel}>{canSit ? 'Sit here' : 'Open'}</Text>
        </Pressable>
      </View>
    );
  }

  const folded = player?.folded ?? false;
  const allIn = player?.allIn ?? false;
  const away = seat.sittingOut || !seat.connected;

  // No pill for someone who is seated but waiting for the next hand.
  const status = player
    ? folded
      ? Status.out
      : allIn
        ? Status.allIn
        : Status.in
    : away
      ? Status.away
      : null;

  const onClock = isToAct && remainingMs !== null;
  const fraction = onClock ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const ringColor = !onClock
    ? 'transparent'
    : remainingMs <= CLOCK_CRITICAL_MS
      ? Ring.critical
      : fraction > 0.5
        ? Ring.acting
        : Ring.warning;

  const radius = (RING_BOX - RING_WIDTH) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const [from, to] = avatarGradient(seat.userId);
  const showCards = revealed && player && player.holeCards.length === 2;

  return (
    <View style={styles.wrap}>
      {status ? (
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      ) : (
        <View style={styles.pillSpace} />
      )}

      <View style={styles.ringBox}>
        {onClock && (
          <Svg width={RING_BOX} height={RING_BOX} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={radius}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={RING_WIDTH}
              fill="none"
            />
            {/* Drains clockwise from the top as the action clock runs down. */}
            <Circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={RING_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference * fraction} ${circumference}`}
              transform={`rotate(-90 ${RING_BOX / 2} ${RING_BOX / 2})`}
            />
          </Svg>
        )}

        <View style={[styles.avatar, (folded || away) && styles.avatarDimmed]}>
          <LinearGradient
            colors={[from, to]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.initials}>{initials(seat.name)}</Text>
        </View>

        {showCards && (
          // Showdown only: the two cards fan over the lower half of the avatar.
          <View style={styles.cards} pointerEvents="none">
            {[0, 1].map(i => (
              <PlayingCard
                key={i}
                card={player!.holeCards[i]}
                width={CardSize.seat.w}
                height={CardSize.seat.h}
                tilt={i === 0 ? -8 : 8}
              />
            ))}
          </View>
        )}

        {!seat.connected && <View style={styles.offline} />}
        {isDealer && (
          <View style={styles.dealer}>
            <Text style={styles.dealerText}>D</Text>
          </View>
        )}
      </View>

      <Text style={[styles.name, (folded || away) && styles.textDimmed]} numberOfLines={1}>
        {seat.name}
      </Text>
      <Text style={styles.stack}>{formatChips(player?.stack ?? seat.stack)}</Text>
      {player && player.betThisRound > 0 && (
        <View style={styles.bet}>
          <Chip size={12} color="#2a2338" />
          <Text style={styles.betText}>{formatChips(player.betThisRound)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: SEAT_WIDTH, height: SEAT_HEIGHT },
  pillSpace: { height: PILL_HEIGHT + PILL_GAP },
  pill: {
    height: PILL_HEIGHT,
    marginBottom: PILL_GAP,
    paddingHorizontal: 9,
    borderRadius: PILL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  ringBox: {
    width: RING_BOX,
    height: RING_BOX,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarDimmed: { opacity: 0.45 },
  initials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 3
  },
  cards: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    gap: -10
  },
  offline: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8A9299',
    borderWidth: 2,
    borderColor: Palette.bar
  },
  dealer: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.bar
  },
  dealerText: { color: '#3a2a05', fontSize: 11, fontWeight: '900' },
  name: {
    marginTop: 4,
    color: Palette.text,
    fontSize: 15,
    fontWeight: '700',
    maxWidth: SEAT_WIDTH
  },
  stack: { marginTop: 1, color: Palette.textDim, fontSize: 13, fontWeight: '600' },
  textDimmed: { opacity: 0.6 },
  bet: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  betText: { color: Palette.gold, fontSize: 12, fontWeight: '800' },
  empty: {
    width: AVATAR,
    height: AVATAR,
    marginTop: (RING_BOX - AVATAR) / 2,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyClosed: { borderColor: 'rgba(255,255,255,0.12)' },
  emptyPlus: { color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: '300', marginTop: -4 },
  emptyLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' }
});
