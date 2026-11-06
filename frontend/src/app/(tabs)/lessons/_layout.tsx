import { Stack } from 'expo-router';
import { colors } from '../../../components/Form';

export default function LessonsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
