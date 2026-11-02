import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCustomer, uploadCustomerPhoto } from '../api/customer';
import { ActionButton, colors } from '../components/Form';
import ClientAvatar from '../components/ClientAvatar';
import PageBack from '../components/PageBack';
import ClientEditForm from '../components/ClientEditForm';
import { chooseClientPhoto } from '../lib/clientPhoto';
import type { SkiCustomer } from '../types/customer';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <PageBack fallback="/clients" />
      <ClientDetails key={id} id={id} />
    </ScrollView>
  </SafeAreaView>;
}

function ClientDetails({ id }: { id: string }) {
  const [client, setClient] = useState<SkiCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getCustomer(id).then(data => {
      if (active) setClient(data);
    }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'Unable to load this client.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, attempt]);

  async function changePhoto() {
    try {
      const photo = await chooseClientPhoto();
      if (!photo) return;
      setUploading(true);
      setError('');
      setClient(await uploadCustomerPhoto(id, photo.base64));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update the photo.');
    } finally { setUploading(false); }
  }

  if (loading) return <ActivityIndicator color={colors.accent} />;
  if (!client) return <>
    <Text accessibilityRole="alert" style={styles.error}>{error || 'Client not found.'}</Text>
    <ActionButton title="Try again" onPress={() => { setLoading(true); setError(''); setAttempt(value => value + 1); }} />
  </>;

  const fields = [
    ['First name', client.name], ['Last name', client.surname],
    ['Username', client.username], ['Email', client.email],
    ['Date of birth', client.birth_date], ['Sex', client.sex],
    ['Level', client.level === null ? null : `L${client.level}`],
    ['Ability', client.ability === null ? null : String(client.ability)],
  ];
  return <>
    <View style={styles.hero}>
      <ClientAvatar uri={client.profile_image_url} name={client.name} surname={client.surname} size={104} />
      <Text style={styles.title}>{[client.name, client.surname].filter(Boolean).join(' ') || 'Client'}</Text>
      <Pressable accessibilityRole="button" disabled={uploading || editing} onPress={changePhoto} style={styles.photoButton}>
        {uploading ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.photoText}>{client.profile_image_url ? 'Change profile photo' : 'Add profile photo'}</Text>}
      </Pressable>
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.heading}>{editing ? 'Edit client' : 'Client details'}</Text>
        {!editing && <Pressable accessibilityRole="button" disabled={uploading} onPress={() => { setError(''); setEditing(true); }} style={styles.editButton}>
          <Text style={styles.photoText}>Edit</Text>
        </Pressable>}
      </View>
      {editing ? <ClientEditForm client={client} onSaved={updated => { setClient(updated); setEditing(false); }} onCancel={() => setEditing(false)} /> : fields.map(([label, value]) => <View key={label} style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Text selectable style={styles.value}>{value || 'Not set'}</Text>
      </View>)}
    </View>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 0, paddingBottom: 32, gap: 20 },
  hero: { alignItems: 'center', gap: 16, paddingVertical: 16 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '700', textAlign: 'center' },
  photoButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  photoText: { color: colors.accent, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '600' },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  error: { color: colors.error, lineHeight: 21 },
});
