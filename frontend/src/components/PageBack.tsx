import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';

export default function PageBack({ toLevels = false }: { toLevels?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Go back"
    onPress={() => router.canGoBack() ? router.back() : router.replace(toLevels ? '/levels' : '/')}
    style={styles.button}>
    <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
    <Text style={styles.label}>Back</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  label: { color: colors.ink, fontSize: 16 },
});
