import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";
import { tienePermiso } from "@/lib/auth/rbac";
import { obtenerComentarios } from "@/lib/device-comments";
import { DevicesClient } from "@/components/DevicesClient";

export default async function DevicesPage() {
  const user = await obtenerSesion();
  const [devicesRaw, comentarios] = await Promise.all([listarEquipos(), obtenerComentarios()]);
  const devices = devicesRaw.map((d) => ({ ...d, comentario: comentarios[d.id] ?? null }));

  if (user) {
    await registrarAuditoria({ user, action: "ver_inventario" });
  }

  return (
    <DevicesClient
      devicesIniciales={devices}
      puedeEditar={user ? tienePermiso(user.role, "inventario:editar") : false}
    />
  );
}
