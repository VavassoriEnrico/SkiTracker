import { useCallback } from 'react';
import { useEvent } from 'expo';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from './Form';

export default function LevelVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useFocusEffect(useCallback(() => {
    return () => { player.pause(); };
  }, [player]));

  return <View style={styles.container}>
    <VideoView player={player} style={styles.video} nativeControls
      contentFit="contain" fullscreenOptions={{ enable: true }} />
    {(status === 'idle' || status === 'loading') && <View pointerEvents="none" style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
    </View>}
    {status === 'error' && <Text accessibilityRole="alert" style={styles.error}>
      Unable to load video. Check the connection and the video URL.
    </Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface },
  video: { width: '100%', aspectRatio: 16 / 9 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, padding: 16, fontSize: 14, lineHeight: 21 },
});
