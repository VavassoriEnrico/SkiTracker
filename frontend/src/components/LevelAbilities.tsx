import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getAbility } from '../api/ability';
import { ActionButton, colors } from './Form';
import type { SkiAbility } from '../types/ability';

export default function LevelAbilities({ levelId }: { levelId: number }) {
  const [abilities, setAbilities] = useState<SkiAbility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([1, 2, 3].map(number => getAbility(levelId, number))).then(data => {
      if (active) setAbilities(data);
    }).catch(() => {
      if (active) setError('Unable to load abilities. Check the connection and that all three abilities have been added for this level.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [levelId, attempt]);

  if (loading) return <ActivityIndicator color={colors.accent} />;
  if (error) return <View style={styles.feedback}>
    <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
    <ActionButton title="Try again" onPress={() => {
      setError('');
      setLoading(true);
      setAttempt(value => value + 1);
    }} />
  </View>;

  return <View style={styles.list}>
    {abilities.map(ability => <View key={ability.id} style={styles.card}>
      <Text style={styles.number}>{ability.ability_number}</Text>
      <Text style={styles.name}>{ability.name}</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  number: { color: colors.accent, fontSize: 24, fontWeight: '600' },
  name: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '600' },
  feedback: { gap: 12 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
});
