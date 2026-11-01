import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';
import { angleDelta, LEVEL_STEP, levelAtRotation } from '../utils/levelDial';

export default function LevelDial({ onOpen }: { onOpen: (level: number) => void }) {
  const size = Math.min(useWindowDimensions().width - 48, 340);
  const center = useRef({ x: 0, y: 0 });
  const rotation = useRef(0);
  const lastAngle = useRef(0);
  const [angle, setAngle] = useState(0);
  const level = levelAtRotation(-angle);

  const updateRotation = useCallback((value: number) => {
    rotation.current = value;
    setAngle(value);
  }, []);
  // PanResponder stores these handlers; refs are read only when a touch event runs.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      const { pageX, pageY, locationX, locationY } = event.nativeEvent;
      center.current = { x: pageX - locationX + size / 2, y: pageY - locationY + size / 2 };
      lastAngle.current = Math.atan2(locationY - size / 2, locationX - size / 2) * 180 / Math.PI;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: event => {
      const next = Math.atan2(event.nativeEvent.pageY - center.current.y, event.nativeEvent.pageX - center.current.x) * 180 / Math.PI;
      updateRotation(rotation.current + angleDelta(next, lastAngle.current));
      lastAngle.current = next;
    },
    onPanResponderRelease: () => updateRotation(Math.round(rotation.current / LEVEL_STEP) * LEVEL_STEP),
    onPanResponderTerminate: () => updateRotation(Math.round(rotation.current / LEVEL_STEP) * LEVEL_STEP),
  }), [size, updateRotation]);
  return (
    <View style={styles.wrapper}>
      <View style={{ width: size, height: size }}>
        <View {...responder.panHandlers} collapsable={false}
          accessibilityRole="adjustable" accessibilityLabel="Ski level"
          accessibilityValue={{ min: 1, max: 7, now: level, text: `Level ${level}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={event => updateRotation(rotation.current + (event.nativeEvent.actionName === 'increment' ? -LEVEL_STEP : LEVEL_STEP))}
          style={styles.touchRing}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${angle}deg` }] }]}>
          <View style={[styles.track, { inset: size * 0.1 }]} />
          {Array.from({ length: 7 }, (_, i) => {
            const radians = i * LEVEL_STEP * Math.PI / 180;
            return <View pointerEvents="none" key={i} style={[styles.marker, {
              left: size / 2 + Math.sin(radians) * size * 0.4 - 19,
              top: size / 2 - Math.cos(radians) * size * 0.4 - 19,
              backgroundColor: level === i + 1 ? colors.accent : colors.surface,
              transform: [{ rotate: `${-angle}deg` }],
            }]}><Text style={[styles.number, level === i + 1 && { color: colors.onAccent }]}>{i + 1}</Text></View>;
          })}
          </View>
          <View pointerEvents="none" style={[styles.arrow, { top: size * 0.18, left: size / 2 - 7 }]}>
            <SymbolView name="arrowtriangle.up.fill" size={14} tintColor={colors.accent} />
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open level ${level}`}
          onPress={() => onOpen(level)} style={({ pressed }) => [styles.center, {
            width: size * 0.54, height: size * 0.54, borderRadius: size / 2,
            top: size * 0.23, left: size * 0.23, opacity: pressed ? 0.7 : 1,
          }]}>
          <Text style={styles.overline}>SKI LEVEL</Text>
          <Text style={styles.selected}>L{level}</Text>
          <Text style={styles.open}>Explore level ↗</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Drag the ring to rotate · Tap the centre to explore</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 20 },
  touchRing: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  track: { position: 'absolute', borderWidth: 2, borderColor: colors.border, borderRadius: 999 },
  marker: { position: 'absolute', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  number: { color: colors.muted, fontWeight: '700', fontSize: 15 },
  arrow: { position: 'absolute' },
  center: { position: 'absolute', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overline: { color: colors.muted, fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  selected: { color: colors.ink, fontSize: 64, fontWeight: '700', letterSpacing: -3 },
  open: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 11 },
});
