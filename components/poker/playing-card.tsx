import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Card as CardTheme } from '@/constants/poker-theme';
import { readCard, type Card } from '@/lib/poker';

interface Props {
  card?: Card;
  width: number;
  height: number;
  /** Slight fan, used for the hero's two cards. */
  tilt?: number;
  dimmed?: boolean;
  /**
   * Render an undealt position as a dashed outline instead of a card back.
   * The community row uses this so it keeps its shape from preflop onward
   * rather than popping into existence at the flop (CONTEXT.md 12.4).
   */
  slot?: boolean;
}

export function PlayingCard({ card, width, height, tilt = 0, dimmed = false, slot = false }: Props) {
  const face = card ? readCard(card) : null;
  const radius = Math.round(width * 0.14);
  const frame = [
    { width, height, borderRadius: radius },
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    dimmed ? styles.dimmed : null
  ];

  // An empty community position: outline only, no card.
  if (!face && slot) {
    return <View style={[styles.slot, ...frame]} />;
  }

  // No card, or one the server deliberately masked: show the back.
  if (!face) {
    return (
      <View style={[styles.back, ...frame]}>
        <LinearGradient
          colors={['#3b3250', CardTheme.back, '#1d1828']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        <View style={[styles.backInner, { borderRadius: radius * 0.6 }]} />
      </View>
    );
  }

  const ink = face.red ? CardTheme.red : CardTheme.ink;

  return (
    <View style={[styles.face, ...frame]}>
      {/* Large solid suit, lower middle, as in the design. */}
      <Text
        style={[
          styles.pip,
          { fontSize: height * 0.46, color: ink, right: width * 0.1, bottom: height * 0.04 }
        ]}>
        {face.symbol}
      </Text>

      {/* Rank top-left with the suit tucked under it. */}
      <View style={styles.corner}>
        <Text style={[styles.rank, { fontSize: height * 0.36, color: ink }]} numberOfLines={1}>
          {face.rank}
        </Text>
        <Text style={[styles.cornerSuit, { fontSize: height * 0.24, color: ink }]}>
          {face.symbol}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: CardTheme.face,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  slot: {
    borderWidth: 1,
    borderColor: CardTheme.slot,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  back: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  backInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(127,90,240,0.35)'
  },
  corner: { position: 'absolute', top: 1, left: 4 },
  rank: { fontWeight: '800', letterSpacing: -0.5 },
  cornerSuit: { marginTop: -4, fontWeight: '600' },
  pip: { position: 'absolute' },
  dimmed: { opacity: 0.45 }
});
