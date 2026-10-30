import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser validasi token ke server Supabase. Kalau jaringan gagal /
  // Supabase sempat down, jangan langsung tendang ke /masuk — fallback
  // ke sesi dari cookie supaya pindah menu tidak mental ke login.
  let user = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    user = null;
  }
  if (!user) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      user = session?.user ?? null;
    } catch {
      // abaikan, tetap dianggap tamu di bawah
    }
  }

  const path = request.nextUrl.pathname;

  // API jangan pernah di-redirect ke /masuk: biarkan route yang jawab
  // JSON (mis. { kosong: true }). Kalau di-redirect, fetch landing
  // dapat HTML login lalu gagal parse → dikira data kosong.
  if (path.startsWith("/api/")) {
    return supabaseResponse;
  }

  const publik =
    path.startsWith("/masuk") ||
    path.startsWith("/landing") ||
    path === "/" ||
    path === "/landing.html";

  if (!user && !publik) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    return NextResponse.redirect(url);
  }

  // Sudah login tapi buka /masuk lagi → lempar ke dashboard,
  // biar tidak dikira sesi hilang / stuck di form login.
  if (user && path.startsWith("/masuk")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
