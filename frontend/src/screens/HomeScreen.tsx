import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '../components/Form';

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>SKITRACKER</Text>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Your space on the mountain.</Text>
        <View style={styles.card}>
          <View style={styles.icon}>
            <SymbolView name="mountain.2" size={32} tintColor={colors.accent} />
          </View>
          <Text style={styles.cardTitle}>Every turn has a story.</Text>
          <Text style={styles.description}>Your ski sessions, videos and analyses will appear here.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 32 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1.5, paddingVertical: 20 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 30 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: 10, marginBottom: 28 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 26 },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  cardTitle: { color: colors.ink, fontSize: 23, fontWeight: '700', marginBottom: 12 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 25 },
});
