import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A smooth action clock for whoever is on the clock.
 *
 * `progress` runs from the fraction left down to 0 as one continuous Animated
 * timing, so a ring or pill border drains every frame without re-rendering
 * the table. SVG stroke props can't use the native driver, so this runs on the
 * JS driver -- but through Animated, which updates the shape directly rather
 * than going through a React render each frame. `remainingMs` (for the
 * seconds readout and the red final-seconds colour) refreshes 4 times a second.
 *
 * The table used to re-render 10 times a second to tick its clocks; this keeps
 * that cost inside the one component that is actually counting down.
 */
export function useClock(deadline: number | null, totalMs: number) {
  const [progress] = useState(() => new Animated.Value(0));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) {
      progress.setValue(0);
      return;
    }
    const remaining = Math.max(0, deadline - Date.now());
    progress.setValue(Math.min(1, remaining / totalMs));
    const drain = Animated.timing(progress, {
      toValue: 0,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false
    });
    drain.start();
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      drain.stop();
      clearInterval(tick);
    };
  }, [deadline, totalMs, progress]);

  return { progress, remainingMs: deadline ? Math.max(0, deadline - now) : 0 };
}
