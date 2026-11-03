import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { createCustomer, uploadCustomerPhoto } from '../api/customer';
import { ActionButton, colors, Field } from '../components/Form';
import ClientAvatar from '../components/ClientAvatar';
import PageBack from '../components/PageBack';
import NumberChoice from '../components/NumberChoice';
import SexChoice from '../components/SexChoice';
import { chooseClientPhoto, type ClientPhoto } from '../lib/clientPhoto';

const emptyForm = { name: '', surname: '', email: '', password: '', username: '', birthday: '', sex: '' };

export default function CreateClientScreen() {
  const [form, setForm] = useState(emptyForm);
  const [level, setLevel] = useState<number | null>(null);
  const [ability, setAbility] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<ClientPhoto | null>(null);

  function change(field: keyof typeof emptyForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit() {
    setError('');
    if (!form.name.trim() || !form.surname.trim() || !form.email.trim() || !form.password) {
      setError('Enter first name, last name, email and an initial password.');
      return;
    }
    if (form.password.length < 8) {
      setError('Use at least 8 characters for the initial password.');
      return;
    }
    if (form.birthday.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthday.trim())) {
      setError('Use YYYY-MM-DD for the date of birth.');
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const customer = await createCustomer({
        name: form.name.trim(), surname: form.surname.trim(),
        email: form.email.trim(), password: form.password,
        username: form.username.trim() || null,
        birth_date: form.birthday.trim() || null,
        sex: form.sex.trim() || null,
        level, ability,
      });
      setForm(emptyForm);
      setLevel(null);
      setAbility(null);
      if (photo) {
        try { await uploadCustomerPhoto(customer.id, photo.base64); }
        catch {
          Alert.alert('Client created', 'The profile photo could not be saved. You can add it from the client page.');
        }
      }
      router.replace({ pathname: '/clients/[id]', params: { id: customer.id } });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create the client.');
    } finally {
      setSaving(false);
    }
  }

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PageBack fallback="/clients" />
        <View style={styles.heading}>
          <View style={styles.icon}><SymbolView name="person.badge.plus" size={28} tintColor={colors.accent} /></View>
          <Text style={styles.title}>Add client</Text>
          <Text style={styles.subtitle}>Add a skier and create their account.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.photoGroup}>
            <ClientAvatar uri={photo?.uri} name={form.name} surname={form.surname} size={88} />
            <Pressable accessibilityRole="button" disabled={saving} onPress={async () => {
              try {
                const selected = await chooseClientPhoto();
                if (selected) setPhoto(selected);
              } catch (error) { setError(error instanceof Error ? error.message : 'Unable to choose a photo.'); }
            }} style={styles.photoButton}>
              <Text style={styles.photoText}>{photo ? 'Change photo' : 'Add profile photo'}</Text>
            </Pressable>
          </View>
          <Text style={styles.section}>Personal details</Text>
          <Field label="First name *" value={form.name} onChangeText={value => change('name', value)} textContentType="givenName" editable={!saving} />
          <Field label="Last name *" value={form.surname} onChangeText={value => change('surname', value)} textContentType="familyName" editable={!saving} />
          <Field label="Username (optional)" value={form.username} onChangeText={value => change('username', value)} autoCapitalize="none" autoCorrect={false} editable={!saving} />
          <Field label="Date of birth (optional)" value={form.birthday} onChangeText={value => change('birthday', value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" editable={!saving} />
          <SexChoice label="Sex (optional)" value={form.sex} onChange={value => change('sex', value)} disabled={saving} />
          <Text style={styles.section}>Skiing</Text>
          <NumberChoice label="Level (optional)" count={7} value={level} onChange={setLevel} disabled={saving} prefix="L" />
          <NumberChoice label="Ability (optional)" count={3} value={ability} onChange={setAbility} disabled={saving} />
          <Text style={styles.section}>Login details</Text>
          <Field label="Email *" value={form.email} onChangeText={value => change('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" editable={!saving} />
          <Field label="Initial password *" value={form.password} onChangeText={value => change('password', value)} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" editable={!saving} />
          <Text style={styles.note}>The client will sign in with this email and password.</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <ActionButton title="Create client" onPress={submit} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  photoGroup: { alignItems: 'center', gap: 12, marginBottom: 24 },
  photoButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  photoText: { color: colors.accent, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 32 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1.5, paddingVertical: 20 },
  heading: { gap: 12, marginVertical: 24 },
  icon: { backgroundColor: colors.avatar, borderRadius: 16, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  section: { color: colors.ink, fontSize: 20, fontWeight: '600', marginBottom: 24, marginTop: 8 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21, marginVertical: 12 },
  success: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: colors.avatar, gap: 8 },
  successTitle: { color: colors.accent, fontSize: 17, fontWeight: '600' },
});
