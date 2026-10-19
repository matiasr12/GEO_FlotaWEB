"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Bell, UserCircle2, LogOut, MapPin } from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/types/user";
import type { Device } from "@/types/device";

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
}: {
  user: SessionUser;
  equiposEnAlerta: Device[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notifAbierta, setNotifAbierta] = useState(false);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
      <h1 className="text-sm font-semibold text-foreground">
        {TITULO_PAGINA[pathname] ?? "GeoFlota"}
      </h1>

      <div className="flex items-center gap-5">
        {/* <img> plano a propósito: el optimizador de next/image falla en el
            plan F1 de Azure, y un logo estático chico no lo necesita. */}
        <img
          src="/logo-web.png"
          alt="Caserones — SCM Minera Lumina Copper Chile"
          className="h-8 w-auto object-contain"
        />

        <div className="relative">
          <button
            onClick={() => setNotifAbierta((v) => !v)}
            className="relative rounded-full p-1 hover:bg-surface-alt"
          >
            <Bell className="h-5 w-5 text-muted" />
            {equiposEnAlerta.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger" />
            )}
          </button>

          {notifAbierta && (
            <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-border bg-surface-alt shadow-xl">
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
                    <li key={d.id} className="border-b border-border px-4 py-2.5 last:border-0">
                      <p className="text-sm font-medium">{d.hostname}</p>
                      <p className="text-xs text-muted">{d.custodioNombre}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                        <MapPin className="h-3 w-3" />
                        {d.areaDetectada ?? d.area ?? "Fuera del área asignada"}
                      </p>
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

        <div className="relative">
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="flex items-center gap-2 rounded-full"
          >
            <UserCircle2 className="h-8 w-8 text-accent" />
          </button>

          {menuAbierto && (
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-border bg-surface-alt p-3 shadow-xl">
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
