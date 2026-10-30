import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await obtenerSesion();
  if (!user) redirect("/login");

  // Sin await a propósito: la campana de alertas recibe la promesa y la
  // resuelve sola (Suspense en el Topbar). Antes el layout esperaba al
  // backend (hasta 70 s si estaba lento) antes de mostrar nada, y tras el
  // login la pantalla quedaba congelada en /login sin el spinner de carga.
  const equiposEnAlerta = listarEquipos().then((devices) =>
    devices.filter((d) => d.estado === "alerta")
  );

  return (
    <AppShell user={user} equiposEnAlerta={equiposEnAlerta}>
      {children}
    </AppShell>
  );
}
