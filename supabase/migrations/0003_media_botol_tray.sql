-- Tafsha Farm: tambah media Botol 1,5L + Tray Semai
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL), lalu refresh aplikasi.
-- Aman diulang: baris baru hanya ditambah bila namanya belum ada.

-- 1) Perbarui seed agar akun baru langsung dapat 6 tipe media
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

  -- Siapkan baris stok untuk tiap media baru
  for media_baru in
    select id from media_types where user_id = uid
  loop
    insert into media_stocks (media_type_id, total, terpakai, rusak)
    values (media_baru.id, 0, 0, 0)
    on conflict (media_type_id) do nothing;
  end loop;

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

-- 2) Tambahkan 2 media baru untuk akun yang SUDAH pernah seed
insert into media_types (user_id, nama, ukuran, volume_liter)
select distinct l.user_id, v.nama, v.ukuran, v.volume_liter
from locations l
cross join (
  values
    ('Botol 1,5L', 'Botol plastik 1,5 liter', 1.5::numeric),
    ('Tray Semai', 'Nampan semai', null::numeric)
) as v(nama, ukuran, volume_liter)
where not exists (
  select 1 from media_types m where m.user_id = l.user_id and m.nama = v.nama
);

-- 3) Siapkan baris stok untuk media baru tersebut
insert into media_stocks (media_type_id, total, terpakai, rusak)
select m.id, 0, 0, 0 from media_types m
where m.nama in ('Botol 1,5L', 'Tray Semai')
  and not exists (select 1 from media_stocks s where s.media_type_id = m.id)
on conflict (media_type_id) do nothing;
