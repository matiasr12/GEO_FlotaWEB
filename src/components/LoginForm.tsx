"use client";

import { useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2 } from "lucide-react";

// API global que expone el script de Cloudflare Turnstile.
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

// Solo rutas internas: sin esto, /login?next=https://sitio-falso.com
// mandaba al usuario recién logueado a una página externa (phishing).
function destinoSeguro(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/dashboard";
  }
  return next;
}

export function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // onReady corre en cada montaje (también si el script ya estaba cargado
  // por una visita anterior), así que el widget se vuelve a dibujar.
  function renderizarWidget() {
    if (!window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: turnstileSiteKey,
      // Mismo tema que eligió el usuario en el panel (ver lib/tema.ts).
      theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
      callback: (token) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Espera a que termine la verificación de seguridad");
      return;
    }
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo iniciar sesión");
        // Cada token de Turnstile sirve una sola vez: pedir uno nuevo
        // para el próximo intento.
        setTurnstileToken(null);
        window.turnstile?.reset(widgetId.current ?? undefined);
        return;
      }

      router.push(destinoSeguro(params.get("next")));
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-2">
          <Globe2 className="h-7 w-7 text-accent" />
          <span className="text-xl font-semibold">
            Geo<span className="text-accent">Flota</span>
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-muted">
              Correo corporativo
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="nombre@empresa.cl"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={renderizarWidget}
          />
          <div ref={widgetRef} className="flex justify-center" />

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando || !turnstileToken}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-60"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Conexión cifrada · La sesión se cierra sola por inactividad
        </p>
      </div>
    </div>
  );
}
