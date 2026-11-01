import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/components/Form';
import { useSession } from './src/hooks/useSession';
import AuthScreen from './src/screens/AuthScreen';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  const { session, loading, error } = useSession();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : session ? (
        <MainScreen key={session.user.id} />
      ) : (
        <AuthScreen sessionError={error} />
      )}
    </SafeAreaProvider>
  );
}
