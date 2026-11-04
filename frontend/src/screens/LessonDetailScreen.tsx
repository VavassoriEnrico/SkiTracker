import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getLesson } from '../api/lesson';
import { getCustomers } from '../api/customer';
import { getSkiInstructor } from '../api/skiInstructor';
import { deleteLessonVideo, getLessonVideos, updateLessonVideo, uploadLessonVideo } from '../api/lessonVideo';
import { ActionButton, colors, Field } from '../components/Form';
import ClientAvatar from '../components/ClientAvatar';
import LevelVideo from '../components/LevelVideo';
import PageBack from '../components/PageBack';
import type { SkiLesson } from '../types/lesson';
import type { SkiCustomer } from '../types/customer';
import type { SkiInstructor } from '../types/skiInstructor';
import type { LessonVideo } from '../types/lessonVideo';
import { durationLabel, parseDay } from '../utils/lessonCalendar';

function personName(person: { name: string | null; surname: string | null; username: string | null }) {
  return [person.name, person.surname].filter(Boolean).join(' ') || person.username || 'Client';
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<SkiLesson | null>(null);
  const [clients, setClients] = useState<SkiCustomer[]>([]);
  const [instructor, setInstructor] = useState<SkiInstructor | null>(null);
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [reload, setReload] = useState(0);

  function retry() {
    setLoading(true);
    setError('');
    setReload(value => value + 1);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [item, people, teacher, videoResult] = await Promise.all([
          getLesson(Number(id)), getCustomers(), getSkiInstructor(),
          getLessonVideos(Number(id)).then(value => ({ value, error: '' }),
            error => ({ value: [] as LessonVideo[], error: error instanceof Error ? error.message : 'Unable to load videos.' })),
        ]);
        if (!active) return;
        setLesson(item);
        setClients(people.filter(person => item.customer_ids.includes(person.id)));
        setInstructor(teacher);
        setVideos(videoResult.value);
        setVideoError(videoResult.error);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Unable to load lesson.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id, reload]);

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageBack fallback="/lessons" />
      <Text style={styles.title}>Lesson details</Text>
      {loading ? <ActivityIndicator color={colors.accent} /> : error ? <View style={styles.card}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        <ActionButton title="Try again" onPress={retry} />
      </View> : lesson && <>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>ON THE MOUNTAIN</Text>
          <Text style={styles.heading}>{parseDay(lesson.lesson_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={styles.time}>{lesson.start_time.slice(0, 5)} — {lesson.end_time.slice(0, 5)}</Text>
          <Text style={styles.muted}>{durationLabel(lesson.start_time, lesson.end_time)} · {clients.length > 1 ? 'Group lesson' : 'Individual lesson'}</Text>
        </View>
        <Text style={styles.heading}>Instructor</Text>
        {instructor && <View style={styles.card}>
          <Text style={styles.name}>{personName(instructor)}</Text>
          <Text style={styles.muted}>{instructor.email}</Text>
        </View>}
        <Text style={styles.heading}>Clients · {clients.length}</Text>
        {clients.map(client => <Pressable key={client.id} accessibilityRole="button" accessibilityLabel={`Open ${personName(client)}`}
          onPress={() => router.push({ pathname: '/clients/[id]', params: { id: client.id } })} style={[styles.card, styles.row]}>
          <ClientAvatar uri={client.profile_image_url} name={client.name} surname={client.surname} size={46} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.name}>{personName(client)}</Text>
            <Text style={styles.muted}>{client.email}</Text>
            <Text style={styles.accent}>Level {client.level ?? '—'} · Ability {client.ability ?? '—'}</Text>
          </View>
          <SymbolView name="chevron.right" size={15} tintColor={colors.muted} />
        </Pressable>)}
        <Text style={styles.heading}>Videos · {videos.length}</Text>
        <Text style={styles.muted}>Keep a video for the whole lesson or link it to one client.</Text>
        {videoError ? <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>{videoError}</Text>
          <ActionButton title="Retry videos" onPress={retry} />
        </View> : <>
          <VideoUpload lessonId={lesson.id} clients={clients} onUploaded={video => setVideos(current => [...current, video])} />
          {videos.map(video => <VideoCard key={video.id} video={video} clients={clients}
            onSaved={updated => setVideos(current => current.map(item => item.id === updated.id ? updated : item))}
            onDeleted={() => setVideos(current => current.filter(item => item.id !== video.id))} />)}
          {!videos.length && <Text style={styles.muted}>No videos yet. Add the first clip from this lesson.</Text>}
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function ClientSelector({ clients, value, onChange, disabled = false }: {
  clients: SkiCustomer[]; value: string | null; onChange: (value: string | null) => void; disabled?: boolean;
}) {
  const choices = [{ id: null, label: 'Whole lesson' }, ...clients.map(client => ({ id: client.id, label: personName(client) }))];
  return <View style={{ gap: 9 }}>
    <Text style={styles.muted}>Video linked to</Text>
    <View style={styles.choices}>{choices.map(choice => <Pressable key={choice.id ?? 'all'} disabled={disabled}
      accessibilityRole="button" accessibilityState={{ selected: value === choice.id }}
      onPress={() => onChange(choice.id)} style={[styles.chip, value === choice.id && styles.selectedChip]}>
      <Text style={value === choice.id ? styles.accent : styles.muted}>{choice.label}</Text>
    </Pressable>)}</View>
  </View>;
}

function VideoUpload({ lessonId, clients, onUploaded }: { lessonId: number; clients: SkiCustomer[]; onUploaded: (video: LessonVideo) => void }) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function chooseVideo() {
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Allow access to Photos to choose a video.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (selected.fileSize && selected.fileSize > 50 * 1024 * 1024) throw new Error('Choose a video smaller than 50 MB.');
      setAsset(selected);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to choose video.');
    }
  }

  async function upload() {
    if (!asset || busy) return;
    setBusy(true);
    setError('');
    try {
      const video = await uploadLessonVideo(lessonId, asset, customerId, comment);
      onUploaded(video);
      setAsset(null);
      setComment('');
      setCustomerId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to upload video.');
    } finally { setBusy(false); }
  }

  return <View style={styles.card}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={chooseVideo} style={styles.pick}>
      <SymbolView name="video.badge.plus" size={24} tintColor={colors.accent} />
      <Text style={styles.accent}>{asset ? 'Change video' : 'Choose a video'}</Text>
    </Pressable>
    <Text style={styles.muted}>{asset ? asset.fileName || 'Video selected' : 'From your photo library · up to 50 MB'}</Text>
    {asset && <>
      <ClientSelector clients={clients} value={customerId} onChange={setCustomerId} disabled={busy} />
      <Field label="Comment" value={comment} onChangeText={setComment} multiline editable={!busy} placeholder="What should the skier focus on?" />
      <ActionButton title="Upload video" loading={busy} onPress={upload} />
    </>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

function VideoCard({ video, clients, onSaved, onDeleted }: {
  video: LessonVideo; clients: SkiCustomer[]; onSaved: (video: LessonVideo) => void; onDeleted: () => void;
}) {
  const [comment, setComment] = useState(video.comment || '');
  const [customerId, setCustomerId] = useState(video.customer_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changed = (comment.trim() || null) !== video.comment || customerId !== video.customer_id;

  async function save() {
    setBusy(true);
    setError('');
    try { onSaved(await updateLessonVideo(video.id, { comment: comment.trim() || null, customer_id: customerId })); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save video.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try { await deleteLessonVideo(video.id); onDeleted(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete video.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.card}>
    <LevelVideo url={video.video_url} />
    <ClientSelector clients={clients} value={customerId} onChange={setCustomerId} disabled={busy} />
    <Field label="Comment" value={comment} onChangeText={setComment} multiline editable={!busy} placeholder="Add a comment…" />
    {changed && <ActionButton title="Save changes" loading={busy} onPress={save} />}
    <Pressable accessibilityRole="button" accessibilityLabel="Delete video" disabled={busy} onPress={remove} style={styles.delete}>
      {busy ? <ActivityIndicator color={colors.error} /> : <SymbolView name="trash" size={18} tintColor={colors.error} />}
      <Text style={styles.error}>Delete video</Text>
    </Pressable>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 36, gap: 18 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', marginBottom: 4 },
  heading: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  card: { padding: 18, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  eyebrow: { color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  time: { color: colors.ink, fontSize: 28, fontWeight: '600' },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  accent: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  error: { color: colors.error, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  selectedChip: { borderColor: colors.accent, backgroundColor: colors.avatar },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
});
