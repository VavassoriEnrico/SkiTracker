import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './Form';

export default function NumberChoice({ label, count, value, onChange, disabled, prefix = '' }: {
  label: string; count: number; value: number | null;
  onChange: (value: number | null) => void; disabled: boolean; prefix?: string;
}) {
  return <View style={styles.choiceGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.choices}>
      {[null, ...Array.from({ length: count }, (_, i) => i + 1)].map(number => (
        <Pressable key={number ?? 'none'} accessibilityRole="radio"
          accessibilityLabel={`${label}: ${number === null ? 'not set' : prefix + number}`}
          accessibilityState={{ checked: value === number, disabled }} disabled={disabled}
          onPress={() => onChange(number)}
          style={[styles.choice, value === number && styles.selected]}>
          <Text style={[styles.choiceText, value === number && { color: colors.accent }]}>{number === null ? '—' : prefix + number}</Text>
        </Pressable>
      ))}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  choiceGroup: { gap: 10, marginBottom: 24 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minWidth: 44, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  selected: { backgroundColor: colors.avatar, borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
