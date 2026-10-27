"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bell, UserCircle2, LogOut, MapPin, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/types/user";
import type { Device } from "@/types/device";
import { ThemeToggle } from "./ThemeToggle";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Administrador",
  supervisor: "Supervisor de turno",
  auditor: "Encargado de auditoría",
};

const TITULO_PAGINA: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/map": "Mapa de faena",
  "/alerts": "Alertas",
  "/devices": "Equipos",
  "/reports": "Reportes",
  "/settings": "Configuración",
  "/settings/auditoria": "Auditoría",
  "/settings/privacidad": "Privacidad",
};

export function Topbar({
  user,
  equiposEnAlerta,
  onAbrirMenu,
}: {
  user: SessionUser;
  equiposEnAlerta: Device[];
  onAbrirMenu: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notifAbierta, setNotifAbierta] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifAbierta && !menuAbierto) return;

    function alHacerClicAfuera(e: MouseEvent) {
      const objetivo = e.target as Node;
      if (notifAbierta && !notifRef.current?.contains(objetivo)) setNotifAbierta(false);
      if (menuAbierto && !menuRef.current?.contains(objetivo)) setMenuAbierto(false);
    }

    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, [notifAbierta, menuAbierto]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onAbrirMenu}
          aria-label="Abrir menú"
          className="-ml-1 rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-sm font-semibold text-foreground">
          {TITULO_PAGINA[pathname] ?? "GeoFlota"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {/* <img> plano a propósito: el optimizador de next/image falla en el
            plan F1 de Azure, y un logo estático chico no lo necesita. */}
        <img
          src="/logo-web.png"
          alt="Caserones — SCM Minera Lumina Copper Chile"
          className="logo-oscuro hidden h-12 w-auto object-contain sm:block"
        />
        {/* Misma imagen con la palabra CASERONES en oscuro: la original es
            blanca y desaparece sobre el fondo del modo claro. */}
        <img
          src="/logo-web-claro.png"
          alt="Caserones — SCM Minera Lumina Copper Chile"
          className="logo-claro hidden h-12 w-auto object-contain sm:block"
        />

        <ThemeToggle />

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifAbierta((v) => !v);
              setMenuAbierto(false);
            }}
            className="relative rounded-full p-1 hover:bg-surface-alt"
          >
            <Bell className="h-5 w-5 text-muted" />
            {equiposEnAlerta.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger" />
            )}
          </button>

          {notifAbierta && (
            <div className="absolute -right-12 z-[1100] mt-2 w-[calc(100vw-2rem)] max-w-80 rounded-lg sm:right-0 border border-border bg-surface-alt shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">
                  {equiposEnAlerta.length > 0
                    ? `${equiposEnAlerta.length} equipo${equiposEnAlerta.length === 1 ? "" : "s"} en alerta`
                    : "Sin alertas activas"}
                </p>
              </div>

              {equiposEnAlerta.length > 0 && (
                <ul className="max-h-72 overflow-y-auto">
                  {equiposEnAlerta.map((d) => (
                    <li key={d.id} className="border-b border-border last:border-0">
                      <Link
                        href="/alerts"
                        onClick={() => setNotifAbierta(false)}
                        className="block px-4 py-2.5 hover:bg-surface"
                      >
                        <p className="text-sm font-medium">{d.hostname}</p>
                        <p className="text-xs text-muted">{d.custodioNombre}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                          <MapPin className="h-3 w-3" />
                          {d.areaDetectada ?? d.area ?? "Fuera del área asignada"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/alerts"
                onClick={() => setNotifAbierta(false)}
                className="block px-4 py-2.5 text-center text-sm text-accent hover:bg-surface"
              >
                Ver todas las alertas
              </Link>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuAbierto((v) => !v);
              setNotifAbierta(false);
            }}
            className="flex items-center gap-2 rounded-full"
          >
            <UserCircle2 className="h-8 w-8 text-accent" />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 z-[1100] mt-2 w-56 rounded-lg border border-border bg-surface-alt p-3 shadow-xl">
              <p className="text-sm font-medium">{user.nombre}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
              <button
                onClick={cerrarSesion}
                className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
