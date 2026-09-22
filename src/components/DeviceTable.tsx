"use client";

import { useMemo, useState } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Pencil } from "lucide-react";
import type { Device } from "@/types/device";
import { StatusBadge } from "./StatusBadge";

export function DeviceTable({
  devices,
  pageSize = 4,
  onEdit,
}: {
  devices: Device[];
  pageSize?: number;
  onEdit?: (device: Device) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(devices.length / pageSize));

  const visibles = useMemo(() => {
    const inicio = (pagina - 1) * pageSize;
    return devices.slice(inicio, inicio + pageSize);
  }, [devices, pagina, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="px-5 py-3 font-medium">Hostname</th>
            <th className="px-5 py-3 font-medium">Custodio</th>
            <th className="px-5 py-3 font-medium">Ubicación</th>
            <th className="px-5 py-3 font-medium">Estado</th>
            {onEdit && <th className="px-5 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {visibles.map((d) => (
            <tr
              key={d.id}
              className={`border-b border-border last:border-0 ${
                d.estado === "alerta" ? "bg-danger/10" : ""
              }`}
            >
              <td className="px-5 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {d.hostname}
                  {d.estado === "alerta" && <span title="Alerta">⚠️</span>}
                </span>
              </td>
              <td className="px-5 py-3 text-muted">{d.custodioNombre}</td>
              <td className="px-5 py-3 text-muted">
                {d.ubicacion
                  ? `${d.ubicacion.lat.toFixed(4)}, ${d.ubicacion.lng.toFixed(4)}`
                  : (d.areaDetectada ?? d.area ?? "—")}
              </td>
              <td className="px-5 py-3">
                <StatusBadge estado={d.estado} />
              </td>
              {onEdit && (
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => onEdit(d)}
                    className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-sm text-muted">
        <button onClick={() => setPagina(1)} disabled={pagina === 1} className="disabled:opacity-30">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina === 1}
          className="disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>
          Page {pagina} of {totalPaginas}
        </span>
        <button
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          className="disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPagina(totalPaginas)}
          disabled={pagina === totalPaginas}
          className="disabled:opacity-30"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
