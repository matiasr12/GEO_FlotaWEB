"use client";

import { useState, type ReactNode } from "react";
import type { SessionUser } from "@/types/user";
import type { Device } from "@/types/device";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AvisoSesion } from "./AvisoSesion";

// Estructura del panel. En pantallas chicas el Sidebar pasa a ser un menú
// deslizable que abre el botón ☰ del Topbar; desde lg queda fijo.
export function AppShell({
  user,
  equiposEnAlerta,
  children,
}: {
  user: SessionUser;
  equiposEnAlerta: Promise<Device[]>;
  children: ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={user.role} abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          equiposEnAlerta={equiposEnAlerta}
          onAbrirMenu={() => setMenuAbierto(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <AvisoSesion />
    </div>
  );
}
