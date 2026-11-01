import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type TextInputProps,
} from 'react-native';

export const colors = {
  background: '#0B1220', surface: '#131F31', input: '#0D1727',
  ink: '#F2F6FC', muted: '#A4B2C6', placeholder: '#8494AA',
  accent: '#55D6BE', onAccent: '#072B26', border: '#29394F',
  avatar: '#183B3B', error: '#FFA3A3',
};

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.accent}
        keyboardAppearance="dark"
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}

export function ActionButton({ title, onPress, loading = false }: {
  title: string; onPress: () => void; loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || loading) && { opacity: 0.65 }]}
    >
      {loading ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, marginBottom: 18 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 15, fontSize: 16, color: colors.ink, backgroundColor: colors.input },
  button: { backgroundColor: colors.accent, borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
});
