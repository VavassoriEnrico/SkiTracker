import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getLevel } from '../api/level';
import { ActionButton, colors } from '../components/Form';
import PageBack from '../components/PageBack';
import LevelVideo from '../components/LevelVideo';
import LevelAbilities from '../components/LevelAbilities';
import type { SkiLevel } from '../types/level';

export default function LevelDetailScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const valid = /^[1-7]$/.test(level ?? '');
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <PageBack toLevels />
      {valid ? <LevelContent key={level} levelNumber={Number(level)} /> : <Text style={styles.title}>Level not found</Text>}
    </ScrollView>
  </SafeAreaView>;
}

function LevelContent({ levelNumber }: { levelNumber: number }) {
  const [level, setLevel] = useState<SkiLevel | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getLevel(levelNumber).then(data => {
      if (active) setLevel(data);
    }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'Unable to load this level.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [levelNumber, attempt]);

  return <>
    <Text style={styles.eyebrow}>SKI LEVELS / L{levelNumber}</Text>
    <Text style={styles.title}>{level?.name || `Level ${levelNumber}`}</Text>
    {loading ? <ActivityIndicator color={colors.accent} /> : error ? <>
      <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      <ActionButton title="Try again" onPress={() => {
        setError('');
        setLoading(true);
        setAttempt(value => value + 1);
      }} />
    </> : level ? <>
      {level.video_url ? <LevelVideo key={level.video_url} url={level.video_url} /> : <View style={styles.video}>
        <SymbolView name="play.circle" size={42} tintColor={colors.muted} />
        <Text style={styles.placeholder}>Level video coming soon</Text>
      </View>}
      <Text style={styles.heading}>About this level</Text>
      <Text style={styles.body}>{level.explanation || 'Explanation coming soon.'}</Text>
      <Text style={styles.heading}>Technical goal</Text>
      <Text style={styles.body}>{level.technical_goal || 'Technical goal coming soon.'}</Text>
      <Text style={styles.heading}>The three skills</Text>
      <LevelAbilities key={level.id} levelId={level.id} />
    </> : null}
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 0, gap: 18, paddingBottom: 32 },
  eyebrow: { color: colors.accent, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 38, fontWeight: '700' },
  video: { aspectRatio: 16 / 9, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholder: { color: colors.muted, fontSize: 14 },
  heading: { color: colors.ink, fontSize: 22, fontWeight: '600', marginTop: 8 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
