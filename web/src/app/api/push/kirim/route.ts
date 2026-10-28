import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Pengirim push harian via Vercel Cron (23:00 UTC = 06:00 WIB).
// Guard: Authorization: Bearer CRON_SECRET (Vercel mengirim otomatis
// bila env CRON_SECRET ada) atau header x-vercel-cron.

function wibHariIniISO(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

function bearerBenar(req: Request, secret: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const harap = `Bearer ${secret}`;
  if (header.length !== harap.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(harap));
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret)
    return NextResponse.json(
      { pesan: "CRON_SECRET belum dikonfigurasi." },
      { status: 500 },
    );
  const dariVercel = req.headers.get("x-vercel-cron") === "1";
  if (!dariVercel && !bearerBenar(req, secret))
    return NextResponse.json({ pesan: "Tidak diizinkan." }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? "";
  const vapidSubject = process.env.VAPID_SUBJECT ?? "";
  if (!serviceKey || !vapidPublic || !vapidPrivate || !vapidSubject)
    return NextResponse.json(
      { pesan: "Kunci server push belum dikonfigurasi." },
      { status: 500 },
    );

  const tanggal = wibHariIniISO();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
    );
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const { data: tugas, error: errTugas } = await supabase
      .from("care_tasks")
      .select("user_id")
      .eq("due_date", tanggal);
    if (errTugas) throw errTugas;

    const hitung = new Map<string, number>();
    for (const t of tugas ?? [])
      hitung.set(t.user_id, (hitung.get(t.user_id) ?? 0) + 1);

    let terkirim = 0;
    let gagal = 0;
    for (const [userId, n] of hitung) {
      try {
        const { data: subs, error: errSubs } = await supabase
          .from("push_subscriptions")
          .select("endpoint,p256dh,auth")
          .eq("user_id", userId);
        if (errSubs) throw errSubs;
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: s as { p256dh: string; auth: string } },
              JSON.stringify({
                title: "🌱 Tafsha Farm — pengingat pagi",
                body: `${n} hal perlu dikerjakan hari ini. Buka aplikasi ya! 🏡`,
                icon: "/icons/icon-192.png",
                url: "/tugas",
              }),
            );
            terkirim++;
          } catch (e) {
            const kode = (e as { statusCode?: number })?.statusCode;
            if (kode === 404 || kode === 410) {
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", s.endpoint);
            }
            gagal++;
          }
        }
      } catch {
        gagal++;
      }
    }
    return NextResponse.json({ terkirim, gagal, tanggal });
  } catch {
    return NextResponse.json(
      { pesan: "Gagal mengirim push, coba lagi ya." },
      { status: 500 },
    );
  }
}
