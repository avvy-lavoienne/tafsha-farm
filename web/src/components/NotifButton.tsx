"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hariIniISO } from "@/lib/tanggal";

function statusAwal(): string {
  if (typeof window === "undefined" || !("Notification" in window))
    return "tidak-dukung";
  return Notification.permission;
}

// Kunci sekali sehari agar notifikasi pagi tidak muncul berulang tiap buka halaman.
function sudahDiingatkanHariIni(): boolean {
  try {
    return localStorage.getItem("tafsha-ingat") === hariIniISO();
  } catch {
    return true; // gagal baca: diam saja, jangan spam
  }
}

function tandaiDiingatkan(): void {
  try {
    localStorage.setItem("tafsha-ingat", hariIniISO());
  } catch {
    // abaikan: ingat lagi besok
  }
}

export default function NotifButton() {
  const [status, setStatus] = useState<string>(statusAwal);

  // Pengingat lokal: pagi hari (sblm jam 12) saat tab dibuka + ada tugas
  // hari ini → kirim 1x notifikasi browser. Tanpa server, tanpa VAPID (M5).
  useEffect(() => {
    if (status !== "granted") return;
    if (localStorage.getItem("tafsha-notif") !== "aktif") return;
    if (sudahDiingatkanHariIni()) return;
    const jam = new Date().getHours();
    if (jam >= 12) return;
    let hidup = true;
    const cek = async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from("care_tasks")
          .select("id", { count: "exact", head: true })
          .eq("due_date", hariIniISO());
        if (!hidup || (count ?? 0) === 0) return;
        tandaiDiingatkan();
        new Notification("🌱 Tafsha Farm — pengingat pagi", {
          body: `${count} hal perlu dikerjakan hari ini. Buka aplikasi ya!`,
          icon: "/icons/icon-192.png",
        });
      } catch {
        // offline/query gagal: coba lagi di kunjungan berikutnya
      }
    };
    const t = setTimeout(cek, 2000);
    return () => {
      hidup = false;
      clearTimeout(t);
    };
  }, [status]);

  async function aktifkan() {
    if (!("Notification" in window)) return;
    const hasil = await Notification.requestPermission();
    setStatus(hasil);
    if (hasil === "granted") {
      localStorage.setItem("tafsha-notif", "aktif");
    }
  }

  if (status === "tidak-dukung") return null;

  if (status === "granted") {
    return (
      <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
        🔔 Notifikasi aktif. Pengingat muncul tiap buka aplikasi pagi hari.
      </p>
    );
  }

  return (
    <div className="tf-item">
      <p className="text-sm font-semibold">Nyalakan pengingat HP?</p>
      <p className="mt-0.5 text-xs text-zinc-600">
        Browser akan meminta izin notifikasi. Tanpa centang-centang, cukup
        pemberitahuan biasa.
      </p>
      <button
        onClick={aktifkan}
        className="mt-2 tf-btn"
      >
        Aktifkan notifikasi
      </button>
    </div>
  );
}
