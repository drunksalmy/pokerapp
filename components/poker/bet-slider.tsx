import { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/poker-theme';

const HANDLE = 42;

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function BetSlider({ min, max, step, value, onChange, disabled = false }: Props) {
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
    <View style={[styles.row, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Pressable style={styles.stepper} onPress={() => nudge(-1)} hitSlop={4}>
        <Text style={styles.stepperText}>−</Text>
      </Pressable>

      <View
        style={styles.trackArea}
        onLayout={e => {
          live.current.width = e.nativeEvent.layout.width - HANDLE;
        }}>
        <View style={styles.track} />
        <View style={[styles.trackFill, { width: `${fraction * 100}%` }]} />
        <View
          style={[styles.handle, { left: `${fraction * 100}%` }]}
          {...responder.panHandlers}>
          <View style={styles.grip} />
          <View style={styles.grip} />
          <View style={styles.grip} />
        </View>
      </View>

      <Pressable style={styles.stepper} onPress={() => nudge(1)} hitSlop={4}>
        <Text style={styles.stepperText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  disabled: { opacity: 0.35 },
  stepper: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: Palette.barRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperText: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
  trackArea: { flex: 1, height: HANDLE, justifyContent: 'center' },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)'
  },
  trackFill: {
    position: 'absolute',
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.accentDeep
  },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transform: [{ translateX: -HANDLE / 2 }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5
  },
  grip: { width: 16, height: 2, borderRadius: 1, backgroundColor: 'rgba(0,40,25,0.55)' }
});
