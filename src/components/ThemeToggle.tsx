"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { CLAVE_TEMA, type Tema } from "@/lib/tema";

// El tema vive en el atributo data-theme de <html>; se escucha ese
// atributo en vez de duplicarlo en estado de React.
function suscribir(alCambiar: () => void) {
  const observer = new MutationObserver(alCambiar);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function leerTema(): Tema {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// En el servidor no se sabe qué eligió el usuario.
function leerTemaServidor(): Tema | null {
  return null;
}

export function ThemeToggle() {
  const tema = useSyncExternalStore<Tema | null>(suscribir, leerTema, leerTemaServidor);

  function alternar() {
    const nuevo: Tema = tema === "light" ? "dark" : "light";
    if (nuevo === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el cambio aplica
      // igual, solo no se recuerda al recargar.
    }
  }

  const esClaro = tema === "light";

  return (
    <button
      type="button"
      onClick={alternar}
      title={esClaro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      aria-label={esClaro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="relative h-7 w-7 rounded-full p-1 hover:bg-surface-alt"
    >
      {/* Los dos íconos superpuestos: uno gira y se desvanece mientras
          aparece el otro. */}
      <Sun
        className={`absolute inset-1 h-5 w-5 text-warning transition-all duration-300 ${
          esClaro ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute inset-1 h-5 w-5 text-accent transition-all duration-300 ${
          esClaro ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
