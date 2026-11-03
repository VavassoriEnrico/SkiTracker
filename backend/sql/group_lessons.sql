-- Run ONCE in Supabase SQL Editor. This transaction preserves existing participants.
-- If the exclusion constraint reports overlapping lessons, resolve those times first.
begin;

create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

alter table public.ski_lessons
  alter column start_time type time without time zone using start_time::time,
  alter column end_time type time without time zone using end_time::time,
  alter column lesson_date set not null,
  alter column start_time set not null,
  alter column end_time set not null,
  alter column instructor_id set not null,
  add constraint ski_lessons_valid_times check (end_time > start_time),
  add constraint ski_lessons_instructor_no_overlap
    exclude using gist (
      instructor_id with =,
      (tsrange(lesson_date + start_time, lesson_date + end_time, '[)')) with &&
    );

create table public.ski_lesson_customers (
  lesson_id bigint not null references public.ski_lessons(id) on delete cascade,
  customer_id uuid not null references public.ski_customers(id),
  primary key (lesson_id, customer_id)
);

-- Copy the old single participant into the new participant list before dropping the column.
insert into public.ski_lesson_customers (lesson_id, customer_id)
select id, customer_id from public.ski_lessons where customer_id is not null;

alter table public.ski_lessons drop column customer_id;

create index ski_lesson_customers_customer_idx
  on public.ski_lesson_customers(customer_id);

commit;
