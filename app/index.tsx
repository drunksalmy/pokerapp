import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar, reservedBottomFor } from '@/components/poker/action-bar';
import { BankPanel } from '@/components/poker/bank-panel';
import { CarouselItem } from '@/components/poker/carousel-item';
import { DealIn } from '@/components/poker/deal-in';
import { HERO_HAND_HEIGHT, HERO_HAND_WIDTH, HeroHand } from '@/components/poker/hero-hand';
import { PlayingCard } from '@/components/poker/playing-card';
import { Seat, SEAT_ANCHOR_Y, SEAT_HEIGHT, SEAT_WIDTH } from '@/components/poker/seat';
import { ChipAspect, ChipImages, TableBackgroundImage } from '@/constants/poker-assets';
import { CardSize, Felt, Palette } from '@/constants/poker-theme';
import { usePokerTable } from '@/hooks/use-poker-table';
import {
  boardCentre,
  carouselPositions,
  formatChips,
  tableGeometry,
  type Action
} from '@/lib/poker';

// The play area starts this far below the safe-area top: clear of the header
// row and the pot number, which sit inside the notch-safe area. Measuring from
// the raw screen top is what put a seat on top of the pot on a notched iPhone.
const POT_CLEARANCE = 72;
const BUY_IN_BLINDS = 100;
// Widest the stage may be, as a fraction of its height. Phones are narrower
// than this (an iPhone is about 0.46), so on a phone the stage is simply the
// whole screen; tablets and desktop browsers get a centred column instead.
const MAX_STAGE_ASPECT = 0.56;

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

  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const stageWidth = Math.min(viewport.width, viewport.height * MAX_STAGE_ASPECT);
  const [screen, setScreen] = useState({ width: 0, height: 0 });
  const [raiseAmount, setRaiseAmount] = useState(0);

  // The game happens from just under the pot to the bottom of the screen. The
  // action buttons float over the bottom of that, with no bar behind them.
  const playTop = insets.top + POT_CLEARANCE;
  const playHeight = Math.max(0, screen.height - playTop);
  const reservedBottom = reservedBottomFor(insets.bottom);
  const geo = useMemo(
    () =>
      screen.width > 0 && playHeight > reservedBottom
        ? tableGeometry(screen.width, playHeight, reservedBottom, playTop)
        : null,
    [screen.width, playHeight, reservedBottom, playTop]
  );

  // Portrait only: the layout assumes a tall table with the viewer at the foot.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  // When the current action clock runs out. The countdowns tick inside the
  // ring and the Your Turn capsule that draw them (useClock), not here: ticking
  // here re-rendered the whole table ten times a second.
  const deadline = snapshot?.deadline ?? null;

  const hand = snapshot?.hand ?? null;
  const mySeat = snapshot?.you.seatIndex ?? null;
  const isMyTurn = Boolean(hand && hand.toAct === userId);
  const bounds = isMyTurn ? hand?.raiseBounds ?? null : null;
  const me = hand?.players.find(p => p.userId === userId) ?? null;
  const totalMs = snapshot?.actionTimeoutMs ?? 30000;

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
    () => (geo ? carouselPositions(snapshot?.maxSeats ?? 6, mySeat, effectiveFocus, geo) : []),
    [snapshot?.maxSeats, mySeat, effectiveFocus, geo]
  );
  const heroSlot = slots.find(s => s.isHero) ?? null;

  const board = useMemo(
    () => (geo ? boardCentre(geo, mySeat !== null) : { x: 0, y: 0 }),
    [geo, mySeat]
  );

  // Opponents on the ring: every seat but the viewer's.
  const ringSize = (snapshot?.maxSeats ?? 6) - 1;
  // Re-measuring the play area moves every pixel position. That must snap, not
  // animate, or seats would fly in from the corner on launch.
  const layoutKey = `${screen.width}x${playHeight}`;

  const nameOf = (id: string) => snapshot?.seats.find(s => s?.userId === id)?.name ?? 'Player';

  const announcement = useMemo(() => {
    if (!hand) return null;
    if (hand.winners?.length) {
      return hand.winners
        .map(w => {
          if (w.userId === userId) return `You win ${formatChips(w.amount)}`;
          const name = snapshot?.seats.find(s => s?.userId === w.userId)?.name ?? 'Player';
          return `${name} wins ${formatChips(w.amount)}`;
        })
        .join('   ·   ');
    }
    return STAGE_LABEL[hand.stage] ?? null;
  }, [hand, snapshot, userId]);

  // Replaces the buttons whenever it isn't your turn.
  const statusText =
    mySeat === null
      ? 'Tap an open seat to join'
      : hand?.toAct
        ? `Waiting for ${nameOf(hand.toAct)}…`
        : null;

  const myStack = mySeat !== null ? me?.stack ?? snapshot?.seats[mySeat]?.stack ?? 0 : 0;
  const mySittingOut = mySeat !== null && Boolean(snapshot?.seats[mySeat]?.sittingOut);

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

      {/* The game plays in a phone-shaped stage. On a phone that is the whole
          screen; in a wide desktop browser it is a centred column, because the
          table picture is portrait and filling a landscape window with it
          pushed the rim, the seats and the cards below the bottom edge. */}
      <View style={[styles.stage, stageWidth < viewport.width && styles.stageFramed, { width: stageWidth }]}>
        <View
          style={styles.arena}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setScreen({ width, height });
          }}>
          {geo && (
            // The owner's table picture fills the screen: the dark room, the
            // glow, the rim and the felt are all in it. The seats below are laid
            // on its measured rim, so they sit on the table edge it shows.
            <Image
              source={TableBackgroundImage}
              resizeMode="stretch"
              style={[styles.background, geo.background]}
            />
          )}

          {geo && (
            // Seats, cards and the bank are placed in the visible play area: the
            // band from under the pot to the bottom of the screen.
            <View style={[styles.play, { top: playTop, height: playHeight }]} pointerEvents="box-none">
              <View
                style={[styles.board, { top: board.y - CardSize.community.h / 2 }]}
                pointerEvents="none">
                {/* Always five positions, fanned slightly: dealt cards deal in
                    (rise 8pt and fade, 120ms each, 60ms apart), the rest stay as
                    dashed outlines. */}
                <View style={styles.community}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const card = hand?.community?.[i];
                    const offset = i - 2;
                    return (
                      <View key={i} style={{ transform: [{ translateY: offset * offset * 2 }] }}>
                        <DealIn dealtKey={card ?? null} delay={i * 60}>
                          <PlayingCard
                            card={card}
                            slot={!card}
                            width={CardSize.community.w}
                            height={CardSize.community.h}
                            tilt={offset * 5}
                          />
                        </DealIn>
                      </View>
                    );
                  })}
                </View>

                {announcement && (
                  <View style={styles.announcement}>
                    <Text style={styles.announcementText}>{announcement}</Text>
                  </View>
                )}
              </View>

              {slots.map(slot => {
                if (slot.isHero) return null;
                const seatIndex = slot.seatIndex;
                const seat = snapshot?.seats[seatIndex] ?? null;
                const player = hand?.players.find(p => p.seatIndex === seatIndex);
                const isToAct = Boolean(hand && player && hand.toAct === player.userId);

                return (
                  <CarouselItem
                    key={seatIndex}
                    left={slot.x - SEAT_WIDTH / 2}
                    top={slot.y - SEAT_ANCHOR_Y}
                    scale={slot.scale}
                    opacity={slot.opacity}
                    slot={slot.slot}
                    ringSize={ringSize}
                    layoutKey={layoutKey}
                    style={styles.seat}>
                    <Seat
                      seat={seat}
                      player={player}
                      isToAct={isToAct}
                      isDealer={snapshot?.dealerSeat === seatIndex}
                      deadline={isToAct ? deadline : null}
                      totalMs={totalMs}
                      revealed={hand?.stage === 'complete' && Boolean(player) && !player!.folded}
                      canSit={mySeat === null}
                      onSit={() => handleSit(seatIndex)}
                    />
                  </CarouselItem>
                );
              })}

              {heroSlot &&
                (me && me.holeCards.length === 2 ? (
                  <View
                    style={[
                      styles.hero,
                      {
                        left: heroSlot.x - HERO_HAND_WIDTH / 2,
                        top: heroSlot.y - HERO_HAND_HEIGHT / 2
                      }
                    ]}
                    pointerEvents="none">
                    <HeroHand
                      cards={me.holeCards}
                      dimmed={me.folded}
                      handNumber={snapshot?.handNumber ?? 0}
                    />
                  </View>
                ) : mySittingOut ? (
                  // You have no avatar or pill in this design, so this is the only
                  // place being sat out shows -- and the way back in, since the
                  // header gear sits under Expo Go's own button during development.
                  <Pressable
                    style={[styles.heroSitOut, { top: heroSlot.y - 22 }]}
                    onPress={() => sitOut(false)}
                    hitSlop={10}>
                    <Text style={styles.heroWaitingText}>You’re sitting out</Text>
                    <Text style={styles.heroBack}>Tap to play</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.heroWaiting, styles.heroWaitingText, { top: heroSlot.y - 9 }]}>
                    {hand ? 'You’re in from the next hand' : 'Waiting for the next hand'}
                  </Text>
                ))}

              {mySeat !== null && (
                <View style={[styles.bank, { bottom: reservedBottom + 4 }]} pointerEvents="none">
                  <BankPanel
                    stack={myStack}
                    bet={me?.betThisRound ?? 0}
                    isDealer={snapshot?.dealerSeat === mySeat}
                    allIn={me?.allIn ?? false}
                    isMyTurn={isMyTurn}
                    deadline={isMyTurn ? deadline : null}
                    totalMs={totalMs}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        <SafeAreaView style={styles.headerWrap} edges={['top', 'left', 'right']} pointerEvents="box-none">
          <View style={styles.header} pointerEvents="box-none">
            <Pressable style={styles.menu} hitSlop={8}>
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Games</Text>
              {status !== 'connected' ? (
                <Text style={styles.connection}>
                  {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
                </Text>
              ) : (
                snapshot && (
                  <Text style={styles.blinds}>
                    Blinds {formatChips(snapshot.smallBlind)}/{formatChips(snapshot.bigBlind)}
                  </Text>
                )
              )}
            </View>

            {/* The pot is the single biggest number on the screen. */}
            <View style={styles.headerCentre} pointerEvents="none">
              <View style={styles.potLabelRow}>
                <Image
                  source={ChipImages.red}
                  style={{ width: 12 * ChipAspect.red, height: 12 }}
                />
                <Text style={styles.potLabel}>Pot</Text>
              </View>
              <Text style={styles.potValue}>{formatChips(hand?.pot ?? 0)}</Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                style={styles.iconButton}
                hitSlop={8}
                onPress={() => snapshot && sitOut(!snapshot.seats[mySeat ?? -1]?.sittingOut)}>
                <Text style={styles.gear}>⚙</Text>
              </Pressable>
              <Pressable style={[styles.iconButton, styles.help]} hitSlop={8}>
                <Text style={styles.helpText}>?</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        {error && (
          <Pressable style={[styles.error, { bottom: reservedBottom + 12 }]} onPress={clearError}>
            <Text style={styles.errorText}>{error}</Text>
          </Pressable>
        )}

        <View style={styles.actionBarWrap} pointerEvents="box-none">
          <ActionBar
            hand={hand}
            viewerId={userId}
            isMyTurn={isMyTurn}
            bigBlind={snapshot?.bigBlind ?? 20}
            raiseAmount={raiseAmount}
            onChangeRaise={setRaiseAmount}
            onAct={(action: Action, amount?: number) => act(action, amount)}
            statusText={statusText}
            bottomInset={insets.bottom}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Felt.woodBottom },
  stage: { flex: 1, alignSelf: 'center', overflow: 'hidden' },
  // A faint edge, so the column reads as deliberate rather than as a page
  // that failed to stretch.
  stageFramed: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(185,163,255,0.18)'
  },
  arena: { ...StyleSheet.absoluteFill },
  background: { position: 'absolute' },
  play: { position: 'absolute', left: 0, right: 0 },
  board: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 16 },
  community: { flexDirection: 'row', gap: 6, minHeight: CardSize.community.h },
  announcement: {
    backgroundColor: 'rgba(20,17,29,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,90,240,0.35)'
  },
  announcementText: { color: '#b9a3ff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  // Seats ride the carousel: pinned at the play area's top-left corner and
  // placed entirely by transforms, which the native driver can animate.
  seat: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SEAT_WIDTH,
    height: SEAT_HEIGHT,
    alignItems: 'center'
  },
  hero: { position: 'absolute' },
  heroWaiting: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  heroWaitingText: { color: Palette.textMuted, fontSize: 13, fontWeight: '600' },
  heroSitOut: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 3 },
  heroBack: { color: Palette.accent, fontSize: 15, fontWeight: '800' },
  bank: { position: 'absolute', right: 16 },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16
  },
  menu: { width: 22, gap: 4, paddingVertical: 4 },
  menuBar: { height: 2, borderRadius: 1, backgroundColor: Palette.text },
  headerTitle: { color: Palette.text, fontSize: 15, fontWeight: '600' },
  blinds: { color: Palette.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  connection: { color: Palette.danger, fontSize: 11, fontWeight: '700', marginTop: 1 },
  headerCentre: { position: 'absolute', left: 0, right: 0, top: 2, alignItems: 'center' },
  potLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  potLabel: { color: Palette.textDim, fontSize: 12, fontWeight: '600' },
  potValue: {
    color: Palette.text,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: -1
  },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconButton: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  gear: { color: Palette.text, fontSize: 20 },
  help: { borderRadius: 13, borderWidth: 1.8, borderColor: Palette.text },
  helpText: { color: Palette.text, fontSize: 14, fontWeight: '800', marginTop: -1 },
  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  error: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(224,90,78,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8
  },
  errorText: { color: '#fff', fontWeight: '700', fontSize: 12 }
});
