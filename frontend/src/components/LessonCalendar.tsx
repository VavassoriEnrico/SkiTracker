import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from './Form';
import { calendarDays, dayKey, shiftMonth } from '../utils/lessonCalendar';

export default function LessonCalendar({ month, selectedDay, markedDays, onSelect, onMonthChange }: {
  month: Date; selectedDay: string; markedDays: Set<string>;
  onSelect: (day: Date) => void; onMonthChange: (month: Date) => void;
}) {
  const today = dayKey(new Date());
  return <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.month}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
      <View style={styles.arrows}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onMonthChange(shiftMonth(month, -1))} style={styles.arrow}>
          <SymbolView name="chevron.left" size={16} tintColor={colors.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onMonthChange(shiftMonth(month, 1))} style={styles.arrow}>
          <SymbolView name="chevron.right" size={16} tintColor={colors.ink} />
        </Pressable>
      </View>
    </View>
    <View style={styles.grid}>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
      {calendarDays(month).map(date => {
        const key = dayKey(date);
        const selected = key === selectedDay;
        const inMonth = date.getMonth() === month.getMonth();
        return <Pressable key={key} accessibilityRole="button"
          accessibilityLabel={`${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${markedDays.has(key) ? ', lessons planned' : ''}`}
          accessibilityState={{ selected }} onPress={() => onSelect(date)} style={styles.day}>
          <View style={[styles.dayCircle, key === today && styles.today, selected && styles.selected]}>
            <Text style={[styles.number, !inMonth && styles.outside, selected && styles.selectedText]}>{date.getDate()}</Text>
            <View style={[styles.dot, markedDays.has(key) && { backgroundColor: selected ? colors.onAccent : colors.accent }]} />
          </View>
        </Pressable>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 6, marginBottom: 12 },
  month: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  arrows: { flexDirection: 'row' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285714%', textAlign: 'center', color: colors.muted, fontSize: 10, fontWeight: '600', paddingBottom: 12 },
  day: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 3 },
  today: { borderColor: colors.accent },
  selected: { backgroundColor: colors.accent },
  number: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  outside: { color: colors.placeholder, opacity: 0.4 },
  selectedText: { color: colors.onAccent, opacity: 1, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
