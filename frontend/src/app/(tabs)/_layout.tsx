import { Tabs } from 'expo-router';
import { Keyboard } from 'react-native';
import BottomBar from '../../components/BottomBar';
import { colors } from '../../components/Form';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      backBehavior="history"
      tabBar={({ state, emitter, navigateToTab }) => (
        <BottomBar active={state.routes[state.index].name} onSelect={name => {
          const target = state.routes.find(route => route.name === name)!;
          const event = emitter.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
          if (!event.defaultPrevented) {
            Keyboard.dismiss();
            navigateToTab(target.key);
          }
        }} />
      )}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="levels" options={{ title: 'Ski levels' }} />
      <Tabs.Screen name="lessons" options={{ title: 'Lessons' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
