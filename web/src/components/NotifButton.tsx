"use client";

import { useEffect, useState } from "react";

export default function NotifButton() {
  const [status, setStatus] = useState<string>("cek");

  useEffect(() => {
    if (!("Notification" in window)) {
      setStatus("tidak-dukung");
      return;
    }
    setStatus(Notification.permission);
  }, []);

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
