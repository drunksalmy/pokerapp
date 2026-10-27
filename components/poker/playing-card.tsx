import { Image, StyleSheet, Text, View } from 'react-native';

import { CardBackImage, CardSlotImage } from '@/constants/poker-assets';
import { Card as CardTheme } from '@/constants/poker-theme';
import { readCard, type Card } from '@/lib/poker';

interface Props {
  card?: Card;
  width: number;
  height: number;
  /** Slight fan, used for the hero's two cards and the board. */
  tilt?: number;
  dimmed?: boolean;
  /**
   * Render an undealt position as an empty slot instead of a card back. The
   * community row uses this so it keeps its shape from preflop onward rather
   * than popping into existence at the flop.
   */
  slot?: boolean;
}

/**
 * A playing card. Backs and empty slots are the owner's own images; faces are
 * drawn, because only 5 of the 52 faces exist as images. The drawn face
 * follows those images: a small rank and suit in the top-left corner,
 * mirrored in the bottom-right, and one large suit in the middle.
 */
export function PlayingCard({ card, width, height, tilt = 0, dimmed = false, slot = false }: Props) {
  const face = card ? readCard(card) : null;
  const radius = Math.round(width * 0.12);
  const frame = [
    { width, height, borderRadius: radius },
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    dimmed ? styles.dimmed : null
  ];

  // An empty community position: the dashed outline image, no card.
  if (!face && slot) {
    return <Image source={CardSlotImage} resizeMode="stretch" style={[styles.slot, ...frame]} />;
  }

  // No card, or one the server deliberately masked: show the back.
  if (!face) {
    return <Image source={CardBackImage} resizeMode="stretch" style={[styles.back, ...frame]} />;
  }

  const ink = face.red ? CardTheme.red : CardTheme.ink;
  const index = (
    <>
      <Text style={[styles.rank, { fontSize: height * 0.24, lineHeight: height * 0.26, color: ink }]}>
        {face.rank}
      </Text>
      <Text style={[styles.cornerSuit, { fontSize: height * 0.17, lineHeight: height * 0.19, color: ink }]}>
        {face.symbol}
      </Text>
    </>
  );

  return (
    <View style={[styles.face, ...frame]}>
      <View style={[styles.corner, { top: height * 0.04, left: width * 0.08 }]}>{index}</View>
      <Text style={[styles.pip, { fontSize: height * 0.46, color: ink }]}>{face.symbol}</Text>
      <View
        style={[
          styles.corner,
          { bottom: height * 0.04, right: width * 0.08, transform: [{ rotate: '180deg' }] }
        ]}>
        {index}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: CardTheme.face,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  slot: { opacity: 0.6 },
  back: { overflow: 'hidden' },
  corner: { position: 'absolute', alignItems: 'center' },
  rank: { fontWeight: '700', letterSpacing: -0.5 },
  cornerSuit: { fontWeight: '600' },
  pip: { marginTop: 2 },
  dimmed: { opacity: 0.45 }
});
