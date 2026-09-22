import { obtenerSesion } from "@/lib/auth/session";
import { listarEquipos } from "@/lib/devices";
import { registrarAuditoria } from "@/lib/audit";
import { tienePermiso } from "@/lib/auth/rbac";
import { DevicesClient } from "@/components/DevicesClient";

export default async function DevicesPage() {
  const user = await obtenerSesion();
  const devices = await listarEquipos();

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
