import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../components/Form';
import { useSession } from '../hooks/useSession';
import { SessionErrorContext } from '../lib/sessionError';

export default function RootLayout() {
  const { session, loading, error } = useSession();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionErrorContext.Provider value={error}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
        )}
      </SessionErrorContext.Provider>
    </SafeAreaProvider>
  );
}
