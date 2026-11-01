import { Stack } from 'expo-router';
import { colors } from '../../../components/Form';

export default function LevelsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
