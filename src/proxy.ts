import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const COOKIE_NAME = "geoflota_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
const INACTIVITY_MINUTES = Number(process.env.SESSION_INACTIVITY_MINUTES ?? 15);

const RUTAS_PUBLICAS = ["/login", "/api/auth/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (RUTAS_PUBLICAS.some((r) => pathname.startsWith(r)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return redirigirALogin(req);
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Sesión deslizante: cada request autenticado dentro de la ventana de
    // inactividad renueva la expiración; si la ventana se venció, jwtVerify
    // ya lanzó excepción y cae al catch de abajo.
    const nuevaExpiracion = new Date(Date.now() + INACTIVITY_MINUTES * 60 * 1000);
    const nuevoToken = await new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(nuevaExpiracion)
      .sign(secret);

    const res = NextResponse.next();
    res.cookies.set(COOKIE_NAME, nuevoToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      expires: nuevaExpiracion,
      path: "/",
    });
    return res;
  } catch {
    return redirigirALogin(req);
  }
}

function redirigirALogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  res.cookies.delete(COOKIE_NAME);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
