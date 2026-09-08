import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { readCard, type Card } from '@/lib/poker';

interface Props {
  card?: Card;
  width: number;
  height: number;
  /** Slight fan, used for the hero's two cards. */
  tilt?: number;
  dimmed?: boolean;
}

export function PlayingCard({ card, width, height, tilt = 0, dimmed = false }: Props) {
  const face = card ? readCard(card) : null;
  const radius = Math.round(width * 0.14);
  const frame = [
    { width, height, borderRadius: radius },
    tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
    dimmed ? styles.dimmed : null
  ];

  // No card, or a card the server deliberately masked: show the back.
  if (!face) {
    return (
      <View style={[styles.back, ...frame]}>
        <LinearGradient
          colors={['#5C7A9E', '#33506F', '#22384F']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        <View style={[styles.backInner, { borderRadius: radius * 0.6 }]} />
      </View>
    );
  }

  return (
    <View style={[styles.face, ...frame]}>
      <Text
        style={[
          styles.rank,
          { fontSize: height * 0.34, color: face.red ? '#D2333A' : '#16181C' }
        ]}
        numberOfLines={1}>
        {face.rank}
      </Text>
      <Text
        style={[
          styles.suit,
          { fontSize: height * 0.36, color: face.red ? '#D2333A' : '#16181C' }
        ]}>
        {face.symbol}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: '#FAFAF7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden'
  },
  back: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
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
    borderColor: 'rgba(255,255,255,0.22)'
  },
  rank: { fontWeight: '800', lineHeight: undefined, marginBottom: -2 },
  suit: { marginTop: -2 },
  dimmed: { opacity: 0.45 }
});
