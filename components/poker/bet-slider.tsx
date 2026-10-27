import { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/poker-theme';

const THUMB = 26;

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

/** Raise sizing: violet track, gold thumb, quiet − and + to nudge by a big blind. */
export function BetSlider({ min, max, step, value, onChange }: Props) {
  // The responder is created once, so it reads live values through refs rather
  // than being rebuilt on every drag frame.
  const live = useRef({ min, max, step, value, onChange, width: 0 });
  live.current = { ...live.current, min, max, step, value, onChange };

  const dragStart = useRef(value);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = live.current.value;
      },
      onPanResponderMove: (_event, gesture) => {
        const { min: lo, max: hi, step: inc, width, onChange: emit } = live.current;
        if (!width || hi <= lo) return;
        const span = hi - lo;
        const next = dragStart.current + (gesture.dx / width) * span;
        const snapped = Math.round(next / inc) * inc;
        emit(Math.min(hi, Math.max(lo, snapped)));
      }
    })
  ).current;

  const range = Math.max(1, max - min);
  const fraction = Math.min(1, Math.max(0, (value - min) / range));

  const nudge = (direction: number) => {
    const next = Math.round((value + direction * step) / step) * step;
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <View style={styles.row}>
      <Pressable style={styles.stepper} onPress={() => nudge(-1)} hitSlop={8}>
        <Text style={styles.stepperText}>−</Text>
      </Pressable>

      <View
        style={styles.trackArea}
        onLayout={e => {
          live.current.width = e.nativeEvent.layout.width - THUMB;
        }}>
        <View style={styles.track} />
        <View style={[styles.trackFill, { width: `${fraction * 100}%` }]} />
        <View
          style={[styles.thumb, { left: `${fraction * 100}%` }]}
          hitSlop={12}
          {...responder.panHandlers}
        />
      </View>

      <Pressable style={styles.stepper} onPress={() => nudge(1)} hitSlop={8}>
        <Text style={styles.stepperText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  stepper: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepperText: { color: Palette.textDim, fontSize: 22, fontWeight: '400', marginTop: -2 },
  trackArea: { flex: 1, height: THUMB + 12, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(127,90,240,0.25)' },
  trackFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.accent
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Palette.gold,
    borderWidth: 3,
    borderColor: '#14111d',
    transform: [{ translateX: -THUMB / 2 }]
  }
});
