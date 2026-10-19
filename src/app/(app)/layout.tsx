import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await obtenerSesion();
  if (!user) redirect("/login");

  const devices = await listarEquipos();
  const equiposEnAlerta = devices.filter((d) => d.estado === "alerta");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <Topbar user={user} equiposEnAlerta={equiposEnAlerta} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
