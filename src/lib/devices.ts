import "server-only";
import { listarEquipos } from "@/lib/daemon-api";
import { actualizarMockDevice, crearMockDevice } from "@/lib/mock-data";
import type { Device, DeviceInput } from "@/types/device";

// TODO: cuando el backend exponga POST/PUT /api/devices para el inventario
// (hoy solo recibe lecturas de posición del daemon), reemplazar estas dos
// funciones por llamadas reales vía daemon-api.ts, igual que listarEquipos().

export { listarEquipos };

export async function crearEquipo(input: DeviceInput): Promise<Device> {
  return crearMockDevice(input);
}

export async function editarEquipo(
  id: string,
  cambios: Partial<DeviceInput>
): Promise<Device | null> {
  return actualizarMockDevice(id, cambios);
}
