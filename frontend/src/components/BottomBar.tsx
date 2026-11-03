import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';

type Tab = 'index' | 'levels' | 'clients' | 'lessons' | 'profile';
export default function BottomBar({ active, onSelect }: { active: string; onSelect: (tab: Tab) => void }) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      <View style={styles.tabs}>
        {(['index', 'levels', 'lessons', 'clients', 'profile'] as const).map(tab => {
          const selected = active === tab;
          const label = tab === 'index' ? 'Home' : tab === 'levels' ? 'Levels' : tab === 'clients' ? 'Clients' : tab === 'lessons' ? 'Lessons' : 'Profile';
          const icon = tab === 'index' ? 'house.fill' : tab === 'levels' ? 'circle.grid.2x2.fill' : tab === 'clients' ? 'person.2.fill' : tab === 'lessons' ? 'calendar' : 'person.crop.circle';
          return (
            <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected }} onPress={() => onSelect(tab)}
              style={({ pressed }) => [styles.tab, tab === 'profile' && styles.profile, selected && styles.active, pressed && { opacity: 0.65 }]}>
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
  tabs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 54, minWidth: 44, paddingHorizontal: 4, borderRadius: 16 },
  profile: { flex: 0, width: 44, marginLeft: 4 },
  active: { backgroundColor: colors.avatar },
  label: { color: colors.muted, fontSize: 11, fontWeight: '600' },
});
