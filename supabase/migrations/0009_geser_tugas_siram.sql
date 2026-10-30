-- Tafsha Farm 0009: geser tugas siram yang dibuat sebelum perbaikan M11.
-- Jalankan sekali di Supabase SQL Editor (Dashboard > SQL), setelah 0008.
--
-- Latar: BatchForm lama membuat due_date dari
--   new Date(tgl_tanam + "T00:00:00").toISOString().slice(0, 10)
-- Di perangkat WIB hasilnya mundur 1 hari, sehingga seluruh rangkaian tugas
-- siram sebuah batch dimulai di (tgl_tanam - 1) dan berakhir di (tgl_tanam + 28).
-- Perbaikan kode sudah masuk; file ini membereskan DATA yang sudah terlanjur.
--
-- Aman diulang: batch hanya digeser bila tugas siram pertamanya masih
-- (tgl_tanam - 1). Setelah digeser, syarat itu tidak terpenuhi lagi, jadi
-- menjalankan file ini dua kali tidak menggeser dua kali.
--
-- Hanya baris jenis 'siram' yang disentuh. Tugas manual (pupuk, semprot,
-- pindah tanam, dst.) dibuat lewat hariIniISO dan tidak terkena bug ini.

-- ============ 1) PRATINJAU (read-only) ============
-- Baris yang akan berubah + batch tujuannya. Cek dulu sebelum lanjut.
select
  b.id                                    as batch_id,
  c.nama                                  as komoditas,
  b.tgl_tanam,
  min(t.due_date)                         as tugas_mulai_sekarang,
  min(t.due_date) + 1                     as tugas_mulai_setelah_geser,
  max(t.due_date)                         as tugas_terakhir_sekarang,
  count(*)                                as jumlah_tugas,
  count(*) filter (where t.status = 'selesai') as sudah_selesai
from care_tasks t
join plant_batches b on b.id = t.batch_id
left join commodities c on c.id = b.commodity_id
where t.jenis = 'siram'
group by b.id, c.nama, b.tgl_tanam
having min(t.due_date) = b.tgl_tanam - 1
order by b.tgl_tanam desc;

-- ============ 2) GESER +1 HARI ============
with terdampak as (
  select t.batch_id
  from care_tasks t
  join plant_batches b on b.id = t.batch_id
  where t.jenis = 'siram'
  group by t.batch_id, b.tgl_tanam
  having min(t.due_date) = b.tgl_tanam - 1
)
update care_tasks t
set due_date = t.due_date + 1
from terdampak d
where t.batch_id = d.batch_id
  and t.jenis = 'siram';

-- ============ 3) VERIFIKASI ============
-- Harus 0 baris: tidak ada lagi tugas siram yang mulai sebelum tgl tanam,
-- dan tiap batch punya tugas pada tanggal tanamnya sendiri.
select
  count(*) as batch_masih_bergeser
from (
  select b.id
  from care_tasks t
  join plant_batches b on b.id = t.batch_id
  where t.jenis = 'siram'
  group by b.id, b.tgl_tanam
  having min(t.due_date) < b.tgl_tanam
) x;

-- ============ ROLLBACK (bila perlu) ============
-- Ganti daftar id dengan batch yang terlanjur digeser (lihat hasil PRATINJAU).
-- update care_tasks
-- set due_date = due_date - 1
-- where jenis = 'siram'
--   and batch_id in (
--     'a0e1bf56-b67f-47d2-95cb-67d9e64d45a3',
--     '4346405a-da0c-402a-adb3-6c97b97d850b'
--   );
