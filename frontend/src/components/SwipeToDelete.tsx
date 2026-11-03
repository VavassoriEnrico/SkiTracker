import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';

const REVEAL = 84;
const RED = '#EF4444';

export default function SwipeToDelete({ children, onDelete, label }: {
  children: ReactNode; onDelete: () => Promise<void>; label: string;
}) {
  const [offset] = useState(() => new Animated.Value(0));
  const position = useRef(0);
  const origin = useRef(0);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const snap = useCallback((show: boolean) => {
    setOpen(show);
    position.current = show ? -REVEAL : 0;
    Animated.timing(offset, { toValue: position.current, duration: 180, useNativeDriver: false }).start();
  }, [offset]);

  async function remove() {
    if (removing) return;
    setRemoving(true);
    try { await onDelete(); }
    catch (error) {
      Alert.alert('Unable to delete lesson', error instanceof Error ? error.message : 'Try again.');
    } finally { setRemoving(false); }
  }

  // PanResponder stores callbacks; these refs are only read during gesture events.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !removing && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4 &&
      (gesture.dx < -8 || (position.current < 0 && gesture.dx > 8)),
    onPanResponderGrant: () => offset.stopAnimation(value => { origin.current = value; }),
    onPanResponderMove: (_, gesture) => {
      position.current = Math.max(-REVEAL, Math.min(0, origin.current + gesture.dx));
      offset.setValue(position.current);
    },
    onPanResponderRelease: (_, gesture) => snap(position.current < -REVEAL / 2 || (gesture.vx < -0.5 && gesture.dx < 0)),
    onPanResponderTerminate: () => snap(false),
    onPanResponderTerminationRequest: () => false,
  }), [offset, removing, snap]);

  const borderColor = offset.interpolate({ inputRange: [-REVEAL, -12, 0], outputRange: [RED, RED, colors.border], extrapolate: 'clamp' });
  const actionOpacity = offset.interpolate({ inputRange: [-REVEAL, -16, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' });

  return <View style={styles.container}>
    <Animated.View style={[styles.action, { opacity: actionOpacity }]}
      pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${label}`} disabled={removing}
        onPress={remove} style={styles.deleteButton}>
        {removing ? <ActivityIndicator color={RED} /> : <SymbolView name="trash.fill" size={24} tintColor={RED} />}
      </Pressable>
    </Animated.View>
    <Animated.View {...responder.panHandlers} accessible accessibilityLabel={label}
      accessibilityActions={[{ name: 'delete', label: 'Delete lesson' }]}
      onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') void remove(); }}
      style={[styles.card, { borderColor, transform: [{ translateX: offset }] }]}>
      {children}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  container: { borderRadius: 18, overflow: 'hidden' },
  card: { borderWidth: 1, borderRadius: 18, backgroundColor: colors.surface },
  action: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 76 },
  deleteButton: { flex: 1, borderWidth: 1, borderColor: RED, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});
