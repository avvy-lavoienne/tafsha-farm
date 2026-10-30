-- Tafsha Farm 0010: usia jual berbasis HST (tanaman mendekati berbunga/berbuah)
-- Jalankan sekali di Supabase SQL Editor, setelah 0009. Aman diulang.
--
-- Latar produk: yang dijual ke urban farmer bukan bibit semai berumur 1 bulan,
-- melainkan tanaman yang sudah mendekati masa berbunga/berbuah sehingga pembeli
-- tinggal merawat sebentar lalu panen.
--
-- Perubahan:
--   1) commodities.umur_jual_min / umur_jual_maks — HST (hari sejak tanam),
--      bukan hari sejak semai. Ini pengganti tafsir "umur_siap_*".
--   2) Backfill nilai awal: 15 HST sebelum umur panen (bisa diubah di /komoditas).
--   3) seed_tafsha_farm() diperbarui agar akun baru langsung punya angka masuk akal.
--
-- Catatan: kolom umur_siap_min/umur_siap_maks dibiarkan ada (tidak dipakai lagi
-- oleh aplikasi) supaya data lama tidak hilang. Tidak perlu diisi.

-- ============ 1) Kolom baru ============
alter table commodities add column if not exists umur_jual_min integer;
alter table commodities add column if not exists umur_jual_maks integer;

-- ============ 2) Backfill per komoditas fokus jual ============
-- Nilai = usia tanaman saat sudah layak dijual (HST), sebelum masa panen.
update commodities
set
  umur_jual_min = coalesce(commodities.umur_jual_min, v.min_hst),
  umur_jual_maks = coalesce(commodities.umur_jual_maks, v.maks_hst)
from (values
  ('Cabai', 60, 75),
  ('Tomat', 45, 60),
  ('Daun Bawang', 45, 70),
  ('Seledri', 45, 70),
  ('Bawang Merah', 45, 60),
  ('Terong', 45, 58),
  ('Strawberry', 75, 100),
  ('Mint', 20, 45)
) as v(nama, min_hst, maks_hst)
where lower(commodities.nama) = lower(v.nama);

-- Komoditas jual lain yang belum punya angka: pakai 15 HST sebelum panen.
update commodities
set
  umur_jual_min = coalesce(umur_jual_min, greatest(0, umur_panen_min - 15)),
  umur_jual_maks = coalesce(
    umur_jual_maks,
    coalesce(umur_panen_maks, umur_panen_min, greatest(0, umur_panen_min - 15))
  )
where jual_bibit = true
  and umur_panen_min is not null
  and (umur_jual_min is null or umur_jual_maks is null);

-- Jaga konsistensi: maks tidak boleh lebih kecil dari min.
update commodities
set umur_jual_maks = greatest(umur_jual_min, umur_jual_maks)
where umur_jual_min is not null
  and umur_jual_maks is not null
  and umur_jual_maks < umur_jual_min;

-- ============ 3) Seed akun baru ============
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

  -- 13 komoditas: 8 fokus jual tanaman (usia jual HST mendekati panen) + 5 pelengkap.
  insert into commodities (
    user_id, nama, tipe_panen, umur_panen_min, umur_panen_maks,
    siram_default, catatan, aktif, jual_bibit, umur_jual_min, umur_jual_maks
  )
  values
    (uid, 'Cabai', 'petik_berulang', 75, 90, '1x pagi', 'Dijual saat mendekati berbunga/berbuah', true, true, 60, 75),
    (uid, 'Tomat', 'petik_berulang', 60, 75, '1x pagi', 'Dijual saat mendekati berbunga/berbuah', true, true, 45, 60),
    (uid, 'Daun Bawang', 'petik_berulang', 60, 90, '1x sehari', null, true, true, 45, 70),
    (uid, 'Seledri', 'petik_berulang', 60, 90, '1x sehari, teduh parsial', null, true, true, 45, 70),
    (uid, 'Bawang Merah', 'sekali', 60, 75, '1x pagi, jangan becek', null, true, true, 45, 60),
    (uid, 'Terong', 'petik_berulang', 60, 70, '1x sehari', 'Dijual saat mendekati berbunga/berbuah', true, true, 45, 58),
    (uid, 'Strawberry', 'petik_berulang', 90, 120, '1x pagi', null, true, true, 75, 100),
    (uid, 'Mint', 'potong', 30, 60, '1x sehari, suka lembap', null, true, true, 20, 45),
    (uid, 'Timun', 'petik_berulang', 40, 50, '1-2x sehari', null, true, false, null, null),
    (uid, 'Talas', 'sekali', 180, 240, '1x sehari, suka lembap', null, true, false, null, null),
    (uid, 'Kangkung', 'potong', 20, 30, '2x sehari', null, true, false, null, null),
    (uid, 'Bayam', 'potong', 20, 30, '2x sehari', null, true, false, null, null),
    (uid, 'Selada', 'potong', 30, 40, '2x, teduh parsial', 'Rencana tanam', false, false, null, null);
end;
$$;

-- ============ Verifikasi ============
-- Semua komoditas jual harus punya usia jual, maks >= min, dan usia jual
-- berada sebelum masa panen (jual_sebelum_panen = true).
select
  nama,
  umur_panen_min as panen_min,
  umur_jual_min  as jual_min,
  umur_jual_maks as jual_maks,
  (umur_jual_maks >= umur_jual_min) as maks_valid
from commodities
where jual_bibit = true
order by nama;
