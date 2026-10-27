import { StyleSheet, View } from 'react-native';

import { PlayingCard } from '@/components/poker/playing-card';
import { CardSize } from '@/constants/poker-theme';
import type { Card } from '@/lib/poker';

const W = CardSize.hero.w;
const H = CardSize.hero.h;
// The second card covers a bit over a third of the first.
const STEP = W * 0.62;

export const HERO_HAND_WIDTH = W + STEP;
export const HERO_HAND_HEIGHT = H + 16;

/**
 * Your own two cards: the biggest thing on the table, overlapping, the first
 * tipped left and the second tipped right, as in the design.
 */
export function HeroHand({ cards, dimmed }: { cards: Card[]; dimmed: boolean }) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.card, styles.first]}>
        <PlayingCard card={cards[0]} width={W} height={H} tilt={-7} dimmed={dimmed} />
      </View>
      <View style={[styles.card, styles.second]}>
        <PlayingCard card={cards[1]} width={W} height={H} tilt={8} dimmed={dimmed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: HERO_HAND_WIDTH, height: HERO_HAND_HEIGHT },
  card: { position: 'absolute' },
  first: { left: 0, top: 10 },
  second: { left: STEP, top: 2 }
});
