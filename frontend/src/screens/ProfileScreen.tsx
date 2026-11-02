import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSkiInstructor, updateSkiInstructor } from '../api/skiInstructor';
import { ActionButton, colors, Field } from '../components/Form';
import { supabase } from '../lib/supabase';
import type { SkiInstructor } from '../types/skiInstructor';

export default function ProfileScreen() {
  const [instructor, setInstructor] = useState<SkiInstructor | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  function showInstructor(next: SkiInstructor) {
    setInstructor(next);
    setName(next.name || '');
    setSurname(next.surname || '');
    setUsername(next.username || '');
    setBirthday(next.birth_date || '');
  }

  async function load() {
    setLoading(true);
    setError('');
    try { showInstructor(await getSkiInstructor()); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to load your instructor.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    getSkiInstructor().then(next => {
      if (active) showInstructor(next);
    }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'Unable to load your instructor.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function save() {
    if (birthday.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(birthday.trim())) {
      setError('Use YYYY-MM-DD for your date of birth.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      showInstructor(await updateSkiInstructor({
        name: name.trim(), surname: surname.trim(), username: username.trim(),
        birth_date: birthday.trim() || undefined,
      }));
      Alert.alert('Profile saved', 'Your details have been updated.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save your instructor.');
    } finally { setSaving(false); }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Unable to sign out', error instanceof Error ? error.message : 'Try again.');
    } finally { setSigningOut(false); }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>SKITRACKER</Text>
          </View>
          <Text style={styles.title}>Your profile</Text>
          <Text style={styles.subtitle}>A little about the skier behind the turns.</Text>
          {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} /> : (
            <>
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              {!instructor ? <ActionButton title="Try again" onPress={load} /> : (
                <View style={styles.card}>
                  <View style={styles.identity}>
                    <View style={styles.avatar}><Text style={styles.initial}>{(instructor.name || instructor.email || 'S')[0].toUpperCase()}</Text></View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={styles.email}>{instructor.email}</Text>
                      <Text style={styles.instructorLabel}>Ski Instructor</Text>
                    </View>
                  </View>
                  <Field label="First name" value={name} onChangeText={setName} textContentType="givenName" editable={!saving} />
                  <Field label="Last name" value={surname} onChangeText={setSurname} textContentType="familyName" editable={!saving} />
                  <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} editable={!saving} />
                  <Field label="Date of birth" value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" editable={!saving} />
                  <ActionButton title="Save profile" onPress={save} loading={saving} />
                </View>
              )}
            </>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={saving || signingOut}
            onPress={signOut}
            style={({ pressed }) => [styles.logout, (pressed || signingOut) && { opacity: 0.65 }]}
          >
            <Text style={styles.logoutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  logout: { marginTop: 24, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  logoutText: { color: colors.error, fontSize: 16, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 30 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 28 },
  card: { padding: 22, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 30 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.accent, fontSize: 23, fontWeight: '700' },
  email: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  instructorLabel: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  error: { color: colors.error, marginBottom: 18, lineHeight: 22 },
});
