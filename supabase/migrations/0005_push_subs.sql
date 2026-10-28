-- Tafsha Farm M5 P0-1: langganan push VAPID per user.
-- CARA PAKAI: jalankan MANUAL di Supabase Dashboard > SQL Editor
-- (sesi ini tidak punya akses DB). Urutan setelah 0004_foto_galeri.sql.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "milik sendiri" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_push_subs_user on push_subscriptions(user_id);
