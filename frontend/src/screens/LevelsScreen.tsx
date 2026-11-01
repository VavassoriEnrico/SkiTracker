import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../components/Form';
import LevelDial from '../components/LevelDial';
import PageBack from '../components/PageBack';

export default function LevelsScreen() {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.header}>
      <PageBack />
      <Text style={styles.eyebrow}>THE LEARNING PATH</Text>
      <Text style={styles.title}>Seven levels.
Your next step.</Text>
      <Text style={styles.subtitle}>Explore the skills behind each ski level.</Text>
    </View>
    <View style={styles.dial}><LevelDial onOpen={level => router.push(`/levels/${level}`)} /></View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 24, gap: 12 },
  eyebrow: { marginTop: 12, color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  dial: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});
