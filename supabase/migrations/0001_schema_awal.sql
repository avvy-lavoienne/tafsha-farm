-- Tafsha Farm M1: skema awal + data master
-- Jalankan di Supabase SQL Editor (urutan file ini).

-- ============ TABEL ============
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kode text not null,
  nama text not null,
  deskripsi text,
  foto_url text,
  lat double precision,
  lng double precision,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, kode)
);

create table if not exists sub_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  nama text not null,
  created_at timestamptz not null default now()
);

create table if not exists media_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  ukuran text,
  volume_liter numeric,
  created_at timestamptz not null default now()
);

create table if not exists media_stocks (
  media_type_id uuid primary key references media_types(id) on delete cascade,
  total integer not null default 0,
  terpakai integer not null default 0,
  rusak integer not null default 0
);

create table if not exists commodities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  tipe_panen text not null default 'petik_berulang',
  umur_panen_min integer,
  umur_panen_maks integer,
  siram_default text,
  catatan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists plant_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commodity_id uuid not null references commodities(id),
  location_id uuid not null references locations(id),
  sub_block_id uuid references sub_blocks(id),
  media_type_id uuid not null references media_types(id),
  jumlah integer not null default 1,
  tgl_semai date,
  tgl_tanam date not null,
  status text not null default 'semai',
  penyebab_gagal text,
  catatan text,
  created_at timestamptz not null default now()
);

create table if not exists care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references plant_batches(id) on delete cascade,
  jenis text not null,
  due_date date not null,
  status text not null default 'belum',
  selesai_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references plant_batches(id) on delete cascade,
  jenis text not null,
  deskripsi text,
  dosis text,
  foto_urls text[] not null default '{}',
  oleh text,
  created_at timestamptz not null default now()
);

create table if not exists harvests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references plant_batches(id) on delete cascade,
  tanggal date not null,
  jumlah numeric not null,
  satuan text not null,
  kualitas text,
  peruntukan text,
  created_at timestamptz not null default now()
);

create table if not exists supplies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  kategori text,
  stok numeric not null default 0,
  satuan text,
  min_stok numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists supply_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supply_id uuid not null references supplies(id) on delete cascade,
  arah text not null,
  jumlah numeric not null,
  tanggal date not null default current_date,
  batch_id uuid references plant_batches(id),
  created_at timestamptz not null default now()
);

-- ============ RLS ============
alter table locations enable row level security;
alter table sub_blocks enable row level security;
alter table media_types enable row level security;
alter table media_stocks enable row level security;
alter table commodities enable row level security;
alter table plant_batches enable row level security;
alter table care_tasks enable row level security;
alter table activity_logs enable row level security;
alter table harvests enable row level security;
alter table supplies enable row level security;
alter table supply_moves enable row level security;

-- Kebijakan: tiap user hanya bisa akses baris miliknya.
-- (Media stocks ikut lewat media_types, jadi policy via join tidak didukung RLS sederhana —
--  aplikasi selalu tulis media_stocks bersamaan dengan media_types milik user.)
create policy "milik sendiri" on locations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on sub_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on media_types for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "baca semua" on media_stocks for select using (true);
create policy "tulis semua" on media_stocks for insert with check (true);
create policy "ubah semua" on media_stocks for update using (true);
create policy "hapus semua" on media_stocks for delete using (true);
create policy "milik sendiri" on commodities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on plant_batches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on care_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on activity_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on harvests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on supplies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "milik sendiri" on supply_moves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ SEED via fungsi (dipanggil per-user setelah daftar) ============
-- Cara pakai: select seed_tafsha_farm();
-- Mengisi 2 lokasi + 4 media + 9 komoditas untuk user yang sedang login.
create or replace function seed_tafsha_farm()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  loc_halaman uuid;
  loc_mushola uuid;
begin
  if uid is null then
    raise exception 'Harus login dulu sebelum seeding.';
  end if;

  if exists (select 1 from locations where user_id = uid) then
    return; -- sudah pernah seed, jangan duplikat
  end if;

  insert into locations (user_id, kode, nama, deskripsi)
  values
    (uid, 'HAL-01', 'Halaman Depan', 'Kebun halaman depan rumah'),
    (uid, 'MUS-01', 'Lahan Depan Mushola', 'Lahan di depan mushola')
  returning id into loc_halaman;

  select id into loc_mushola from locations where user_id = uid and kode = 'MUS-01';

  insert into sub_blocks (user_id, location_id, nama)
  values
    (uid, loc_halaman, 'Rak Galon'),
    (uid, loc_halaman, 'Deret Polybag'),
    (uid, loc_mushola, 'Blok A'),
    (uid, loc_mushola, 'Blok B');

  insert into media_types (user_id, nama, ukuran, volume_liter)
  values
    (uid, 'Galon 15L', 'Le Minerale 15 liter', 15),
    (uid, 'Polybag 10x15', '10 x 15 cm', 1),
    (uid, 'Polybag 35x35', '35 x 35 cm', 25),
    (uid, 'Polybag 40x40', '40 x 40 cm', 35);

  insert into commodities (user_id, nama, tipe_panen, umur_panen_min, umur_panen_maks, siram_default, catatan, aktif)
  values
    (uid, 'Cabai', 'petik_berulang', 75, 90, '1x pagi', null, true),
    (uid, 'Timun', 'petik_berulang', 40, 50, '1-2x sehari', null, true),
    (uid, 'Terong', 'petik_berulang', 60, 70, '1x sehari', null, true),
    (uid, 'Talas', 'sekali', 180, 240, '1x sehari, suka lembap', null, true),
    (uid, 'Tomat', 'petik_berulang', 60, 75, '1x pagi', null, true),
    (uid, 'Kangkung', 'potong', 20, 30, '2x sehari', null, true),
    (uid, 'Bayam', 'potong', 20, 30, '2x sehari', null, true),
    (uid, 'Lavender', 'hias', 90, 120, '1x, tidak suka becek', 'Rencana tanam', false),
    (uid, 'Selada', 'potong', 30, 40, '2x, teduh parsial', 'Rencana tanam', false);
end;
$$;
