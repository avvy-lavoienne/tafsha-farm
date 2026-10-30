-- Tafsha Farm — audit tanggal tugas siram (READ-ONLY).
-- Jalankan di Supabase SQL Editor. File ini TIDAK mengubah data apa pun.
--
-- Latar: sebelum perbaikan M11, BatchForm membuat due_date dari
-- new Date(tgl_tanam + "T00:00:00").toISOString(). Di perangkat WIB hasilnya
-- mundur satu hari, sehingga seluruh 30/60 tugas siram sebuah batch
-- dimulai di (tgl_tanam - 1) dan berakhir di (tgl_tanam + 28).
--
-- Pakai hasil ini untuk memutuskan remediasi (geser +1 hari vs regenerasi).

-- 1) Ringkasan: berapa batch yang tugas siramnya mulai sebelum tgl tanam.
select
  count(*) filter (where mulai < tgl_tanam)                as batch_bergeser,
  count(*) filter (where mulai = tgl_tanam)                as batch_normal,
  count(*)                                                 as total_batch_bersiram
from (
  select
    b.id,
    b.tgl_tanam,
    (select min(t.due_date) from care_tasks t
      where t.batch_id = b.id and t.jenis = 'siram')        as mulai
  from plant_batches b
) x;

-- 2) Daftar batch yang perlu diperiksa (mulai = tgl_tanam - 1).
select
  b.id                                                        as batch_id,
  c.nama                                                      as komoditas,
  b.tgl_tanam,
  min(t.due_date)                                             as tugas_mulai,
  max(t.due_date)                                             as tugas_terakhir,
  count(*)                                                    as jumlah_tugas,
  count(*) filter (where t.status = 'selesai')                 as sudah_selesai,
  count(*) filter (where t.status = 'belum')                   as masih_belum
from plant_batches b
join care_tasks t on t.batch_id = b.id and t.jenis = 'siram'
left join commodities c on c.id = b.commodity_id
group by b.id, c.nama, b.tgl_tanam
having min(t.due_date) < b.tgl_tanam
order by b.tgl_tanam desc;

-- 3) Batch yang tanggal tanamnya tidak punya tugas siram sama sekali
--    (gejala paling jelas dari pergeseran).
select
  b.id as batch_id,
  c.nama as komoditas,
  b.tgl_tanam
from plant_batches b
left join commodities c on c.id = b.commodity_id
where not exists (
  select 1 from care_tasks t
  where t.batch_id = b.id and t.jenis = 'siram' and t.due_date = b.tgl_tanam
)
and exists (
  select 1 from care_tasks t where t.batch_id = b.id and t.jenis = 'siram'
)
order by b.tgl_tanam desc;

-- 4) Contoh pergeseran pada satu batch (ganti :batch_id).
--    Kalau due_date mulai H-1 dari tgl_tanam, batch ini terkena bug lama.
-- select id, jenis, due_date, status
-- from care_tasks
-- where batch_id = ':batch_id' and jenis = 'siram'
-- order by due_date
-- limit 35;
