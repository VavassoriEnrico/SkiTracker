import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { deleteLesson, getInstructorLessons } from '../api/lesson';
import { getCustomers } from '../api/customer';
import { ActionButton, colors } from '../components/Form';
import LessonCalendar from '../components/LessonCalendar';
import LessonPlanner from '../components/LessonPlanner';
import ClientAvatar from '../components/ClientAvatar';
import SwipeToDelete from '../components/SwipeToDelete';
import type { SkiCustomer } from '../types/customer';
import type { SkiLesson } from '../types/lesson';
import { dayKey, durationLabel, monthStart, parseDay } from '../utils/lessonCalendar';

export default function LessonsScreen() {
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [lessons, setLessons] = useState<SkiLesson[]>([]);
  const [clients, setClients] = useState<SkiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientError, setClientError] = useState('');
  const [planner, setPlanner] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++generation.current;
    setLoading(true);
    const [lessonResult, clientResult] = await Promise.allSettled([getInstructorLessons(), getCustomers()]);
    if (requestId !== generation.current) return;
    if (lessonResult.status === 'fulfilled') {
      setLessons(lessonResult.value);
      setError('');
    } else {
      setError('Unable to load your lessons. Please try again.');
    }
    if (clientResult.status === 'fulfilled') {
      setClients(clientResult.value);
      setClientError('');
    } else {
      setClientError('Unable to load clients. Close the planner and refresh Lessons to try again.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]));

  function selectDay(date: Date) {
    setSelectedDay(dayKey(date));
    setMonth(monthStart(date));
  }

  function changeMonth(date: Date) {
    const today = new Date();
    selectDay(date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() ? today : date);
  }

  const markedDays = new Set(lessons.map(lesson => lesson.lesson_date));
  const dayLessons = lessons.filter(lesson => lesson.lesson_date === selectedDay).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const clientFor = (id: string) => clients.find(client => client.id === id);
  const dateLabel = parseDay(selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  function lessonSaved(value: SkiLesson) {
    setLessons(current => [...current, value]);
    selectDay(parseDay(value.lesson_date));
    setPlanner(false);
  }

  async function removeLesson(id: number) {
    await deleteLesson(id);
    setLessons(current => current.filter(lesson => lesson.id !== id));
  }

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.brand}>SKITRACKER</Text>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}><Text style={styles.title}>Lessons</Text><Text style={styles.subtitle}>Your time on the mountain.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Plan a lesson" disabled={loading || !!error} onPress={() => setPlanner(true)} style={[styles.add, (loading || !!error) && { opacity: 0.5 }]}>
          <SymbolView name="plus" size={19} tintColor={colors.onAccent} />
          <Text style={styles.addText}>Plan</Text>
        </Pressable>
      </View>
      <View style={styles.calendarLabel}>
        <Text style={styles.eyebrow}>YOUR CALENDAR</Text>
        <Pressable accessibilityRole="button" onPress={() => selectDay(new Date())} style={styles.today}><Text style={styles.link}>Today</Text></Pressable>
      </View>
      <LessonCalendar month={month} selectedDay={selectedDay} markedDays={markedDays} onSelect={selectDay} onMonthChange={changeMonth} />
      <View style={styles.dayHeader}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.dayTitle}>{dateLabel}</Text>
          <Text style={styles.subtitle}>{dayLessons.length} {dayLessons.length === 1 ? 'lesson' : 'lessons'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh lessons and clients" disabled={loading} onPress={() => { void refresh(); }} style={styles.refresh}>
          <SymbolView name="arrow.clockwise" size={19} tintColor={colors.muted} />
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={colors.accent} /> : error ? <View style={styles.feedback}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <ActionButton title="Try again" onPress={() => { void refresh(); }} />
      </View> : <>
        {dayLessons.map(lesson => <LessonCard key={lesson.id} onDelete={() => removeLesson(lesson.id)} lesson={lesson} clients={lesson.customer_ids.map(clientFor).filter((client): client is SkiCustomer => !!client)} />)}
        {!dayLessons.length && <View style={styles.empty}>
          <View style={styles.emptyIcon}><SymbolView name="calendar.badge.plus" size={28} tintColor={colors.accent} /></View>
          <Text style={styles.emptyTitle}>Room for a new lesson.</Text>
          <Text style={styles.subtitle}>Choose a time and a skier to plan this day.</Text>
          <Pressable accessibilityRole="button" onPress={() => setPlanner(true)} style={styles.planDay}><Text style={styles.link}>Plan a lesson ↗</Text></Pressable>
        </View>}
      </>}
    </ScrollView>
    {planner && <LessonPlanner day={selectedDay} clients={clients} lessons={lessons} clientError={clientError}
      onClose={() => setPlanner(false)} onSaved={lessonSaved} />}
  </SafeAreaView>;
}

function LessonCard({ lesson, clients, onDelete }: { lesson: SkiLesson; clients: SkiCustomer[]; onDelete: () => Promise<void> }) {
  const client = clients[0];
  const group = lesson.customer_ids.length > 1;
  const name = clients.map(person => [person.name, person.surname].filter(Boolean).join(' ') || person.username || 'Client').join(', ') || 'Client';
  return <SwipeToDelete onDelete={onDelete} onOpen={() => router.push({ pathname: '/lessons/[id]', params: { id: lesson.id } })}
    label={`Lesson ${lesson.start_time.slice(0, 5)} to ${lesson.end_time.slice(0, 5)}, ${name}`}>
    <View style={styles.lesson}>
    <View style={styles.lessonTime}><Text style={styles.start}>{lesson.start_time.slice(0, 5)}</Text><Text style={styles.end}>{lesson.end_time.slice(0, 5)}</Text></View>
    <View style={styles.rail} />
    <View style={styles.lessonIdentity}>
      {group ? <View style={styles.groupIcon}><SymbolView name="person.2.fill" size={20} tintColor={colors.accent} /></View> :
        <ClientAvatar uri={client?.profile_image_url} name={client?.name} surname={client?.surname} size={36} />}
      <View style={{ flex: 1, gap: 6 }}><Text numberOfLines={2} style={styles.clientName}>{name}</Text><Text style={styles.subtitle}>{durationLabel(lesson.start_time, lesson.end_time)} · {group ? `Group · ${lesson.customer_ids.length} clients` : 'Individual'}</Text></View>
      <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
    </View>
    </View>
  </SwipeToDelete>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 36, gap: 16 },
  brand: { color: colors.accent, fontSize: 15, fontWeight: '800', letterSpacing: 1.5, paddingVertical: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  add: { backgroundColor: colors.accent, borderRadius: 16, minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', gap: 7, alignItems: 'center' },
  addText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
  calendarLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  today: { minHeight: 44, justifyContent: 'center', paddingLeft: 16 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dayTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  refresh: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  feedback: { gap: 12 },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 },
  empty: { padding: 24, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: 'center', gap: 12, backgroundColor: colors.surface },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  planDay: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  lesson: { backgroundColor: colors.surface, borderRadius: 17, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonTime: { gap: 7 },
  start: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  end: { color: colors.muted, fontSize: 12 },
  rail: { width: 3, height: 48, borderRadius: 2, backgroundColor: colors.accent },
  lessonIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  clientName: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
