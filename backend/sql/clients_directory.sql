-- Run once in the Supabase SQL Editor before opening Clients.
alter table public.ski_customers
  add column if not exists email text,
  add column if not exists profile_image_url text;

-- Fill emails for customer accounts created before this change.
update public.ski_customers as customer
set email = auth_user.email
from auth.users as auth_user
where customer.id = auth_user.id and customer.email is null;

-- Then create a public Storage bucket called customers-images in the dashboard.
