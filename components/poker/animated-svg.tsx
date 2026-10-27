import { Animated } from 'react-native';
import { Circle, Rect, type CircleProps, type RectProps } from 'react-native-svg';

// Animated wraps whatever it animates with collapsable={false}, a prop that
// only means something to native views. react-native-svg's web renderer passes
// it straight through to the DOM <circle>/<rect>, which React rejects with a
// console error in the browser player. An SVG shape is never collapsed away on
// native either, so dropping the prop here costs nothing anywhere.

type WithCollapsable<P> = P & { collapsable?: boolean };

function CircleShape({ collapsable, ...props }: WithCollapsable<CircleProps>) {
  void collapsable;
  return <Circle {...props} />;
}

function RectShape({ collapsable, ...props }: WithCollapsable<RectProps>) {
  void collapsable;
  return <Rect {...props} />;
}

export const AnimatedCircle = Animated.createAnimatedComponent(CircleShape);
export const AnimatedRect = Animated.createAnimatedComponent(RectShape);
