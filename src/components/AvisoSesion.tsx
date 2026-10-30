"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { EXP_COOKIE_NAME } from "@/lib/session-cookie";

// Cuánto antes del cierre por inactividad aparece el aviso.
const AVISO_MS = 5 * 60 * 1000;

function leerVencimiento(): number | null {
  const valor = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${EXP_COOKIE_NAME}=`))
    ?.split("=")[1];
  const ms = Number(valor);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

function formatear(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Aviso 5 minutos antes de que la sesión se cierre por inactividad, con
// cuenta regresiva y "Seguir conectado". La hora de vencimiento sale de la
// cookie geoflota_session_exp, que el servidor actualiza en cada request:
// así el aviso queda bien aunque haya varias pestañas abiertas.
export function AvisoSesion() {
  const router = useRouter();
  const [restante, setRestante] = useState<number | null>(null);
  const [renovando, setRenovando] = useState(false);

  useEffect(() => {
    // El navegador borra la cookie justo al vencer: se recuerda el último
    // valor visto para detectar el cierre aunque la cookie ya no esté.
    let ultimoVence: number | null = null;
    const id = setInterval(() => {
      const vence = leerVencimiento() ?? ultimoVence;
      if (vence === null) {
        setRestante(null);
        return;
      }
      ultimoVence = vence;
      const ms = vence - Date.now();
      if (ms <= 0) {
        clearInterval(id);
        fetch("/api/auth/logout", { method: "POST" }).finally(() => {
          router.push("/login?expirada=1");
          router.refresh();
        });
        return;
      }
      setRestante(ms);
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  async function seguirConectado() {
    setRenovando(true);
    try {
      const res = await fetch("/api/auth/renovar", { method: "POST" });
      if (!res.ok) {
        router.push("/login?expirada=1");
        return;
      }
      // La respuesta ya trae la cookie con el vencimiento nuevo; el
      // intervalo la lee en el próximo segundo y el aviso se cierra solo.
      setRestante(null);
    } finally {
      setRenovando(false);
    }
  }

  async function cerrarAhora() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (restante === null || restante > AVISO_MS) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-sesion-titulo"
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
          <Clock className="h-6 w-6 text-warning" />
        </div>
        <h2 id="aviso-sesion-titulo" className="font-semibold">
          Tu sesión está por cerrarse
        </h2>
        <p className="mt-1 text-sm text-muted">
          Por seguridad, la sesión se cierra tras un rato sin actividad.
        </p>
        <p className="my-4 font-mono text-3xl font-semibold tabular-nums text-warning">
          {formatear(restante)}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={seguirConectado}
            disabled={renovando}
            autoFocus
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {renovando ? "Renovando..." : "Seguir conectado"}
          </button>
          <button
            type="button"
            onClick={cerrarAhora}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-alt hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
