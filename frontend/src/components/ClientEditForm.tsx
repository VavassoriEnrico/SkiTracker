import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { updateCustomer } from '../api/customer';
import type { SkiCustomer } from '../types/customer';
import { ActionButton, colors, Field } from './Form';
import NumberChoice from './NumberChoice';
import SexChoice from './SexChoice';

export default function ClientEditForm({ client, onSaved, onCancel }: {
  client: SkiCustomer; onSaved: (client: SkiCustomer) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: client.name || '', surname: client.surname || '', username: client.username || '',
    birthday: client.birth_date || '', sex: client.sex || '',
  });
  const [level, setLevel] = useState(client.level);
  const [ability, setAbility] = useState(client.ability);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function change(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function save() {
    setError('');
    if (!form.name.trim() || !form.surname.trim()) {
      setError('Enter first name and last name.');
      return;
    }
    if (form.birthday.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.birthday.trim())) {
      setError('Use YYYY-MM-DD for the date of birth.');
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const updated = await updateCustomer(client.id, {
        name: form.name.trim(), surname: form.surname.trim(),
        username: form.username.trim() || null,
        birth_date: form.birthday.trim() || null, sex: form.sex.trim() || null,
        level, ability,
      });
      onSaved(updated);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save the client.');
    } finally { setSaving(false); }
  }

  return <View>
    <Field label="First name" value={form.name} onChangeText={value => change('name', value)} textContentType="givenName" maxLength={100} editable={!saving} />
    <Field label="Last name" value={form.surname} onChangeText={value => change('surname', value)} textContentType="familyName" maxLength={100} editable={!saving} />
    <Field label="Username" value={form.username} onChangeText={value => change('username', value)} autoCapitalize="none" autoCorrect={false} editable={!saving} />
    <Field label="Date of birth" value={form.birthday} onChangeText={value => change('birthday', value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" editable={!saving} />
    <SexChoice value={form.sex} onChange={value => change('sex', value)} disabled={saving} />
    <NumberChoice label="Level" count={7} value={level} onChange={setLevel} disabled={saving} prefix="L" />
    <NumberChoice label="Ability" count={3} value={ability} onChange={setAbility} disabled={saving} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <ActionButton title="Save changes" onPress={save} loading={saving} />
    <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.cancel}>
      <Text style={styles.cancelText}>Cancel</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
});
