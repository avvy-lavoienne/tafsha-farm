// Status jual berbasis HST: tanaman mendekati berbunga/berbuah, bukan bibit semai.
import test from "node:test";
import assert from "node:assert/strict";
import { statusJual, targetJual, badgeJual } from "./jual.ts";

test("targetJual memakai usia jual komoditas bila ada", () => {
  assert.equal(targetJual(60, 75), 60);
});

test("targetJual jatuh ke 15 HST sebelum panen", () => {
  assert.equal(targetJual(null, 75), 60);
  assert.equal(targetJual(undefined, 40), 25);
  assert.equal(targetJual(null, 10), 0);
  assert.equal(targetJual(null, null), null);
});

test("fase tumbuh jauh sebelum usia jual", () => {
  const s = statusJual({ hst: 40, umurJualMin: 60, umurPanenMin: 75 });
  assert.equal(s.fase, "tumbuh");
  assert.equal(s.sisaHari, 20);
});

test("fase hampir dalam 7 hari terakhir", () => {
  const s = statusJual({ hst: 53, umurJualMin: 60 });
  assert.equal(s.fase, "hampir");
  assert.equal(s.sisaHari, 7);
  assert.equal(badgeJual(s), "±7 hari lagi");
});

test("fase siap saat mencapai usia jual, lewat setelah usia maks", () => {
  const siap = statusJual({ hst: 60, umurJualMin: 60, umurJualMaks: 75 });
  assert.equal(siap.fase, "siap");
  assert.equal(badgeJual(siap), "Siap jual");

  const lewat = statusJual({ hst: 90, umurJualMin: 60, umurJualMaks: 75 });
  assert.equal(lewat.fase, "lewat");
  assert.equal(badgeJual(lewat), "Lewat usia ideal");
});

test("usia maks tidak boleh lebih kecil dari min", () => {
  const s = statusJual({ hst: 60, umurJualMin: 60, umurJualMaks: 40 });
  assert.equal(s.targetMaks, 60);
  assert.equal(s.fase, "siap");
});

test("komoditas tanpa umur panen maupun usia jual", () => {
  const s = statusJual({ hst: 30 });
  assert.equal(s.fase, "belum-diatur");
  assert.equal(s.targetMin, null);
  assert.equal(badgeJual(s), null);
});
