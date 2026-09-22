import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { SessionUser } from "@/types/user";

const COOKIE_NAME = "geoflota_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

function inactivityMs() {
  return env.SESSION_INACTIVITY_MINUTES * 60 * 1000;
}

export async function crearSesion(user: SessionUser) {
  const expira = new Date(Date.now() + inactivityMs());
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    expires: expira,
    path: "/",
  });
}

export async function renovarSesion(user: SessionUser) {
  // Se llama en cada request autenticado para implementar expiración
  // por inactividad (sliding window) en vez de una sesión de duración fija.
  await crearSesion(user);
}

export async function obtenerSesion(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
