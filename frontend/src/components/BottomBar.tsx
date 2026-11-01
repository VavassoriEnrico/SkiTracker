import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';

type Tab = 'index' | 'levels' | 'profile';
export default function BottomBar({ active, onSelect }: { active: string; onSelect: (tab: Tab) => void }) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      <View style={styles.tabs}>
        {(['index', 'levels', 'profile'] as const).map(tab => {
          const selected = active === tab;
          const label = tab === 'index' ? 'Home' : tab === 'levels' ? 'Levels' : 'Profile';
          const icon = tab === 'index' ? 'house.fill' : tab === 'levels' ? 'circle.grid.2x2.fill' : 'person.crop.circle';
          return (
            <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected }} onPress={() => onSelect(tab)}
              style={({ pressed }) => [styles.tab, selected && styles.active, pressed && { opacity: 0.65 }]}>
              <SymbolView name={icon} size={23} tintColor={selected ? colors.accent : colors.muted} />
              {tab !== 'profile' && <Text style={[styles.label, selected && { color: colors.accent }]}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, minWidth: 48, paddingHorizontal: 12, borderRadius: 16 },
  active: { backgroundColor: colors.avatar },
  label: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
