import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { visitorClaims, visitorExpired } from "@/lib/access";
import { safeNextPath, visitorControlAllowed } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isControl = path === "/control" || path.startsWith("/control/");
  const isLogin = path === "/login";
  const claims = visitorClaims(user);

  const clearVisitor = (url: URL) => {
    const res = NextResponse.redirect(url);
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) res.cookies.delete(cookie.name);
    });
    return res;
  };

  if (user && claims && visitorExpired(claims.expiresAt)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("expired", "1");
    url.searchParams.delete("next");
    return clearVisitor(url);
  }

  if (!user && isControl) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const withSession = (res: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value);
    });
    return res;
  };

  if (user && claims && isControl && !visitorControlAllowed(claims, path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/control/${claims.projectSlug}`;
    url.search = "";
    return withSession(NextResponse.redirect(url));
  }

  if (user && isLogin) {
    const next = claims
      ? `/control/${claims.projectSlug}`
      : safeNextPath(request.nextUrl.searchParams.get("next"));
    return withSession(NextResponse.redirect(new URL(next, request.url)));
  }

  return supabaseResponse;
}
