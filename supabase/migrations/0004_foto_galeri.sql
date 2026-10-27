-- Tafsha Farm 0004: foto berkala + galeri live
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL).
-- Aman diulang (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
-- Setelah jalan: upload foto dari /kebun & /batch/* langsung tampil di landing #galeri.

-- 1) Kolom foto per level (locations.foto_url sudah ada sejak 0001)
alter table sub_blocks add column if not exists foto_url text;
alter table plant_batches add column if not exists foto_url text;

-- 2) Riwayat foto berkala: tiap upload baru = 1 baris, foto_url terbaru = tampilan utama
create table if not exists kebun_foto (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subjek_tipe text not null check (subjek_tipe in ('lokasi', 'sub_blok', 'batch')),
  subjek_id uuid not null,
  foto_url text not null,
  keterangan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_kebun_foto_subjek
  on kebun_foto (subjek_tipe, subjek_id, created_at desc);
create index if not exists idx_kebun_foto_user_waktu
  on kebun_foto (user_id, created_at desc);

alter table kebun_foto enable row level security;
drop policy if exists "milik sendiri" on kebun_foto;
create policy "milik sendiri" on kebun_foto
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Galeri landing dibuka tamu tanpa login, jadi baca publik diizinkan.
-- Tulis tetap lewat policy "milik sendiri" di atas (auth.uid() wajib cocok).
drop policy if exists "publik baca galeri" on kebun_foto;
create policy "publik baca galeri" on kebun_foto for select using (true);

-- 3) Bucket publik kebun-foto (PRD M4: foto logbook < 500KB, maks 3/entri)
insert into storage.buckets (id, name, public)
values ('kebun-foto', 'kebun-foto', true)
on conflict (id) do nothing;

drop policy if exists "Publik baca foto kebun" on storage.objects;
create policy "Publik baca foto kebun" on storage.objects
  for select using (bucket_id = 'kebun-foto');
drop policy if exists "Login upload foto kebun" on storage.objects;
create policy "Login upload foto kebun" on storage.objects
  for insert with check (bucket_id = 'kebun-foto' and auth.role() = 'authenticated');
drop policy if exists "Login ubah foto kebun" on storage.objects;
create policy "Login ubah foto kebun" on storage.objects
  for update using (bucket_id = 'kebun-foto' and auth.role() = 'authenticated');
drop policy if exists "Login hapus foto kebun" on storage.objects;
create policy "Login hapus foto kebun" on storage.objects
  for delete using (bucket_id = 'kebun-foto' and auth.role() = 'authenticated');
