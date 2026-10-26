import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";
import { tienePermiso } from "@/lib/auth/rbac";
import { obtenerComentarios } from "@/lib/device-comments";
import { listarAreas } from "@/lib/areas";
import { DevicesClient } from "@/components/DevicesClient";

export default async function DevicesPage() {
  const user = await obtenerSesion();
  const [devicesRaw, comentarios, areas] = await Promise.all([
    listarEquipos(),
    obtenerComentarios(),
    listarAreas(),
  ]);
  const devices = devicesRaw.map((d) => ({ ...d, comentario: comentarios[d.id] ?? null }));

  if (user) {
    await registrarAuditoria({ user, action: "ver_inventario" });
  }

  return (
    <DevicesClient
      devicesIniciales={devices}
      areas={areas}
      puedeEditar={user ? tienePermiso(user.role, "inventario:editar") : false}
    />
  );
}
