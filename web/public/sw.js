// Service worker Tafsha Farm (statis, M5 P0-1).
// next-pwa v10 hanya aktif di build webpack; Next 16 build bawaan = Turbopack
// sehingga plugin diabaikan total (tidak ada sw.js/worker-*.js hasil generate).
// File ini yang diregistrasi manual dari lib/push.ts agar event push +
// notificationclick jalan walau tab tutup. Tanpa fetch handler: tidak
// mengganggu caching bawaan browser.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "🌱 Tafsha Farm — pengingat pagi";
  const body = data.body || "Ada tugas kebun hari ini. Buka aplikasi ya!";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/icons/icon-192.png",
      data: { url: data.url || "/tugas" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/tugas";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((daftar) => {
        for (const c of daftar) {
          if ("navigate" in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
