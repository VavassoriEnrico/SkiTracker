import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from './Form';

export default function ClientAvatar({ uri, name, surname, size = 56 }: {
  uri?: string | null; name?: string | null; surname?: string | null; size?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const shape = { width: size, height: size, borderRadius: size * 0.3 };
  return uri && uri !== failedUri ? <Image source={{ uri }} style={shape} accessibilityLabel="Client profile photo" onError={() => setFailedUri(uri)} /> :
    <View style={[styles.placeholder, shape]}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{((name?.[0] || '') + (surname?.[0] || '')).toUpperCase() || '?'}</Text>
    </View>;
}
const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.accent, fontWeight: '700' },
});
