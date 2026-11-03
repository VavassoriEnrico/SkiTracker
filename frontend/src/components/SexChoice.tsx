import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from './Form';

export default function SexChoice({ value, onChange, disabled, label = 'Sex' }: {
  value: string; onChange: (value: string) => void; disabled: boolean; label?: string;
}) {
  const options = ['', 'Male', 'Female', 'Other'];
  // Preserve any value previously entered as free text until it is changed.
  if (value && !options.includes(value)) options.push(value);

  return <View style={styles.choiceGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.choices}>
      {options.map(option => <Pressable key={option || 'none'} accessibilityRole="radio"
        accessibilityLabel={`${label}: ${option || 'not set'}`}
        accessibilityState={{ checked: value === option, disabled }} disabled={disabled}
        onPress={() => onChange(option)} style={[styles.choice, value === option && styles.selected]}>
        <Text style={[styles.choiceText, value === option && { color: colors.accent }]}>{option || '—'}</Text>
      </Pressable>)}
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
