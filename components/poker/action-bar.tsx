import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BetSlider } from '@/components/poker/bet-slider';
import { Palette } from '@/constants/poker-theme';
import { formatChips, type Action, type HandView } from '@/lib/poker';

const SLIDER_HEIGHT = 44;
const ACTIONS_HEIGHT = 52;
const BOTTOM_GAP = 6;

/**
 * How much of the bottom of the screen the action area occupies. The slider
 * row is reserved even when hidden, so your cards don't jump up and down as
 * your turn comes and goes.
 */
export function reservedBottomFor(bottomInset: number) {
  return bottomInset + BOTTOM_GAP + SLIDER_HEIGHT + ACTIONS_HEIGHT;
}

interface Props {
  hand: HandView | null;
  viewerId: string;
  isMyTurn: boolean;
  bigBlind: number;
  raiseAmount: number;
  onChangeRaise: (value: number) => void;
  onAct: (action: Action, amount?: number) => void;
  /** Shown in place of the buttons when it isn't your turn. */
  statusText: string | null;
  bottomInset: number;
}

/**
 * Flat text actions, as in the design: Fold red, Raise green, Check white.
 * Only what hand.legalActions allows is shown at all -- disabled actions are
 * hidden, not greyed -- so the UI cannot offer a move the server would reject,
 * including raising after an under-raise all-in.
 */
export function ActionBar({
  hand,
  viewerId,
  isMyTurn,
  bigBlind,
  raiseAmount,
  onChangeRaise,
  onAct,
  statusText,
  bottomInset
}: Props) {
  const legal = isMyTurn && hand ? hand.legalActions : [];
  const bounds = isMyTurn ? hand?.raiseBounds ?? null : null;

  // What *this* player owes, not whoever happens to be on the clock.
  const me = hand?.players.find(p => p.userId === viewerId);
  const toCall = isMyTurn && hand && me ? Math.max(0, hand.currentBet - me.betThisRound) : 0;

  const raiseVerb: Action | null = legal.includes('raise')
    ? 'raise'
    : legal.includes('bet')
      ? 'bet'
      : null;
  const canRaise = Boolean(raiseVerb && bounds);
  const isAllIn = bounds ? raiseAmount >= bounds.max : false;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset + BOTTOM_GAP }]} pointerEvents="box-none">
      <View style={styles.sliderRow} pointerEvents="box-none">
        {canRaise && bounds && (
          <BetSlider
            min={bounds.min}
            max={bounds.max}
            step={bigBlind}
            value={raiseAmount}
            onChange={onChangeRaise}
          />
        )}
      </View>

      <View style={styles.actionsRow} pointerEvents="box-none">
        {isMyTurn ? (
          <>
            {legal.includes('fold') && (
              <TextAction glyph="✕" label="Fold" color={Palette.folded} onPress={() => onAct('fold')} />
            )}
            {canRaise && (
              <TextAction
                glyph="↗"
                label={isAllIn ? 'All in' : raiseVerb === 'bet' ? 'Bet' : 'Raise'}
                amount={raiseAmount}
                color={Palette.raise}
                onPress={() => raiseVerb && onAct(raiseVerb, raiseAmount)}
              />
            )}
            {legal.includes('check') ? (
              <TextAction glyph="✓" label="Check" color={Palette.check} onPress={() => onAct('check')} />
            ) : legal.includes('call') ? (
              <TextAction
                glyph="✓"
                label="Call"
                amount={toCall}
                color={Palette.check}
                onPress={() => onAct('call')}
              />
            ) : null}
          </>
        ) : (
          statusText && <Text style={styles.status}>{statusText}</Text>
        )}
      </View>
    </View>
  );
}

function TextAction({
  glyph,
  label,
  amount,
  color,
  onPress
}: {
  glyph: string;
  label: string;
  amount?: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <Text style={[styles.glyph, { color }]}>{glyph}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
      {amount ? <Text style={[styles.amount, { color }]}>{formatChips(amount)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14 },
  sliderRow: { height: SLIDER_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  actionsRow: {
    height: ACTIONS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6
  },
  actionPressed: { opacity: 0.55 },
  glyph: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '800', opacity: 0.85 },
  status: { color: Palette.textMuted, fontSize: 13, fontWeight: '600' }
});
