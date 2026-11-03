-- Read-only check. Any returned pair overlaps for the same instructor.
select a.id as first_lesson_id, b.id as second_lesson_id,
       a.instructor_id, a.lesson_date,
       a.start_time as first_start, a.end_time as first_end,
       b.start_time as second_start, b.end_time as second_end
from public.ski_lessons as a
join public.ski_lessons as b
  on a.id < b.id
 and a.instructor_id = b.instructor_id
 and a.lesson_date = b.lesson_date
 and a.start_time::time < b.end_time::time
 and a.end_time::time > b.start_time::time
order by a.lesson_date, a.start_time;
