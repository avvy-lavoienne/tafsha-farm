-- Tafsha Farm 0008: keamanan foto publik + sisa hidup bibit + index query
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL), setelah 0007.
-- Aman diulang (IF NOT EXISTS / DROP POLICY IF EXISTS / guarded DO block).
--
-- Isi:
--   1) plant_batches.jumlah_hidup — supaya "mati"/"terjual" di tracker
--      tidak hilang setiap halaman dimuat ulang.
--   2) Cabut baca publik selebar tabel pada kebun_foto (dulu anon bisa
--      membaca user_id + subjek_id semua akun). Galeri landing sekarang
--      dilayani /api/galeri memakai service-role dengan kolom terbatas.
--   3) Policy storage kebun-foto dibatasi ke folder milik sendiri
--      (folder pertama = auth.uid()).
--   4) Index untuk pola query yang selalu difilter user_id.
--
-- Uji manual setelah jalan:
--   a) Login akun B, jalankan: select * from kebun_foto limit 1;
--      harusnya error/0 baris (policy publik sudah dicabut).
--   b) Login akun A, buka detail batch bibit, tekan "Mati" 2 pcs,
--      muat ulang halaman → sisa hidup harus tetap berkurang.
--   c) Unggah foto dari aplikasi → tetap berhasil (folder = uid sendiri).

-- ============ 1) Sisa hidup bibit ============
alter table plant_batches add column if not exists jumlah_hidup integer;

do $$
begin
  if to_regclass('public.batch_moves') is not null then
    update plant_batches b
    set jumlah_hidup = coalesce(
      (
        select m.sisa
        from batch_moves m
        where m.batch_id = b.id and m.sisa is not null
        order by m.created_at desc, m.id desc
        limit 1
      ),
      b.jumlah
    )
    where b.jumlah_hidup is null;
  else
    update plant_batches set jumlah_hidup = jumlah where jumlah_hidup is null;
  end if;
end $$;

-- ============ 2) kebun_foto: cabut baca publik ============
-- Sampai 0007, policy ini membuat role anon (kunci publik) bisa membaca
-- seluruh baris semua akun, termasuk user_id dan subjek_id.
drop policy if exists "publik baca galeri" on kebun_foto;

-- Galeri landing tetap jalan lewat /api/galeri (service-role, 4 kolom aman).
-- Policy "milik sendiri" dari 0004 tetap berlaku untuk pemilik data.

-- ============ 3) Storage: hanya folder milik sendiri ============
-- Path yang dipakai aplikasi: {user_id}/{subjek}/{subjek_id}/{file}.jpg
drop policy if exists "Login upload foto kebun" on storage.objects;
drop policy if exists "Login ubah foto kebun" on storage.objects;
drop policy if exists "Login hapus foto kebun" on storage.objects;
drop policy if exists "Upload foto folder sendiri" on storage.objects;
drop policy if exists "Ubah foto folder sendiri" on storage.objects;
drop policy if exists "Hapus foto folder sendiri" on storage.objects;

create policy "Upload foto folder sendiri" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kebun-foto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Ubah foto folder sendiri" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'kebun-foto'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'kebun-foto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Hapus foto folder sendiri" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kebun-foto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Baca publik foto TETAP diizinkan (landing butuh URL foto):
-- policy "Publik baca foto kebun" dari 0004 tidak diubah.

-- ============ 4) Index query harian ============
create index if not exists idx_care_tasks_user_due
  on care_tasks (user_id, due_date);
create index if not exists idx_care_tasks_batch_due
  on care_tasks (batch_id, due_date);
create index if not exists idx_harvests_user_tanggal
  on harvests (user_id, tanggal desc);
create index if not exists idx_activity_logs_batch
  on activity_logs (batch_id, created_at desc);
create index if not exists idx_plant_batches_user_status
  on plant_batches (user_id, status);
