"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Device } from "@/types/device";
import { DeviceTable } from "./DeviceTable";
import { DeviceFormModal } from "./DeviceFormModal";

export function DevicesClient({
  devicesIniciales,
  puedeEditar,
}: {
  devicesIniciales: Device[];
  puedeEditar: boolean;
}) {
  const [devices, setDevices] = useState(devicesIniciales);
  const [editando, setEditando] = useState<Device | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  function onSaved(equipo: Device) {
    setDevices((prev) => {
      const existe = prev.some((d) => d.id === equipo.id);
      return existe ? prev.map((d) => (d.id === equipo.id ? equipo : d)) : [equipo, ...prev];
    });
    setModalAbierto(false);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Inventario de equipos</h1>
          <p className="text-sm text-muted">{devices.length} equipos registrados</p>
        </div>
        {puedeEditar && (
          <button
            onClick={() => {
              setEditando(null);
              setModalAbierto(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Agregar equipo
          </button>
        )}
      </div>

      <DeviceTable
        devices={devices}
        pageSize={10}
        onEdit={
          puedeEditar
            ? (d) => {
                setEditando(d);
                setModalAbierto(true);
              }
            : undefined
        }
      />

      {modalAbierto && (
        <DeviceFormModal
          device={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
