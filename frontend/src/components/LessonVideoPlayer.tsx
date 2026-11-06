import { useCallback, useRef, useState } from 'react';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { analyzeLessonVideo, getPoseData } from '../api/lessonVideo';
import type { LessonVideo } from '../types/lessonVideo';
import type { PoseData } from '../types/pose';
import { ActionButton, colors } from './Form';
import PoseOverlay from './PoseOverlay';

type Mode = 'original' | 'overlay' | 'skeleton';

function seekTo(player: VideoPlayer, seconds: number) {
  player.currentTime = seconds;
}

export default function LessonVideoPlayer({ video, disabled, onAnalyzed, onBusyChange }: {
  video: LessonVideo; disabled: boolean;
  onAnalyzed: (video: LessonVideo) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [pose, setPose] = useState<PoseData | null>(null);
  const [mode, setMode] = useState<Mode>('original');
  const [analyzing, setAnalyzing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const focused = useRef(false);
  const player = useVideoPlayer(video.video_url, player => {
    player.timeUpdateEventInterval = 0.04;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; player.pause(); };
  }, [player]));

  async function seeSkeleton() {
    if (analyzing || disabled) return;
    setAnalyzing(true);
    onBusyChange(true);
    setError('');
    player.pause();
    try {
      const result = await analyzeLessonVideo(video.id);
      onAnalyzed(result);
      if (!result.pose_data_url) throw new Error('Skeleton points are not available. Please try again.');
      const data = await getPoseData(result.pose_data_url);
      setPose(data);
      setMode('overlay');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load skeleton. Please try again.');
    } finally {
      setAnalyzing(false);
      onBusyChange(false);
    }
  }

  async function changeMode(next: Mode) {
    if (next === mode && !error) return;
    setError('');
    if (error || (next === 'skeleton') !== (mode === 'skeleton')) {
      const time = player.currentTime;
      const playing = player.playing;
      setSwitching(true);
      player.pause();
      try {
        const url = next === 'skeleton' ? video.skeleton_video_url : video.video_url;
        if (!url) throw new Error('Skeleton video is not available.');
        await player.replaceAsync(url);
        seekTo(player, time);
        if (playing && focused.current) player.play();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to switch video.');
        return;
      } finally { setSwitching(false); }
    }
    setMode(next);
  }

  return <View style={styles.container}>
    <View style={[styles.viewport, { aspectRatio: pose ? pose.width / pose.height : 16 / 9 }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain"
        fullscreenOptions={{ enable: mode !== 'overlay' }} />
      {mode === 'overlay' && pose && !switching && <PoseOverlay player={player} data={pose} />}
      {(status === 'loading' || status === 'idle' || switching) && <View pointerEvents="none" style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>}
    </View>
    {status === 'error' && <Text accessibilityRole="alert" style={styles.error}>Unable to play video. Check your connection and try again.</Text>}
    {!pose ? <>
      <ActionButton title="See the skeleton" loading={analyzing || disabled} onPress={seeSkeleton} />
      {analyzing && <Text style={styles.hint}>{video.pose_data_url ? 'Loading skeleton…' : 'Analyzing your video. This may take a little while…'}</Text>}
    </> : <View style={styles.modes}>
      {(['original', 'overlay', 'skeleton'] as const).map(value => <Pressable key={value}
        accessibilityRole="button" accessibilityState={{ selected: mode === value }}
        disabled={disabled || switching} onPress={() => { void changeMode(value); }}
        style={[styles.mode, mode === value && styles.selected]}>
        <Text style={[styles.modeText, mode === value && { color: colors.accent }]}>
          {value === 'original' ? 'Original' : value === 'overlay' ? 'Overlay' : 'Skeleton only'}
        </Text>
      </Pressable>)}
    </View>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  viewport: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#000000' },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 6 },
  selected: { borderColor: colors.accent, backgroundColor: colors.avatar },
  modeText: { color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.error, fontSize: 13, lineHeight: 20 },
});
