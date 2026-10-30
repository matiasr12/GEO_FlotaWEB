import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import { obtenerUsuarioVigente } from "@/lib/auth/users";
import { EXP_COOKIE_NAME } from "@/lib/session-cookie";
import type { SessionUser } from "@/types/user";

const COOKIE_NAME = "geoflota_session";

// Perezoso: no leer env.SESSION_SECRET al importar el módulo (ver env.ts).
function getSecret() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

function inactivityMs() {
  return getEnv().SESSION_INACTIVITY_MINUTES * 60 * 1000;
}

export async function crearSesion(user: SessionUser) {
  const expira = new Date(Date.now() + inactivityMs());
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    expires: expira,
    path: "/",
  });
  store.set(EXP_COOKIE_NAME, String(expira.getTime()), {
    httpOnly: false,
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

  let sesion: SessionUser;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    sesion = payload as unknown as SessionUser;
  } catch {
    return null;
  }

  // Rol y estado actuales desde la DB, no los que quedaron en el token.
  try {
    return await obtenerUsuarioVigente(sesion);
  } catch (err) {
    // La DB no respondió (ej. Azure SQL despertando de la pausa): se usa
    // la sesión firmada en vez de echar al usuario al login. La revocación
    // vuelve a aplicarse en cuanto la DB responda (no se guarda en caché).
    console.error("[session] no se pudo verificar el usuario en la DB:", err);
    return sesion;
  }
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(EXP_COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
