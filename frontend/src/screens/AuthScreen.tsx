import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ActionButton, colors, Field } from '../components/Form';

export default function AuthScreen({ sessionError }: { sessionError: string }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) {
          Alert.alert('Check your email', 'If registration is available for this address, you will receive a confirmation email. Then return here to sign in.');
          setRegister(false);
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>△  SKITRACKER</Text>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>YOUR TIME ON THE MOUNTAIN</Text>
            <Text style={styles.title}>{register ? 'Your next turn\nstarts here.' : 'Welcome\nback.'}</Text>
            <Text style={styles.subtitle}>A closer look at your skiing, one turn at a time.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{register ? 'Create your account' : 'Sign in to SkiTracker'}</Text>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" editable={!loading} />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder={register ? 'Choose a password' : 'Your password'} secureTextEntry autoCapitalize="none" textContentType={register ? 'newPassword' : 'password'} editable={!loading} />
            {!!(error || sessionError) && <Text accessibilityRole="alert" style={styles.error}>{error || sessionError}</Text>}
            <ActionButton title={register ? 'Create account' : 'Sign in'} onPress={submit} loading={loading} />
          </View>
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => { setRegister(!register); setError(''); }} style={styles.switch}>
            <Text style={styles.switchText}>{register ? 'Already have an account? Sign in' : 'New to SkiTracker? Create an account'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, paddingTop: 28, paddingBottom: 40 },
  brand: { color: colors.accent, fontSize: 17, fontWeight: '800', letterSpacing: 2 },
  hero: { marginTop: 44, marginBottom: 32 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 46, lineHeight: 51, fontWeight: '800', marginTop: 14, letterSpacing: -2 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 290 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', marginBottom: 25 },
  error: { color: colors.error, marginBottom: 12, lineHeight: 21 },
  switch: { paddingVertical: 24, alignItems: 'center' },
  switchText: { color: colors.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
