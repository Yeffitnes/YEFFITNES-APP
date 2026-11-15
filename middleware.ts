import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PROTECTED = ["/coach", "/inicio", "/pendiente"];
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // Rapidez (29-oct): aquí solo hace falta saber SI hay sesión (para mandar a /login) y renovarla si venció. getSession lee la cookie
  // sin preguntar al servidor de Supabase (y la renueva sola si expiró); getClaims, con claves de firma antiguas, hacía un viaje
  // extra en CADA pantalla. La sesión se verifica de verdad después: en la base (RLS y portal_boot) y en las páginas (getClaims).
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.access_token ? "yes" : null;
  if (!user && PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}
export const config = { matcher: ["/((?!api/ping|_next/static|_next/image|favicon.ico|sw\\.js|landing|.*\\.(?:png|svg|jpg|webp|ico|json)$).*)"] };
