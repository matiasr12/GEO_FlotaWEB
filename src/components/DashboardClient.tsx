"use client";

import { useRef, useState } from "react";
import type { Device } from "@/types/device";
import type { EquipoEnfocado } from "./MapView";
import { MapViewClient } from "./MapViewClient";
import { SemaforoCard } from "./SemaforoCard";
import { StatsPanel } from "./StatsPanel";
import { DeviceTable } from "./DeviceTable";
import { DashboardCharts } from "./DashboardCharts";

export function DashboardClient({
  devices,
  areas,
  ordenados,
  activos,
  alertas,
  puedeComentar,
}: {
  devices: Device[];
  areas: string[];
  ordenados: Device[];
  activos: number;
  alertas: number;
  puedeComentar: boolean;
}) {
  // Arranca mostrando todos los equipos; se achica a lo que la tabla deja
  // visible en cuanto el usuario escribe algo en los filtros.
  const [filtrados, setFiltrados] = useState<Device[]>(devices);
  const [enfocado, setEnfocado] = useState<EquipoEnfocado | undefined>();
  const mapaRef = useRef<HTMLDivElement>(null);

  const conUbicacion = filtrados.filter((d) => d.ubicacion).length;

  function ubicarEnMapa(d: Device) {
    setEnfocado((prev) => ({ id: d.id, vez: (prev?.vez ?? 0) + 1 }));
    // En celular el mapa queda arriba, fuera de la pantalla.
    mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div ref={mapaRef} className="relative h-[300px] sm:h-[420px]">
          <MapViewClient devices={filtrados} altura="100%" enfocado={enfocado} />
          {conUbicacion === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-lg bg-surface/90 px-3 py-1.5 text-xs text-muted shadow">
              {filtrados.length === 0 && devices.length > 0
                ? "El filtro no encontró equipos con esos datos."
                : "La API todavía no entrega coordenadas por equipo — el mapa queda vacío hasta que el backend las resuelva."}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <SemaforoCard hayAlertas={alertas > 0} />
          <StatsPanel total={devices.length} activos={activos} alertas={alertas} />
        </div>
      </div>

      <DeviceTable
        devices={ordenados}
        areas={areas}
        pageSize={4}
        puedeComentar={puedeComentar}
        onFiltrados={setFiltrados}
        onSeleccionar={ubicarEnMapa}
        seleccionadoId={enfocado?.id}
      />

      <DashboardCharts devices={filtrados} />
    </div>
  );
}
