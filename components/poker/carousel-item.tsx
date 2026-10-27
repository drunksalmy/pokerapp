import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

// The native driver keeps the turn smooth even while JS is busy re-rendering
// the table from a fresh snapshot. It does not exist on web, where the browser
// second player runs, so fall back to the JS driver there. A value must stay on
// one driver for its whole life, which a per-platform constant guarantees.
const NATIVE = Platform.OS !== 'web';

const TURN_MS = 420;
// A seat crossing the back of the ring fades out, jumps, and fades back in.
const WRAP_FADE_MS = 140;
// Fast start, long settle: reads as the ring being turned, not slid.
const TURN_EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface Props {
  /** Top-left of the item inside the felt box, in pixels. */
  left: number;
  top: number;
  scale: number;
  opacity: number;
  /** CarouselSlot.slot: signed distance from the spotlight. */
  slot: number;
  /** How many positions the ring has, to tell a wrap from an ordinary turn. */
  ringSize: number;
  /** Changes whenever the felt box is re-measured. Positions snap, not animate. */
  layoutKey: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Something that rides the carousel: a seat, or the chips in front of one.
 *
 * Positioned only with transforms, because the native driver can animate
 * transform and opacity but not layout props like left/top. The style passed
 * in should pin the item at left: 0, top: 0.
 */
export function CarouselItem({
  left,
  top,
  scale,
  opacity,
  slot,
  ringSize,
  layoutKey,
  style,
  children
}: Props) {
  // Created once per item. Not React Native's useAnimatedValue: that hook is
  // missing from react-native-web 0.21 and crashes the browser player.
  const [x] = useState(() => new Animated.Value(left));
  const [y] = useState(() => new Animated.Value(top));
  const [size] = useState(() => new Animated.Value(scale));
  const [fade] = useState(() => new Animated.Value(opacity));
  const last = useRef<{ slot: number; layoutKey: string } | null>(null);

  useEffect(() => {
    const prev = last.current;
    last.current = { slot, layoutKey };

    // First placement, or the felt was re-measured: there is nothing to turn
    // from, and animating out of a stale layout would fling seats across the
    // screen on launch.
    if (!prev || prev.layoutKey !== layoutKey) {
      x.setValue(left);
      y.setValue(top);
      size.setValue(scale);
      fade.setValue(opacity);
      return;
    }

    const to = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, { toValue, duration, easing: TURN_EASING, useNativeDriver: NATIVE });

    // carouselPositions() gives each seat its shortest way round, so in an
    // ordinary turn a seat moves by at most half the ring. Anything further is
    // the seat crossing the back of the ring, and a straight line would drag
    // it across the spotlight. Starting a new animation stops the old one, and
    // a stopped sequence never runs its remaining steps, so an interrupted
    // wrap cannot fade back in at a stale position.
    const wraps = Math.abs(slot - prev.slot) > ringSize / 2;

    if (wraps) {
      Animated.sequence([
        to(fade, 0, WRAP_FADE_MS),
        Animated.parallel([to(x, left, 0), to(y, top, 0), to(size, scale, 0)]),
        to(fade, opacity, WRAP_FADE_MS)
      ]).start();
      return;
    }

    Animated.parallel([
      to(x, left, TURN_MS),
      to(y, top, TURN_MS),
      to(size, scale, TURN_MS),
      to(fade, opacity, TURN_MS)
    ]).start();
  }, [left, top, scale, opacity, slot, ringSize, layoutKey, x, y, size, fade]);

  return (
    <Animated.View
      pointerEvents={opacity === 0 ? 'none' : 'auto'}
      style={[
        style,
        { opacity: fade, transform: [{ translateX: x }, { translateY: y }, { scale: size }] }
      ]}>
      {children}
    </Animated.View>
  );
}
