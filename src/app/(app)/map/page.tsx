import { connection } from "next/server";
import { listarEquipos } from "@/lib/daemon-api";
import { MapViewClient } from "@/components/MapViewClient";

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  // Datos en vivo: sin esto Next prerenderiza la página en el build (con
  // 0 equipos) porque ya no lee la sesión acá.
  await connection();
  const devices = await listarEquipos();
  // /map?equipo=<id>: viene de tocar un equipo en la tabla de Equipos.
  const { equipo } = await searchParams;
  const enfocado = typeof equipo === "string" ? { id: equipo, vez: 1 } : undefined;

  const conUbicacion = devices.filter((d) => d.ubicacion).length;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Mapa de faena</h1>
        <p className="text-sm text-muted">
          Última posición estimada de cada equipo dentro del área de la faena.
        </p>
      </div>
      <div className="relative flex-1">
        <MapViewClient devices={devices} zoom={13} altura="100%" enfocado={enfocado} />
        {conUbicacion === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted shadow">
            La API todavía no entrega coordenadas por equipo — el mapa queda
            vacío hasta que el backend las resuelva.
          </div>
        )}
      </div>
    </div>
  );
}
