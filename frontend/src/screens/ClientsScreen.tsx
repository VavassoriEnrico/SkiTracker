import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getCustomers } from '../api/customer';
import ClientAvatar from '../components/ClientAvatar';
import { ActionButton, colors } from '../components/Form';
import type { SkiCustomer } from '../types/customer';

export default function ClientsScreen() {
  const [query, setQuery] = useState({ text: '', revision: 0 });
  const search = query.text;
  const [clients, setClients] = useState<SkiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      getCustomers(query.text).then(data => {
        if (active) setClients(data);
      }).catch(error => {
        if (active) setError(error instanceof Error ? error.message : 'Unable to load clients.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]));

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.brand}>SKITRACKER</Text>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/clients/new')} style={styles.add}>
          <SymbolView name="plus" size={17} tintColor={colors.onAccent} />
          <Text style={styles.addText}>Add client</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Your skiers, all in one place.</Text>
      <View style={styles.search}>
        <SymbolView name="magnifyingglass" size={19} tintColor={colors.muted} />
        <TextInput accessibilityLabel="Search clients by name, surname, username or email"
          placeholder="Name, username or email" placeholderTextColor={colors.placeholder}
          value={search} onChangeText={text => setQuery({ text, revision: 0 })} autoCapitalize="none" autoCorrect={false}
          maxLength={200} keyboardAppearance="dark" returnKeyType="search" style={styles.searchInput} />
        {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery({ text: '', revision: 0 })} style={styles.clear}>
          <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.muted} />
        </Pressable>}
      </View>
      {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} /> : error ? <View style={styles.feedback}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <ActionButton title="Try again" onPress={() => setQuery(current => ({ ...current, revision: current.revision + 1 }))} />
      </View> : <>
        <Text style={styles.count}>{clients.length} {clients.length === 1 ? 'client' : 'clients'}</Text>
        {clients.length ? clients.map(client => <Pressable key={client.id}
          accessibilityRole="button" accessibilityLabel={`Open ${client.name || ''} ${client.surname || ''}`}
          onPress={() => router.push({ pathname: '/clients/[id]', params: { id: client.id } })}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.65 }]}>
          <ClientAvatar uri={client.profile_image_url} name={client.name} surname={client.surname} />
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>{[client.name, client.surname].filter(Boolean).join(' ') || client.username || 'Client'}</Text>
            {!!client.username && <Text numberOfLines={1} style={styles.detail}>@{client.username}</Text>}
            {!!client.email && <Text numberOfLines={1} style={styles.detail}>{client.email}</Text>}
          </View>
          <SymbolView name="chevron.right" size={16} tintColor={colors.muted} />
        </Pressable>) : <View style={styles.empty}>
          <SymbolView name="person.2" size={36} tintColor={colors.muted} />
          <Text style={styles.emptyTitle}>{search.trim() ? 'No matching clients' : 'No clients yet'}</Text>
          <Text style={styles.subtitle}>{search.trim() ? 'Try a different name, username or email.' : 'Tap Add client to create your first skier.'}</Text>
        </View>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 32, gap: 16 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1.5, paddingVertical: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  add: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, paddingHorizontal: 14, minHeight: 44, borderRadius: 14 },
  addText: { color: colors.onAccent, fontSize: 13, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  search: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, minHeight: 54, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, minHeight: 52, color: colors.ink, fontSize: 14 },
  clear: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  count: { color: colors.muted, fontSize: 12, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface },
  identity: { flex: 1, gap: 5 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 12 },
  feedback: { gap: 12 },
  error: { color: colors.error, lineHeight: 21 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 44 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '600' },
});
