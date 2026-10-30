// Regresi utama M11: aritmatika tanggal tidak boleh bergeser karena zona waktu.
// Jalankan: npm test  (node --test, tanpa dependensi tambahan)
import test from "node:test";
import assert from "node:assert/strict";
import {
  hariIniISO,
  tambahHariISO,
  selisihHari,
  hitungHST,
  geserBulan,
  bulanValid,
  formatTanggal,
} from "./tanggal.ts";

test("hariIniISO memakai tanggal Asia/Jakarta, bukan UTC", () => {
  // 23:59 WIB tanggal 29
  assert.equal(hariIniISO(new Date("2026-10-29T16:59:00Z")), "2026-10-29");
  // 00:00 WIB tanggal 30 — di server UTC ini masih tanggal 29
  assert.equal(hariIniISO(new Date("2026-10-29T17:00:00Z")), "2026-10-30");
  // 06:30 WIB tanggal 31 — jam pengingat pagi
  assert.equal(hariIniISO(new Date("2026-10-30T23:30:00Z")), "2026-10-31");
});

test("tambahHariISO tidak bergeser satu hari (bug lama toISOString)", () => {
  assert.equal(tambahHariISO("2026-10-30", 0), "2026-10-30");
  assert.equal(tambahHariISO("2026-10-30", 1), "2026-10-31");
  // 30 tugas siram: hari ke-0 = tgl tanam, hari ke-29 = +29
  assert.equal(tambahHariISO("2026-10-30", 29), "2026-11-28");
});

test("tambahHariISO melewati batas bulan, tahun, dan kabisat", () => {
  assert.equal(tambahHariISO("2026-12-31", 1), "2027-01-01");
  assert.equal(tambahHariISO("2026-03-01", -1), "2026-02-28");
  assert.equal(tambahHariISO("2028-02-28", 1), "2028-02-29");
  assert.equal(tambahHariISO("2026-01-01", -1), "2025-12-31");
});

test("selisihHari & hitungHST", () => {
  assert.equal(selisihHari("2026-10-01", "2026-10-31"), 30);
  assert.equal(selisihHari("2026-10-31", "2026-10-01"), -30);
  assert.equal(hitungHST("2026-10-01", "2026-10-31"), 30);
  assert.equal(hitungHST("2026-12-01", "2026-10-31"), 0); // tanggal masa depan
});

test("geserBulan aman di batas tahun (dipakai rekap panen & kalender)", () => {
  assert.equal(geserBulan("2026-10", 1), "2026-11");
  assert.equal(geserBulan("2026-12", 1), "2027-01");
  assert.equal(geserBulan("2026-01", -1), "2025-12");
  assert.equal(geserBulan("2026-10", 12), "2027-10");
});

test("bulanValid menolak input aneh", () => {
  assert.equal(bulanValid("2026-10", "2026-12-30"), "2026-10");
  assert.equal(bulanValid("2026-13", "2026-12-30"), "2026-12");
  assert.equal(bulanValid(undefined, "2026-12-30"), "2026-12");
  assert.equal(bulanValid("abc", "2026-12-30"), "2026-12");
});

test("formatTanggal tidak bergeser karena zona waktu", () => {
  assert.equal(formatTanggal("2026-10-30"), "30 Okt 2026");
  assert.equal(formatTanggal(null), "-");
});
