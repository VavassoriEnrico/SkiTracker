alter table public.ski_lesson_videos
  add column customer_id uuid references public.ski_customers(id),
  add column storage_path text;
