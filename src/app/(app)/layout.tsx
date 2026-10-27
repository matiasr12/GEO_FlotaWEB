import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await obtenerSesion();
  if (!user) redirect("/login");

  const devices = await listarEquipos();
  const equiposEnAlerta = devices.filter((d) => d.estado === "alerta");

  return (
    <AppShell user={user} equiposEnAlerta={equiposEnAlerta}>
      {children}
    </AppShell>
  );
}
