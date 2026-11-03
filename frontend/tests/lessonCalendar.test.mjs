import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableLessonTimes, calendarDays, dayKey, durationLabel, monthStart, parseDay, shiftMonth, timeKey, timeMinutes, timeToDate } from '../src/utils/lessonCalendar.ts';

test('local calendar dates round-trip without a UTC date shift', () => {
  for (const key of ['2026-03-29', '2026-10-25', '2026-11-03', '2028-02-29']) {
    assert.equal(dayKey(parseDay(key)), key);
  }
  assert.equal(dayKey(new Date(2026, 10, 3, 0, 0)), '2026-11-03');
});

test('month grid starts on Monday and includes leap day in chronological order', () => {
  const grid = calendarDays(new Date(2028, 1, 10));
  assert.equal(grid.length, 42);
  assert.equal(grid[0].getDay(), 1);
  assert.ok(grid.some(day => dayKey(day) === '2028-02-29'));
  for (let i = 1; i < grid.length; i++) {
    const next = new Date(grid[i - 1]);
    next.setDate(next.getDate() + 1);
    assert.equal(dayKey(grid[i]), dayKey(next));
  }
});

test('month navigation crosses years and does not skip February on January 31', () => {
  assert.equal(dayKey(shiftMonth(new Date(2026, 11, 31), 1)), '2027-01-01');
  assert.equal(dayKey(shiftMonth(new Date(2026, 0, 31), 1)), '2026-02-01');
  assert.equal(dayKey(shiftMonth(new Date(2026, 0, 1), -1)), '2025-12-01');
  assert.equal(dayKey(monthStart(new Date(2026, 10, 19))), '2026-11-01');
});

test('half-hour time selections preserve 08:30 and 09:00 and calculate duration', () => {
  assert.equal(timeKey(timeToDate('08:30:00')), '08:30:00');
  assert.equal(timeKey(timeToDate('09:00:00')), '09:00:00');
  assert.equal(timeMinutes('08:30:00'), 510);
  assert.equal(durationLabel('08:30:00', '09:00:00'), '30m');
  assert.equal(durationLabel('08:30:00', '10:00:00'), '1h 30m');
  assert.equal(durationLabel('09:00:00', '10:00:00'), '1h');
  assert.equal(durationLabel('10:00:00', '09:00:00'), '');
  assert.equal(durationLabel('09:00:00', '09:00:00'), '');
});


test('occupied start times disappear and the exact finishing time stays available', () => {
  const lessons = [{ lesson_date: '2030-01-15', start_time: '09:00:00', end_time: '10:00:00' }];
  const slots = availableLessonTimes(lessons, '2030-01-15');
  assert.ok(slots.starts.includes('08:30:00'));
  assert.ok(!slots.starts.includes('09:00:00'));
  assert.ok(!slots.starts.includes('09:30:00'));
  assert.ok(slots.starts.includes('10:00:00'));
  assert.ok(availableLessonTimes(lessons, '2030-01-15', '08:30:00').ends.includes('09:00:00'));
});

test('end options cannot span an occupied lesson even if their end is free', () => {
  const lessons = [
    { lesson_date: '2030-01-15', start_time: '09:00:00', end_time: '10:00:00' },
    { lesson_date: '2030-01-15', start_time: '11:00:00', end_time: '12:00:00' },
  ];
  const morning = availableLessonTimes(lessons, '2030-01-15', '08:30:00').ends;
  assert.deepEqual(morning, ['09:00:00']);
  const gap = availableLessonTimes(lessons, '2030-01-15', '10:00:00').ends;
  assert.deepEqual(gap, ['10:30:00', '11:00:00']);
});

test('other days do not block slots and a fully booked day has no options', () => {
  const lessons = [{ lesson_date: '2030-01-15', start_time: '00:00:00', end_time: '23:30:00' }];
  assert.equal(availableLessonTimes(lessons, '2030-01-15').starts.length, 0);
  assert.ok(availableLessonTimes(lessons, '2030-01-16').starts.includes('09:00:00'));
  assert.deepEqual(availableLessonTimes(lessons, '2030-01-15', '').ends, []);
});
