// Modo claro/oscuro del panel. Va aparte de ThemeToggle.tsx ("use client")
// porque app/layout.tsx (componente de servidor) también necesita el script.

export type Tema = "dark" | "light";

export const CLAVE_TEMA = "geoflota-tema";

// Se ejecuta en <head> antes de pintar, para que al recargar en modo
// claro no se vea un destello del modo oscuro.
export const SCRIPT_TEMA = `try{if(localStorage.getItem("${CLAVE_TEMA}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
