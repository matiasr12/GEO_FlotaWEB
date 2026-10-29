import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/daemon-api";
import { registrarAuditoria } from "@/lib/audit";
import { tienePermiso } from "@/lib/auth/rbac";
import { obtenerComentarios } from "@/lib/device-comments";
import { listarAreas } from "@/lib/areas";
import { normalizarRut, obtenerContactos } from "@/lib/personal";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const user = await obtenerSesion();
  const [devicesRaw, comentarios, areas, contactos] = await Promise.all([
    listarEquipos(),
    obtenerComentarios(),
    listarAreas(),
    obtenerContactos(),
  ]);
  const devices = devicesRaw.map((d) => ({
    ...d,
    comentario: comentarios[d.id] ?? null,
    ...contactos.get(normalizarRut(d.custodioId)),
  }));

  if (user) {
    await registrarAuditoria({ user, action: "ver_dashboard" });
  }

  const activos = devices.filter((d) => d.estado !== "sin_senal").length;
  const alertas = devices.filter((d) => d.estado === "alerta").length;
  const ordenados = [...devices].sort((a, b) =>
    a.estado === "alerta" ? -1 : b.estado === "alerta" ? 1 : 0
  );

  return (
    <DashboardClient
      devices={devices}
      areas={areas}
      ordenados={ordenados}
      activos={activos}
      alertas={alertas}
      puedeComentar={user ? tienePermiso(user.role, "inventario:editar") : false}
    />
  );
}
