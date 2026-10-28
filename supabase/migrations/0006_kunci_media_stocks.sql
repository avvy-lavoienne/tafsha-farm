-- Tafsha Farm 0006: kunci RLS media_stocks (milik sendiri via media_types)
-- Menutup lubang 0001 (policy "baca/tulis/ubah/hapus semua" terbuka untuk semua user).
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL). Aman diulang
-- (DROP POLICY IF EXISTS sebelum CREATE).
--
-- Cara uji manual (butuh 2 akun):
--   1. Login akun A → catat satu media_type id milik A.
--   2. Login akun B → jalankan:
--        select * from media_stocks where media_type_id = '<id-milik-A>';
--      harus 0 baris (tidak terlihat).
--   3. Masih sebagai B:
--        insert into media_stocks (media_type_id, total) values ('<id-milik-A>', 1);
--      harus ditolak RLS. Begitu juga update/delete baris milik A.
--   4. Sebagai A, baca/tulis baris sendiri tetap jalan (dipakai halaman /sarana).

drop policy if exists "baca semua" on media_stocks;
drop policy if exists "tulis semua" on media_stocks;
drop policy if exists "ubah semua" on media_stocks;
drop policy if exists "hapus semua" on media_stocks;
drop policy if exists "milik sendiri" on media_stocks;

create policy "milik sendiri" on media_stocks
  for all
  using (auth.uid() = (select user_id from media_types where id = media_type_id))
  with check (auth.uid() = (select user_id from media_types where id = media_type_id));
