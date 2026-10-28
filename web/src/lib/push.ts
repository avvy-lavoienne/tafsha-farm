function urlBase64KeUint8Array(kunci: string): Uint8Array {
  const normal = kunci.replace(/-/g, "+").replace(/_/g, "/");
  const bantalan = "=".repeat((4 - (normal.length % 4)) % 4);
  const biner = atob(normal + bantalan);
  const hasil = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) hasil[i] = biner.charCodeAt(i);
  return hasil;
}

function kunciKeBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) throw new Error("kunci enkripsi kosong");
  const biner = String.fromCharCode(...new Uint8Array(buf));
  return btoa(biner).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function cekDukungan(): string | null {
  if (typeof window === "undefined") return "browser tidak mendukung";
  if (!("Notification" in window)) return "browser tidak mendukung notifikasi";
  if (!("serviceWorker" in navigator)) return "browser tidak mendukung service worker";
  if (!("PushManager" in window)) return "browser tidak mendukung push";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    return "kunci push belum dikonfigurasi";
  return null;
}

async function ambilRegistrasi(): Promise<ServiceWorkerRegistration> {
  const ada = await navigator.serviceWorker.getRegistration();
  if (ada) return ada;
  return navigator.serviceWorker.register("/sw.js");
}

export async function daftarPush(): Promise<void> {
  const kendala = cekDukungan();
  if (kendala) throw new Error(kendala);
  if (Notification.permission === "denied")
    throw new Error("izin notifikasi diblokir, buka pengaturan browser dulu");
  const izin = await Notification.requestPermission();
  if (izin !== "granted") throw new Error("izin notifikasi belum diberikan");
  const reg = await ambilRegistrasi();
  let langganan = await reg.pushManager.getSubscription();
  if (!langganan) {
    langganan = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64KeUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      ) as unknown as ArrayBuffer,
    });
  }
  const json = langganan.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
    throw new Error("data langganan tidak lengkap");
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.pesan ?? "gagal menyimpan langganan");
  }
}

export async function berhentiPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const langganan = await reg?.pushManager.getSubscription();
  const endpoint = langganan?.endpoint ?? null;
  if (langganan) await langganan.unsubscribe();
  if (!endpoint) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

export { kunciKeBase64Url };
