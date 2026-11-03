import { useState } from 'react';
import { createLesson } from '../api/lesson';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { ActionButton, colors } from './Form';
import ClientAvatar from './ClientAvatar';
import type { SkiCustomer } from '../types/customer';
import type { SkiLesson } from '../types/lesson';
import { dayKey, durationLabel, parseDay, timeMinutes, availableLessonTimes } from '../utils/lessonCalendar';

export default function LessonPlanner({ day, clients, lessons, clientError, onClose, onSaved }: {
  day: string; clients: SkiCustomer[]; lessons: SkiLesson[]; clientError: string;
  onClose: () => void; onSaved: (lesson: SkiLesson) => void;
}) {
  const [date, setDate] = useState(day);
  const [preferredStart, setStart] = useState('08:30:00');
  const [preferredEnd, setEnd] = useState('09:30:00');
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeTime, setActiveTime] = useState<'start' | 'end'>('start');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedClients = clients.filter(client => customerIds.includes(client.id));
  const matches = clients.filter(client => [client.name, client.surname, client.username, client.email].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const starts = availableLessonTimes(lessons, date).starts;
  const start = starts.includes(preferredStart) ? preferredStart : starts.find(time => time >= preferredStart) || starts[0] || '';
  const ends = availableLessonTimes(lessons, date, start).ends;
  const end = ends.includes(preferredEnd) ? preferredEnd : ends.find(time => timeMinutes(time) >= timeMinutes(start) + 60) || ends[0] || '';
  const duration = start && end ? durationLabel(start, end) : '';
  const availableTimes = activeTime === 'start' ? starts : ends;

  async function save() {
    if (!customerIds.length) { setError('Choose at least one client for this lesson.'); return; }
    if (!start || !end) { setError('No available time on this day. Choose another day.'); return; }
    if (timeMinutes(end) <= timeMinutes(start)) { setError('End time must be after start time.'); return; }
    setSaving(true);
    setError('');
    try {
      onSaved(await createLesson({ customer_ids: customerIds, lesson_date: date, start_time: start, end_time: end }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save the lesson.');
    } finally { setSaving(false); }
  }

  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!saving) onClose(); }}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan a lesson</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close lesson planner" disabled={saving} onPress={onClose} style={styles.close}>
          <SymbolView name="xmark" size={18} tintColor={colors.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.subtitle}>A little planning. More time on the snow.</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Day</Text>
            <DateTimePicker disabled={saving} mode="date" display="compact" themeVariant="dark" locale="en-GB" value={parseDay(date)}
              onValueChange={(_, value) => setDate(dayKey(value))} />
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Time on the mountain</Text>
          <View style={styles.times}>
            {(['start', 'end'] as const).map(field => <Pressable key={field} accessibilityRole="button"
              accessibilityLabel={`Choose ${field} time`} disabled={saving} onPress={() => setActiveTime(field)}
              style={[styles.time, activeTime === field && styles.activeTime]}>
              <Text style={styles.timeLabel}>{field === 'start' ? 'START' : 'END'}</Text>
              <Text style={styles.timeValue}>{(field === 'start' ? start : end).slice(0, 5) || '—'}</Text>
            </Pressable>)}
          </View>
          <Text style={styles.note}>Available {activeTime === 'start' ? 'start' : 'end'} times</Text>
          <ScrollView style={styles.slotScroll} nestedScrollEnabled>
            <View style={styles.slots}>
              {availableTimes.map(time => <Pressable key={time} accessibilityRole="radio"
                accessibilityLabel={`${activeTime} time ${time.slice(0, 5)}`}
                accessibilityState={{ checked: time === (activeTime === 'start' ? start : end), disabled: saving }}
                disabled={saving} onPress={() => {
                  (activeTime === 'start' ? setStart : setEnd)(time);
                  setError('');
                }} style={[styles.slot, time === (activeTime === 'start' ? start : end) && styles.activeTime]}>
                <Text style={styles.slotText}>{time.slice(0, 5)}</Text>
              </Pressable>)}
            </View>
          </ScrollView>
          {!availableTimes.length && <Text style={styles.note}>No available times. Choose another day.</Text>}
          <Text style={styles.note}>{duration ? `${duration} on the snow · 30-minute intervals` : 'Select an available time.'}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Clients</Text>
            <Text style={styles.note}>{customerIds.length} selected</Text>
          </View>
          {!!selectedClients.length && <View style={styles.selectedClients}>
            {selectedClients.map(client => <Pressable key={client.id} disabled={saving} accessibilityRole="button"
              accessibilityLabel={`Remove ${client.name || client.username || 'client'}`}
              onPress={() => setCustomerIds(current => current.filter(id => id !== client.id))} style={styles.selectedClient}>
              <Text style={styles.link}>{[client.name, client.surname].filter(Boolean).join(' ') || client.username || 'Client'}</Text>
              <SymbolView name="xmark" size={11} tintColor={colors.accent} />
            </Pressable>)}
          </View>}
          <Text style={styles.note}>{customerIds.length > 1 ? 'Group lesson' : 'Select one client for an individual lesson, or several for a group.'}</Text>
            <TextInput accessibilityLabel="Find a client" placeholder="Search name, username or email" placeholderTextColor={colors.placeholder}
              value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" keyboardAppearance="dark" style={styles.search} />
            {clientError ? <Text style={styles.error}>{clientError}</Text> : <ScrollView style={{ maxHeight: 230 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {matches.map(client => <Pressable key={client.id} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: customerIds.includes(client.id) }} onPress={() => {
                setCustomerIds(current => current.includes(client.id) ? current.filter(id => id !== client.id) : [...current, client.id]);
                setError('');
              }} style={styles.client}>
                <ClientAvatar uri={client.profile_image_url} name={client.name} surname={client.surname} size={38} />
                <View style={{ flex: 1, gap: 4 }}><Text style={styles.name}>{[client.name, client.surname].filter(Boolean).join(' ') || client.username || 'Client'}</Text>
                  {!!client.email && <Text numberOfLines={1} style={styles.note}>{client.email}</Text>}
                </View>
                <SymbolView name={customerIds.includes(client.id) ? 'checkmark.circle.fill' : 'circle'} size={22} tintColor={customerIds.includes(client.id) ? colors.accent : colors.muted} />
              </Pressable>)}
              {!matches.length && <Text style={styles.note}>{clients.length ? 'No matching clients.' : 'Add your first skier from Clients.'}</Text>}
            </ScrollView>}
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <ActionButton title="Save lesson" onPress={save} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, gap: 18, paddingBottom: 36 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  times: { flexDirection: 'row', gap: 12 },
  time: { flex: 1, backgroundColor: colors.input, padding: 16, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: colors.border },
  activeTime: { backgroundColor: colors.avatar, borderColor: colors.accent },
  timeLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  timeValue: { color: colors.ink, fontSize: 28, fontWeight: '600' },
  slotScroll: { maxHeight: 210 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  slot: { minWidth: 64, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  slotText: { color: colors.ink, fontSize: 14 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  selectedClients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedClient: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.avatar },
  link: { color: colors.accent, fontWeight: '600' },
  client: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  search: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.input, fontSize: 13 },
  error: { color: colors.error, lineHeight: 21, fontSize: 14 },
});
