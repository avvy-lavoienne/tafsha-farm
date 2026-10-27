"use client";

import { useState } from "react";

function statusAwal(): string {
  if (typeof window === "undefined" || !("Notification" in window))
    return "tidak-dukung";
  return Notification.permission;
}

export default function NotifButton() {
  const [status, setStatus] = useState<string>(statusAwal);

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
