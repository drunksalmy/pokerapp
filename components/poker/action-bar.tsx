import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BetSlider } from '@/components/poker/bet-slider';
import { Palette } from '@/constants/poker-theme';
import { formatChips, type Action, type HandView } from '@/lib/poker';

interface Props {
  hand: HandView | null;
  viewerId: string;
  isMyTurn: boolean;
  bigBlind: number;
  raiseAmount: number;
  onChangeRaise: (value: number) => void;
  onAct: (action: Action, amount?: number) => void;
}

/**
 * Buttons are driven entirely by hand.legalActions, so the UI physically
 * cannot offer a move the server would reject — including the under-raise
 * case, where raising is withheld after a short all-in.
 */
export function ActionBar({
  hand,
  viewerId,
  isMyTurn,
  bigBlind,
  raiseAmount,
  onChangeRaise,
  onAct
}: Props) {
  const legal = isMyTurn && hand ? hand.legalActions : [];
  const bounds = isMyTurn ? hand?.raiseBounds ?? null : null;

  // What *this* player owes, not whoever happens to be on the clock.
  const me = hand?.players.find(p => p.userId === viewerId);
  const toCall = isMyTurn && hand && me ? Math.max(0, hand.currentBet - me.betThisRound) : 0;

  const canFold = legal.includes('fold');
  const canCheck = legal.includes('check');
  const canCall = legal.includes('call');
  const raiseVerb: Action | null = legal.includes('raise')
    ? 'raise'
    : legal.includes('bet')
      ? 'bet'
      : null;

  const isAllInRaise = bounds ? raiseAmount >= bounds.max : false;

  return (
    <View style={styles.bar}>
      <ActionButton
        label="FOLD"
        glyph="✕"
        tone="fold"
        enabled={canFold}
        onPress={() => onAct('fold')}
      />

      {canCheck ? (
        <ActionButton label="CHECK" glyph="✓" enabled onPress={() => onAct('check')} />
      ) : (
        <ActionButton
          label="CALL"
          glyph="✓"
          amount={toCall}
          enabled={canCall}
          onPress={() => onAct('call')}
        />
      )}

      <ActionButton
        label={isAllInRaise ? 'ALL IN' : raiseVerb === 'bet' ? 'BET' : 'RAISE'}
        glyph="⌃"
        amount={bounds ? raiseAmount : 0}
        enabled={Boolean(raiseVerb && bounds)}
        onPress={() => raiseVerb && onAct(raiseVerb, raiseAmount)}
      />

      <View style={styles.amountBox}>
        <Text style={styles.amountText}>{bounds ? formatChips(raiseAmount) : '—'}</Text>
      </View>

      <BetSlider
        min={bounds?.min ?? 0}
        max={bounds?.max ?? 0}
        step={bigBlind}
        value={raiseAmount}
        onChange={onChangeRaise}
        disabled={!bounds}
      />
    </View>
  );
}

function ActionButton({
  label,
  glyph,
  amount,
  enabled,
  onPress,
  tone
}: {
  label: string;
  glyph: string;
  amount?: number;
  enabled: boolean;
  onPress: () => void;
  tone?: 'fold';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        !enabled && styles.buttonDisabled,
        pressed && enabled && styles.buttonPressed
      ]}
      disabled={!enabled}
      onPress={onPress}>
      <View style={styles.buttonHeader}>
        <Text style={styles.glyph}>{glyph}</Text>
        <Text style={styles.buttonLabel}>{label}</Text>
      </View>
      <Text style={[styles.buttonAmount, tone === 'fold' && styles.foldAmount]}>
        {amount ? formatChips(amount) : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: Palette.bar
  },
  button: {
    minWidth: 92,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Palette.barRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: { opacity: 0.3 },
  buttonPressed: { backgroundColor: '#3D4147' },
  buttonHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  glyph: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  buttonLabel: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  buttonAmount: {
    color: Palette.accent,
    fontSize: 17,
    fontWeight: '800',
    minHeight: 21
  },
  foldAmount: { color: Palette.textDim },
  amountBox: {
    minWidth: 62,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Palette.barRaised,
    alignItems: 'center'
  },
  amountText: { color: Palette.accent, fontSize: 16, fontWeight: '800' }
});
