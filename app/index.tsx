import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionBar } from '@/components/poker/action-bar';
import { ChipAmount } from '@/components/poker/chip-amount';
import { PlayingCard } from '@/components/poker/playing-card';
import { PotGlow } from '@/components/poker/pot-glow';
import { Seat } from '@/components/poker/seat';
import { TableFelt } from '@/components/poker/table-felt';
import { CardSize, Felt, Palette } from '@/constants/poker-theme';
import { usePokerTable } from '@/hooks/use-poker-table';
import {
  betPosition,
  carouselPositions,
  formatChips,
  type Action,
  type CarouselSlot
} from '@/lib/poker';

const SEAT_W = 88;
const SEAT_H = 100;
// A seat widget is avatar-on-top with the name plate below it, so its visual
// anchor is the avatar centre, not the middle of the box.
const SEAT_ANCHOR_Y = 26;
// Portrait: the table is a tall oval, so width is the binding constraint and
// the aspect is width/height rather than the old landscape 2.5.
const TABLE_ASPECT = 0.52;
const HEADER_SPACE = 58;
// The pot glow hangs from the top edge and fades out before the table rim.
const GLOW_HEIGHT = 190;
// Two rows in portrait: the slider line plus the button line.
const ACTION_BAR_SPACE = 104;
// Seats ride the rim, so the name plate hanging below the avatar overhangs the
// felt. The table has to be sized to leave room for it above the action bar.
const SEAT_BELOW_ANCHOR = 58;
const BUY_IN_BLINDS = 100;

const STAGE_LABEL: Record<string, string> = {
  preflop: 'Pre-flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  complete: 'Hand complete'
};

export default function TableScreen() {
  // Every client used to send the name "You", so every seat at the table read
  // "You" with the same initial. Until Phase 5 brings real accounts, each
  // client gets a distinct throwaway name for the life of the launch.
  const [displayName] = useState(() => `Player ${Math.floor(1000 + Math.random() * 9000)}`);

  const { snapshot, status, error, clearError, sit, act, sitOut, userId } = usePokerTable({
    tableId: 'main',
    name: displayName
  });

  const { width: screenWidth } = useWindowDimensions();
  const [feltBox, setFeltBox] = useState({ width: 0, height: 0 });
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Portrait only: the layout assumes a tall table with the viewer at the foot.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  // Drives the countdown ring. Only ticks while somebody is on the clock.
  const deadline = snapshot?.deadline ?? null;
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [deadline]);

  const hand = snapshot?.hand ?? null;
  const mySeat = snapshot?.you.seatIndex ?? null;
  const isMyTurn = Boolean(hand && hand.toAct === userId);
  const bounds = isMyTurn ? hand?.raiseBounds ?? null : null;

  // Reset the slider to the minimum legal raise each time the turn comes round.
  const boundsKey = bounds ? `${bounds.min}-${bounds.max}` : 'none';
  const lastBoundsKey = useRef('');
  useEffect(() => {
    if (boundsKey !== lastBoundsKey.current) {
      lastBoundsKey.current = boundsKey;
      if (bounds) setRaiseAmount(bounds.min);
    }
  }, [boundsKey, bounds]);

  // Which seat the carousel is turned to. Driven by whoever is to act, but it
  // holds its last position when it is the viewer's turn or between hands --
  // snapping the ring back to a default every time you act would be unreadable.
  const actingSeat = useMemo(() => {
    if (!hand?.toAct) return null;
    return hand.players.find(p => p.userId === hand.toAct)?.seatIndex ?? null;
  }, [hand]);

  const [focusSeat, setFocusSeat] = useState<number | null>(null);
  useEffect(() => {
    if (actingSeat !== null && actingSeat !== mySeat) setFocusSeat(actingSeat);
  }, [actingSeat, mySeat]);

  // Never spotlight an empty chair. Until somebody acts, and whenever the
  // remembered focus points at a seat nobody is sitting in, fall back to the
  // first occupied opponent going round from the viewer's left.
  const effectiveFocus = useMemo(() => {
    if (focusSeat !== null && snapshot?.seats[focusSeat]) return focusSeat;
    if (snapshot && mySeat !== null) {
      for (let step = 1; step < snapshot.maxSeats; step++) {
        const candidate = (mySeat + step) % snapshot.maxSeats;
        if (snapshot.seats[candidate]) return candidate;
      }
    }
    return focusSeat;
  }, [focusSeat, snapshot, mySeat]);

  const slots = useMemo(
    () => carouselPositions(snapshot?.maxSeats ?? 6, mySeat, effectiveFocus),
    [snapshot?.maxSeats, mySeat, effectiveFocus]
  );

  const slotBySeat = useMemo(() => {
    const map = new Map<number, CarouselSlot>();
    for (const slot of slots) map.set(slot.seatIndex, slot);
    return map;
  }, [slots]);

  const remaining = useMemo(() => {
    if (!deadline || !snapshot) return null;
    return Math.max(0, Math.min(1, (deadline - now) / snapshot.actionTimeoutMs));
  }, [deadline, now, snapshot]);

  const announcement = useMemo(() => {
    if (!hand) return null;
    if (hand.winners?.length) {
      return hand.winners
        .map(w => {
          const seat = snapshot?.seats.find(s => s?.userId === w.userId);
          return `${seat?.name ?? w.userId} wins ${formatChips(w.amount)}`;
        })
        .join('   ·   ');
    }
    return STAGE_LABEL[hand.stage] ?? null;
  }, [hand, snapshot]);

  const myStack = mySeat !== null ? snapshot?.seats[mySeat]?.stack ?? null : null;

  const handleSit = (seatIndex: number) => {
    if (!snapshot || mySeat !== null) return;
    sit(seatIndex, snapshot.bigBlind * BUY_IN_BLINDS);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[Felt.woodTop, Felt.woodBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowWrap} pointerEvents="none">
        <PotGlow width={screenWidth} height={GLOW_HEIGHT} />
      </View>

      {/* The felt owns the whole screen; the header and action bar float over
          it, which is what lets the table stay large on a phone. */}
      <View
        style={styles.arena}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          // Seats straddle the rim, so half a seat widget overhangs each side.
          const maxW = width - SEAT_W;
          const maxH = height - HEADER_SPACE - ACTION_BAR_SPACE - SEAT_BELOW_ANCHOR;
          let w = Math.min(maxW, maxH * TABLE_ASPECT);
          let h = w / TABLE_ASPECT;
          if (h > maxH) {
            h = maxH;
            w = h * TABLE_ASPECT;
          }
          setFeltBox({ width: w, height: h });
        }}>
        <View style={[styles.feltBox, { width: feltBox.width, height: feltBox.height }]}>
          <TableFelt width={feltBox.width} height={feltBox.height} />

          <View style={styles.centre} pointerEvents="none">
            <View style={styles.community}>
              {(hand?.community ?? []).map((card, i) => (
                <PlayingCard
                  key={`${i}-${card}`}
                  card={card}
                  width={CardSize.community.w}
                  height={CardSize.community.h}
                />
              ))}
            </View>

            {announcement && (
              <View style={styles.announcement}>
                <Text style={styles.announcementText}>{announcement}</Text>
              </View>
            )}
          </View>

          {/* Each player's chips, pulled off their seat toward the pot. */}
          {hand?.players.map(player => {
            if (!player.betThisRound) return null;
            const seatPos = slotBySeat.get(player.seatIndex);
            if (!seatPos || seatPos.opacity === 0) return null;
            const bet = betPosition(seatPos);
            return (
              <View
                key={`bet-${player.userId}`}
                style={[
                  styles.bet,
                  { left: bet.x * feltBox.width - 40, top: bet.y * feltBox.height - 12 }
                ]}
                pointerEvents="none">
                <ChipAmount amount={player.betThisRound} size={15} />
              </View>
            );
          })}

          {slots.map(slot => {
            const seatIndex = slot.seatIndex;
            const seat = snapshot?.seats[seatIndex] ?? null;
            const player = hand?.players.find(p => p.seatIndex === seatIndex);
            const isViewer = seat?.userId === userId;
            const revealed =
              isViewer || (hand?.stage === 'complete' && Boolean(player) && !player!.folded);

            return (
              <View
                key={seatIndex}
                pointerEvents={slot.opacity === 0 ? 'none' : 'auto'}
                style={[
                  styles.seat,
                  {
                    left: slot.x * feltBox.width - SEAT_W / 2,
                    top: slot.y * feltBox.height - SEAT_ANCHOR_Y,
                    opacity: slot.opacity,
                    transform: [{ scale: slot.scale }]
                  }
                ]}>
                <Seat
                  seat={seat}
                  player={player}
                  isViewer={isViewer}
                  isToAct={Boolean(hand && player && hand.toAct === player.userId)}
                  isDealer={snapshot?.dealerSeat === seatIndex}
                  remaining={hand?.toAct === player?.userId ? remaining : null}
                  revealed={revealed}
                  onSit={() => handleSit(seatIndex)}
                />
              </View>
            );
          })}
        </View>
      </View>

      <SafeAreaView style={styles.headerWrap} edges={['top', 'left', 'right']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Pressable style={styles.roundButton} hitSlop={8}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.mark} />
          <Text style={styles.headerTitle}>LOBBY</Text>

          {/* The pot is the single biggest thing on the table (12.2). */}
          <View style={styles.headerCentre} pointerEvents="none">
            <Text style={styles.potLabel}>Pot</Text>
            <Text style={styles.potValue}>{formatChips(hand?.pot ?? 0)}</Text>
          </View>

          <View style={styles.headerRight}>
            {status !== 'connected' && (
              <Text style={styles.status}>
                {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
              </Text>
            )}
            {snapshot && (
              <Text style={styles.blinds}>
                {formatChips(snapshot.smallBlind)}/{formatChips(snapshot.bigBlind)}
              </Text>
            )}
            {myStack !== null && (
              <View style={styles.bank}>
                <View style={styles.coin} />
                <Text style={styles.bankText}>{formatChips(myStack)}</Text>
              </View>
            )}
            <Pressable
              style={styles.roundButton}
              hitSlop={8}
              onPress={() => snapshot && sitOut(!snapshot.seats[mySeat ?? -1]?.sittingOut)}>
              <Text style={styles.gear}>⚙</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {error && (
        <Pressable style={styles.error} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      )}

      <View style={styles.actionBarWrap}>
        <ActionBar
          hand={hand}
          viewerId={userId}
          isMyTurn={isMyTurn}
          bigBlind={snapshot?.bigBlind ?? 20}
          raiseAmount={raiseAmount}
          onChangeRaise={setRaiseAmount}
          onAct={(action: Action, amount?: number) => act(action, amount)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Felt.woodBottom },
  arena: {
    ...StyleSheet.absoluteFill,
    paddingTop: HEADER_SPACE,
    paddingBottom: ACTION_BAR_SPACE + SEAT_BELOW_ANCHOR,
    alignItems: 'center',
    justifyContent: 'center'
  },
  glowWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: GLOW_HEIGHT },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 5,
    backgroundColor: Palette.accent
  },
  headerCentre: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center'
  },
  potLabel: {
    color: Palette.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase'
  },
  potValue: {
    color: Palette.text,
    fontSize: 34,
    fontWeight: '300',
    letterSpacing: -0.5,
    marginTop: -2
  },
  bank: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coin: { width: 11, height: 11, borderRadius: 6, backgroundColor: Palette.gold },
  bankText: { color: Palette.text, fontSize: 13, fontWeight: '700' },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { color: Palette.danger, fontSize: 11, fontWeight: '700' },
  blinds: { color: Palette.textDim, fontSize: 12, fontWeight: '700' },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backArrow: { color: '#fff', fontSize: 16, fontWeight: '700' },
  gear: { color: '#fff', fontSize: 14 },
  feltBox: { position: 'relative' },
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7
  },
  announcement: {
    backgroundColor: 'rgba(6,10,8,0.62)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,209,138,0.35)'
  },
  announcementText: { color: Palette.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  community: { flexDirection: 'row', gap: 5, minHeight: CardSize.community.h },
  bet: { position: 'absolute', width: 80, alignItems: 'center' },
  seat: { position: 'absolute', width: SEAT_W, height: SEAT_H, alignItems: 'center' },
  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  error: {
    position: 'absolute',
    bottom: ACTION_BAR_SPACE + 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(224,90,78,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  errorText: { color: '#fff', fontWeight: '700', fontSize: 12 }
});
