-- Tafsha Farm 0007: orientasi baru — manajemen kebun + jualan bibit per pcs polybag.
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL). Aman diulang.
--
-- Isi:
--  1) Kolom jualan di commodities (jual_bibit, harga_pcs, umur siap jual)
--  2) Kolom jualan di plant_batches (tujuan kebun/jual, stok_siap pcs, harga_pcs)
--  3) Tabel batch_moves = tracker history komprehensif per batch
--  4) Tabel bibit_sales = penjualan bibit per pcs
--  5) Seed/update 8 fokus jualan: Cabai, Tomat, Daun Bawang, Seledri,
--     Bawang Merah, Terong, Strawberry, Mint
--  6) RLS milik-sendiri untuk 2 tabel baru

-- ============ 1) commodities: kolom bibit ============
alter table commodities add column if not exists jual_bibit boolean not null default false;
alter table commodities add column if not exists harga_pcs numeric;
alter table commodities add column if not exists umur_siap_min integer;
alter table commodities add column if not exists umur_siap_maks integer;

-- ============ 2) plant_batches: kolom bibit ============
alter table plant_batches add column if not exists tujuan text not null default 'kebun';
alter table plant_batches add column if not exists stok_siap integer not null default 0;
alter table plant_batches add column if not exists harga_pcs numeric;

do $$
begin
  alter table plant_batches add constraint cek_tujuan_batch check (tujuan in ('kebun', 'jual'));
exception when duplicate_object then
  null;
end $$;

-- ============ 3) batch_moves: tracker history ============
-- jenis: semai | tumbuh | siap_jual | terjual | mati | pindah | catat
-- Setiap baris mencatat: kondisi sebelum -> sesudah + sisa hidup + stok siap.
create table if not exists batch_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references plant_batches(id) on delete cascade,
  jenis text not null default 'catat',
  dari_status text,
  ke_status text,
  jumlah integer not null default 0,
  sisa integer,
  stok_siap integer,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_batch_moves_batch on batch_moves (batch_id, created_at desc);
create index if not exists idx_batch_moves_user on batch_moves (user_id, created_at desc);

alter table batch_moves enable row level security;
drop policy if exists "milik sendiri" on batch_moves;
create policy "milik sendiri" on batch_moves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 4) bibit_sales: penjualan per pcs ============
create table if not exists bibit_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references plant_batches(id) on delete cascade,
  tanggal date not null default current_date,
  jumlah_pcs integer not null default 1,
  harga_pcs numeric,
  pembeli text,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bibit_sales_batch on bibit_sales (batch_id, tanggal desc);
create index if not exists idx_bibit_sales_user on bibit_sales (user_id, tanggal desc);

alter table bibit_sales enable row level security;
drop policy if exists "milik sendiri" on bibit_sales;
create policy "milik sendiri" on bibit_sales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ 5) Tandai 8 fokus jualan pada data yang sudah ada ============
-- Umur siap jual bibit (HST) + aktif true. Harga dibiarkan apa adanya
-- (diisi lewat halaman Komoditas per akun).
update commodities set
  jual_bibit = true,
  aktif = true,
  umur_siap_min = coalesce(umur_siap_min, v.min_hst),
  umur_siap_maks = coalesce(umur_siap_maks, v.maks_hst)
from (values
  ('Cabai', 30, 45),
  ('Tomat', 25, 35),
  ('Daun Bawang', 30, 40),
  ('Seledri', 35, 50),
  ('Bawang Merah', 25, 35),
  ('Terong', 30, 45),
  ('Strawberry', 30, 45),
  ('Mint', 20, 30)
) as v(nama, min_hst, maks_hst)
where lower(commodities.nama) = lower(v.nama);

-- Tambahkan komoditas fokus yang belum ada, untuk setiap akun yang sudah seed.
-- (Akun baru dapat versi lengkap lewat seed_tafsha_farm di bawah.)
insert into commodities (user_id, nama, tipe_panen, umur_panen_min, umur_panen_maks, siram_default, catatan, aktif, jual_bibit, umur_siap_min, umur_siap_maks)
select distinct l.user_id, v.nama, v.tipe, v.min_panen, v.maks_panen, v.siram, null, true, true, v.siap_min, v.siap_maks
from locations l
cross join (values
  ('Daun Bawang', 'petik_berulang', 60, 90, '1x sehari', 30, 40),
  ('Seledri', 'petik_berulang', 60, 90, '1x sehari, teduh parsial', 35, 50),
  ('Bawang Merah', 'sekali', 60, 75, '1x pagi, jangan becek', 25, 35),
  ('Strawberry', 'petik_berulang', 90, 120, '1x pagi', 30, 45),
  ('Mint', 'potong', 30, 60, '1x sehari, suka lembap', 20, 30)
) as v(nama, tipe, min_panen, maks_panen, siram, siap_min, siap_maks)
where not exists (
  select 1 from commodities c where c.user_id = l.user_id and lower(c.nama) = lower(v.nama)
);

-- Pastikan 8 fokus selalu aktif + jual_bibit (termasuk yang baru disisipkan).
update commodities set jual_bibit = true, aktif = true
where lower(nama) in ('cabai','tomat','daun bawang','seledri','bawang merah','terong','strawberry','mint');

-- ============ 6) Perbarui seed untuk akun baru ============
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
  media_baru record;
begin
  if uid is null then
    raise exception 'Harus login dulu sebelum seeding.';
  end if;

  if exists (select 1 from locations where user_id = uid) then
    return; -- sudah pernah seed, jangan duplikat
  end if;

  insert into locations (user_id, kode, nama, deskripsi)
  values (uid, 'HAL-01', 'Halaman Depan', 'Kebun halaman depan rumah')
  returning id into loc_halaman;

  insert into locations (user_id, kode, nama, deskripsi)
  values (uid, 'MUS-01', 'Lahan Depan Mushola', 'Lahan di depan mushola')
  returning id into loc_mushola;

  insert into sub_blocks (user_id, location_id, nama)
  values
    (uid, loc_halaman, 'Rak Galon'),
    (uid, loc_halaman, 'Deret Polybag'),
    (uid, loc_mushola, 'Blok A'),
    (uid, loc_mushola, 'Blok B');

  insert into media_types (user_id, nama, ukuran, volume_liter)
  values
    (uid, 'Galon 15L', 'Le Minerale 15 liter', 15),
    (uid, 'Botol 1,5L', 'Botol plastik 1,5 liter', 1.5),
    (uid, 'Tray Semai', 'Nampan semai', null),
    (uid, 'Polybag 10x15', '10 x 15 cm', 1),
    (uid, 'Polybag 35x35', '35 x 35 cm', 25),
    (uid, 'Polybag 40x40', '40 x 40 cm', 35);

  for media_baru in
    select id from media_types where user_id = uid
  loop
    insert into media_stocks (media_type_id, total, terpakai, rusak)
    values (media_baru.id, 0, 0, 0)
    on conflict (media_type_id) do nothing;
  end loop;

  -- 13 komoditas: 8 fokus jualan bibit (per pcs polybag) + 5 pelengkap kebun.
  insert into commodities (user_id, nama, tipe_panen, umur_panen_min, umur_panen_maks, siram_default, catatan, aktif, jual_bibit, umur_siap_min, umur_siap_maks)
  values
    (uid, 'Cabai', 'petik_berulang', 75, 90, '1x pagi', 'Bibit dijual per pcs polybag', true, true, 30, 45),
    (uid, 'Tomat', 'petik_berulang', 60, 75, '1x pagi', 'Bibit dijual per pcs polybag', true, true, 25, 35),
    (uid, 'Daun Bawang', 'petik_berulang', 60, 90, '1x sehari', 'Bibit dijual per pcs polybag', true, true, 30, 40),
    (uid, 'Seledri', 'petik_berulang', 60, 90, '1x sehari, teduh parsial', 'Bibit dijual per pcs polybag', true, true, 35, 50),
    (uid, 'Bawang Merah', 'sekali', 60, 75, '1x pagi, jangan becek', 'Bibit dijual per pcs polybag', true, true, 25, 35),
    (uid, 'Terong', 'petik_berulang', 60, 70, '1x sehari', 'Bibit dijual per pcs polybag', true, true, 30, 45),
    (uid, 'Strawberry', 'petik_berulang', 90, 120, '1x pagi', 'Bibit dijual per pcs polybag', true, true, 30, 45),
    (uid, 'Mint', 'potong', 30, 60, '1x sehari, suka lembap', 'Bibit dijual per pcs polybag', true, true, 20, 30),
    (uid, 'Timun', 'petik_berulang', 40, 50, '1-2x sehari', null, true, false, null, null),
    (uid, 'Talas', 'sekali', 180, 240, '1x sehari, suka lembap', null, true, false, null, null),
    (uid, 'Kangkung', 'potong', 20, 30, '2x sehari', null, true, false, null, null),
    (uid, 'Bayam', 'potong', 20, 30, '2x sehari', null, true, false, null, null),
    (uid, 'Selada', 'potong', 30, 40, '2x, teduh parsial', 'Rencana tanam', false, false, null, null);
end;
$$;
