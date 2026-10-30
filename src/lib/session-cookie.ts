// Cookie con SOLO la hora en que vence la sesión (ms desde epoch). A
// diferencia de geoflota_session no es httpOnly: la lee el navegador para
// avisar 5 minutos antes de que se cierre por inactividad (AvisoSesion.tsx).
// No sirve para autenticarse: no contiene el token.
export const EXP_COOKIE_NAME = "geoflota_session_exp";
