import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PlayingCard } from '@/components/poker/playing-card';
import { CardSize, Palette, Ring } from '@/constants/poker-theme';
import { formatChips, type HandPlayerView, type SeatView } from '@/lib/poker';

const AVATAR = 42;
const RING_WIDTH = 3;

const AVATAR_COLORS = ['#4A6FA5', '#8E5A9E', '#3E8E7E', '#B5713F', '#96566B', '#5B7A3E'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface Props {
  seat: SeatView | null;
  player?: HandPlayerView;
  isViewer: boolean;
  isToAct: boolean;
  isDealer: boolean;
  /** 1 -> full clock remaining, 0 -> expired. Null when this seat is not on the clock. */
  remaining: number | null;
  /** Cards face-up: the viewer's own, or anyone still live at showdown. */
  revealed: boolean;
  onSit?: () => void;
}

export function Seat({
  seat,
  player,
  isViewer,
  isToAct,
  isDealer,
  remaining,
  revealed,
  onSit
}: Props) {
  if (!seat) {
    return (
      <Pressable style={styles.empty} onPress={onSit} hitSlop={6}>
        <Text style={styles.emptyChevron}>▾</Text>
        <Text style={styles.emptyLabel}>SIT HERE</Text>
      </Pressable>
    );
  }

  const folded = player?.folded ?? false;
  const allIn = player?.allIn ?? false;
  const inHand = Boolean(player);

  let ringColor = Ring.idle;
  if (folded) ringColor = Ring.folded;
  else if (allIn) ringColor = Ring.allIn;
  else if (isToAct && remaining !== null) {
    ringColor = remaining > 0.5 ? Ring.acting : remaining > 0.2 ? Ring.warning : Ring.critical;
  }

  const badge = allIn
    ? { label: 'ALL IN', color: Palette.allIn }
    : folded
      ? { label: 'FOLD', color: Palette.folded }
      : seat.sittingOut
        ? { label: 'AWAY', color: Palette.folded }
        : null;

  const size = AVATAR + RING_WIDTH * 2 + 4;
  const radius = (size - RING_WIDTH) / 2 - 1;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.wrap}>
      {inHand && (
        // The viewer's own cards are dealt larger — they are the ones you read.
        <View style={[styles.cards, isViewer && styles.cardsViewer]} pointerEvents="none">
          {[0, 1].map(i => (
            <PlayingCard
              key={i}
              card={revealed ? player!.holeCards[i] : undefined}
              width={isViewer ? CardSize.hero.w : CardSize.seat.w}
              height={isViewer ? CardSize.hero.h : CardSize.seat.h}
              tilt={i === 0 ? -8 : 8}
              dimmed={folded}
            />
          ))}
        </View>
      )}

      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isToAct && remaining !== null ? 'rgba(255,255,255,0.14)' : ringColor}
            strokeWidth={RING_WIDTH}
            fill="none"
          />
          {isToAct && remaining !== null && (
            // Drains clockwise from the top as the action clock runs down.
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={ringColor}
              strokeWidth={RING_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference * Math.max(0, remaining)} ${circumference}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>

        <View
          style={[
            styles.avatar,
            {
              backgroundColor: avatarColor(seat.userId),
              opacity: folded || seat.sittingOut ? 0.45 : 1
            }
          ]}>
          <Text style={styles.initials}>{initials(seat.name)}</Text>
        </View>

        {!seat.connected && <View style={styles.offline} />}
        {isDealer && (
          <View style={styles.dealer}>
            <Text style={styles.dealerText}>D</Text>
          </View>
        )}
      </View>

      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      )}

      {/* Name and stack share one plate: a separate name line makes the seat
          too tall for the top and bottom positions on a phone in landscape. */}
      <View style={[styles.plate, isViewer && styles.plateViewer]}>
        <Text style={styles.name} numberOfLines={1}>
          {seat.name}
        </Text>
        <Text style={styles.stackText}>{formatChips(player?.stack ?? seat.stack)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 88 },
  cards: {
    position: 'absolute',
    top: -6,
    flexDirection: 'row',
    gap: -8,
    zIndex: -1
  },
  // The viewer's own cards sit beside the avatar rather than behind it, so
  // they stay readable — this is the one hand you actually need to read.
  cardsViewer: { top: -12, left: 56, gap: -12, zIndex: 3 },
  avatar: {
    position: 'absolute',
    top: RING_WIDTH + 2,
    left: RING_WIDTH + 2,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
  offline: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#8A9299',
    borderWidth: 2,
    borderColor: '#0A1A14'
  },
  dealer: {
    position: 'absolute',
    right: -8,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.dealer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)'
  },
  dealerText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  badge: {
    marginTop: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  plate: {
    marginTop: -4,
    minWidth: 62,
    maxWidth: 88,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Palette.pill,
    borderWidth: 1,
    borderColor: Palette.pillBorder,
    alignItems: 'center'
  },
  plateViewer: { borderColor: 'rgba(34,209,138,0.55)' },
  stackText: { color: Palette.text, fontWeight: '800', fontSize: 11, lineHeight: 13 },
  name: { color: Palette.textDim, fontSize: 9, fontWeight: '600', lineHeight: 11 },
  empty: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: Palette.seatEmpty,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyChevron: { color: 'rgba(255,255,255,0.55)', fontSize: 16, marginBottom: -4 },
  emptyLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 }
});
