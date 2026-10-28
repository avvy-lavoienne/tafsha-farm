import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BodyLangganan = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function bacaBody(body: BodyLangganan): {
  endpoint: string;
  p256dh: string;
  auth: string;
} | null {
  if (typeof body.endpoint !== "string" || body.endpoint.length === 0)
    return null;
  const keys = body.keys;
  if (!keys || typeof keys.p256dh !== "string" || keys.p256dh.length === 0)
    return null;
  if (typeof keys.auth !== "string" || keys.auth.length === 0) return null;
  return { endpoint: body.endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { pesan: "Harus masuk dulu untuk mengaktifkan push." },
        { status: 401 },
      );
    const parsed = bacaBody((await req.json()) as BodyLangganan);
    if (!parsed)
      return NextResponse.json(
        { pesan: "Data langganan tidak lengkap." },
        { status: 400 },
      );
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { pesan: "Gagal menyimpan langganan push, coba lagi ya." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { pesan: "Harus masuk dulu." },
        { status: 401 },
      );
    const { endpoint } = (await req.json()) as { endpoint?: unknown };
    if (typeof endpoint !== "string" || endpoint.length === 0)
      return NextResponse.json(
        { pesan: "Endpoint tidak dikenal." },
        { status: 400 },
      );
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { pesan: "Gagal mematikan push, coba lagi ya." },
      { status: 500 },
    );
  }
}
