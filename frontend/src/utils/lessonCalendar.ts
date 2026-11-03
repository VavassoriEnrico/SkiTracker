// Keep calendar dates local: toISOString() can move midnight to the previous day.
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function shiftMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function calendarDays(month: Date): Date[] {
  const first = monthStart(month);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i, 12));
}

export function timeMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function timeToDate(value: string): Date {
  const date = new Date();
  const [hours, minutes] = value.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function timeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

export function durationLabel(start: string, end: string): string {
  const minutes = timeMinutes(end) - timeMinutes(start);
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ');
}


type CalendarLesson = { lesson_date: string; start_time: string; end_time: string };

const halfHours = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}:00`
);

export function availableLessonTimes(lessons: CalendarLesson[], day: string, start?: string) {
  const busy = lessons.filter(lesson => lesson.lesson_date === day);
  function isFree(from: number, to: number) {
    return to > from && busy.every(lesson =>
      from >= timeMinutes(lesson.end_time) || to <= timeMinutes(lesson.start_time)
    );
  }
  return {
    starts: halfHours.filter(time => timeMinutes(time) + 30 <= 1410 && isFree(timeMinutes(time), timeMinutes(time) + 30)),
    ends: start ? halfHours.filter(time => isFree(timeMinutes(start), timeMinutes(time))) : [],
  };
}
