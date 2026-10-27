import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';

// Opacity and translate run on the native driver: the deal stays smooth even
// while the table re-renders from the snapshot that dealt the card.
const NATIVE = Platform.OS !== 'web';

interface Props {
  /** Identifies the card that landed here; null while the position is empty. */
  dealtKey: string | null;
  delay?: number;
  /** How far below its resting place the card starts, in points. */
  distance?: number;
  duration?: number;
  children: ReactNode;
}

/**
 * A short deal-in -- a small rise and a fade -- each time a card lands in this
 * position. An empty position (the dashed slot) is shown as it is, so slots
 * never fade out of view between hands.
 *
 * Keyed by the card, so a newly dealt card mounts fresh with its animation
 * already at the start. Resetting a shared value in an effect instead would
 * show the new card at full opacity for one frame before it faded in.
 */
export function DealIn({ dealtKey, ...rest }: Props) {
  return <DealInOnce key={dealtKey ?? 'empty'} dealtKey={dealtKey} {...rest} />;
}

function DealInOnce({ dealtKey, delay = 0, distance = 8, duration = 120, children }: Props) {
  const [progress] = useState(() => new Animated.Value(dealtKey ? 0 : 1));

  useEffect(() => {
    if (!dealtKey) return;
    const deal = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE
    });
    deal.start();
    return () => deal.stop();
  }, [dealtKey, delay, duration, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }
        ]
      }}>
      {children}
    </Animated.View>
  );
}
