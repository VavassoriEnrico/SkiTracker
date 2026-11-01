import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { colors } from '../components/Form';
import HomeScreen from './HomeScreen';
import ProfileScreen from './ProfileScreen';

export default function MainScreen() {
  const [tab, setTab] = useState<'home' | 'profile'>('home');

  function selectTab(next: 'home' | 'profile') {
    Keyboard.dismiss();
    setTab(next);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.page, tab !== 'home' && styles.hidden]}>
        <HomeScreen />
      </View>
      <View style={[styles.page, tab !== 'profile' && styles.hidden]}>
        <ProfileScreen />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bar}>
        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Home"
            accessibilityState={{ selected: tab === 'home' }}
            onPress={() => selectTab('home')}
            style={({ pressed }) => [styles.home, tab === 'home' && styles.active, pressed && styles.pressed]}
          >
            <SymbolView name={tab === 'home' ? 'house.fill' : 'house'} size={22} tintColor={tab === 'home' ? colors.accent : colors.muted} />
            <Text style={[styles.label, tab === 'home' && styles.selectedLabel]}>Home</Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Profile"
            accessibilityState={{ selected: tab === 'profile' }}
            onPress={() => selectTab('profile')}
            style={({ pressed }) => [styles.profile, tab === 'profile' && styles.active, pressed && styles.pressed]}
          >
            <SymbolView name={tab === 'profile' ? 'person.crop.circle.fill' : 'person.crop.circle'} size={24} tintColor={tab === 'profile' ? colors.accent : colors.muted} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  hidden: { display: 'none' },
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 10 },
  home: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 20, borderRadius: 16 },
  profile: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.avatar },
  pressed: { opacity: 0.65 },
  label: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  selectedLabel: { color: colors.accent },
});
