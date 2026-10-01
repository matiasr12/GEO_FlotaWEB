"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Pencil,
  RotateCw,
  Download,
} from "lucide-react";
import type { Device, DeviceStatus } from "@/types/device";
import { StatusBadge } from "./StatusBadge";

const ESTADO_LABEL: Record<DeviceStatus, string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
};

function ubicacionTexto(d: Device) {
  return d.ubicacion
    ? `${d.ubicacion.lat.toFixed(4)}, ${d.ubicacion.lng.toFixed(4)}`
    : (d.areaDetectada ?? d.area ?? "—");
}

function descargarCSV(devices: Device[]) {
  const encabezados = ["Hostname", "Custodio", "Ubicacion", "Estado"];
  const filas = devices.map((d) => [d.hostname, d.custodioNombre, ubicacionTexto(d), ESTADO_LABEL[d.estado]]);
  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
  const csv = [encabezados, ...filas].map((fila) => fila.map(escapar).join(",")).join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `equipos_${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

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
  const [filtroHostname, setFiltroHostname] = useState("");
  const [filtroCustodio, setFiltroCustodio] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"" | DeviceStatus>("");
  const router = useRouter();
  const [refrescando, startTransition] = useTransition();

  function recargar() {
    startTransition(() => router.refresh());
  }

  function conReinicioDePagina<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPagina(1);
    };
  }

  const filtrados = useMemo(() => {
    const h = filtroHostname.trim().toLowerCase();
    const c = filtroCustodio.trim().toLowerCase();
    const u = filtroUbicacion.trim().toLowerCase();
    return devices.filter(
      (d) =>
        (!h || d.hostname.toLowerCase().includes(h)) &&
        (!c || d.custodioNombre.toLowerCase().includes(c)) &&
        (!u || ubicacionTexto(d).toLowerCase().includes(u)) &&
        (!filtroEstado || d.estado === filtroEstado)
    );
  }, [devices, filtroHostname, filtroCustodio, filtroUbicacion, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pageSize));

  const visibles = useMemo(() => {
    const inicio = (pagina - 1) * pageSize;
    return filtrados.slice(inicio, inicio + pageSize);
  }, [filtrados, pagina, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="px-5 py-3 font-medium">Hostname</th>
            <th className="px-5 py-3 font-medium">Custodio</th>
            <th className="px-5 py-3 font-medium">Ubicación</th>
            <th className="px-5 py-3 font-medium">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  Estado
                  <button
                    onClick={recargar}
                    disabled={refrescando}
                    title="Actualizar dispositivos y mapa"
                    className="rounded-full p-1 text-muted hover:bg-surface-alt hover:text-foreground disabled:opacity-50"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${refrescando ? "animate-spin" : ""}`} />
                  </button>
                </span>
                <button
                  onClick={() => descargarCSV(filtrados)}
                  title="Descargar en Excel"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-normal text-muted hover:bg-surface-alt hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </button>
              </div>
            </th>
            {onEdit && <th className="px-5 py-3 font-medium" />}
          </tr>
          <tr className="border-b border-border">
            <th className="px-5 pb-3 font-normal">
              <input
                value={filtroHostname}
                onChange={(e) => conReinicioDePagina(setFiltroHostname)(e.target.value)}
                placeholder="Filtrar..."
                className="w-full rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </th>
            <th className="px-5 pb-3 font-normal">
              <input
                value={filtroCustodio}
                onChange={(e) => conReinicioDePagina(setFiltroCustodio)(e.target.value)}
                placeholder="Filtrar..."
                className="w-full rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </th>
            <th className="px-5 pb-3 font-normal">
              <input
                value={filtroUbicacion}
                onChange={(e) => conReinicioDePagina(setFiltroUbicacion)(e.target.value)}
                placeholder="Filtrar..."
                className="w-full rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </th>
            <th className="px-5 pb-3 font-normal">
              <select
                value={filtroEstado}
                onChange={(e) => conReinicioDePagina(setFiltroEstado)(e.target.value as "" | DeviceStatus)}
                className="w-full rounded-md border border-border bg-surface-alt px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Todos</option>
                <option value="normal">Normal</option>
                <option value="alerta">Alerta</option>
                <option value="sin_senal">Sin señal</option>
              </select>
            </th>
            {onEdit && <th className="px-5 pb-3" />}
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
