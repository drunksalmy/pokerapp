import { StyleSheet, View } from 'react-native';

import { DealIn } from '@/components/poker/deal-in';
import { PlayingCard } from '@/components/poker/playing-card';
import { CardSize } from '@/constants/poker-theme';
import type { Card } from '@/lib/poker';

const W = CardSize.hero.w;
const H = CardSize.hero.h;
// The second card covers a bit over a third of the first.
const STEP = W * 0.62;

export const HERO_HAND_WIDTH = W + STEP;
export const HERO_HAND_HEIGHT = H + 16;

interface Props {
  cards: Card[];
  dimmed: boolean;
  /** Part of each card's deal key, so every new hand deals in afresh. */
  handNumber: number;
}

/**
 * Your own two cards: the biggest thing on the table, overlapping, the first
 * tipped left and the second tipped right. They rise into place one after the
 * other as the hand is dealt.
 */
export function HeroHand({ cards, dimmed, handNumber }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      {[0, 1].map(i => (
        <View key={i} style={[styles.card, i === 0 ? styles.first : styles.second]}>
          <DealIn
            dealtKey={cards[i] ? `${handNumber}-${cards[i]}` : null}
            delay={i * 90}
            distance={28}
            duration={220}>
            <PlayingCard card={cards[i]} width={W} height={H} tilt={i === 0 ? -7 : 8} dimmed={dimmed} />
          </DealIn>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: HERO_HAND_WIDTH, height: HERO_HAND_HEIGHT },
  card: { position: 'absolute' },
  first: { left: 0, top: 10 },
  second: { left: STEP, top: 2 }
});
