"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Pencil,
  RotateCw,
  Download,
  Check,
} from "lucide-react";
import type { Device, DeviceStatus } from "@/types/device";
import { StatusBadge } from "./StatusBadge";

const ESTADO_LABEL: Record<DeviceStatus, string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
};

function areaTexto(d: Device) {
  return d.areaDetectada ?? d.area ?? d.faena ?? "—";
}

function descargarCSV(devices: Device[]) {
  const encabezados = ["Hostname", "Custodio", "Area", "Estado", "Comentario"];
  const filas = devices.map((d) => [
    d.hostname,
    d.custodioNombre,
    areaTexto(d),
    ESTADO_LABEL[d.estado],
    d.comentario ?? "",
  ]);
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

function ComentarioCell({ device, editable }: { device: Device; editable: boolean }) {
  const [valor, setValor] = useState(device.comentario ?? "");
  const [guardado, setGuardado] = useState(device.comentario ?? "");
  const [guardando, setGuardando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  async function guardar() {
    if (valor === guardado) return;
    setGuardando(true);
    try {
      await fetch(`/api/devices/${device.id}/comentario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: valor }),
      });
      setGuardado(valor);
      setConfirmado(true);
      setTimeout(() => setConfirmado(false), 1500);
    } finally {
      setGuardando(false);
    }
  }

  if (!editable) {
    return <span className="text-muted">{device.comentario || "—"}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        placeholder="Agregar comentario..."
        maxLength={500}
        className="w-full border-b border-border bg-transparent py-1 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent"
      />
      {guardando && <span className="shrink-0 text-[10px] text-muted">…</span>}
      {!guardando && confirmado && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
    </div>
  );
}

export function DeviceTable({
  devices,
  pageSize = 4,
  onEdit,
  puedeComentar = false,
  onFiltrados,
}: {
  devices: Device[];
  pageSize?: number;
  onEdit?: (device: Device) => void;
  puedeComentar?: boolean;
  // Avisa hacia afuera qué equipos quedaron visibles tras los filtros —
  // el dashboard lo usa para que el mapa muestre solo lo que se buscó.
  onFiltrados?: (devices: Device[]) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [filtroHostname, setFiltroHostname] = useState("");
  const [filtroCustodio, setFiltroCustodio] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
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

  const areasDisponibles = useMemo(() => {
    const set = new Set(devices.map((d) => areaTexto(d)).filter((a) => a !== "—"));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [devices]);

  const filtrados = useMemo(() => {
    const h = filtroHostname.trim().toLowerCase();
    const c = filtroCustodio.trim().toLowerCase();
    return devices.filter(
      (d) =>
        (!h || d.hostname.toLowerCase().includes(h)) &&
        (!c || d.custodioNombre.toLowerCase().includes(c)) &&
        (!filtroArea || areaTexto(d) === filtroArea) &&
        (!filtroEstado || d.estado === filtroEstado)
    );
  }, [devices, filtroHostname, filtroCustodio, filtroArea, filtroEstado]);

  useEffect(() => {
    onFiltrados?.(filtrados);
  }, [filtrados, onFiltrados]);

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
            <th className="px-5 py-3 font-medium">Área</th>
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
            <th className="px-5 py-3 font-medium">Comentario</th>
            {onEdit && <th className="px-5 py-3 font-medium" />}
          </tr>
          <tr className="border-b border-border">
            <th className="px-5 pb-3 font-normal">
              <input
                value={filtroHostname}
                onChange={(e) => conReinicioDePagina(setFiltroHostname)(e.target.value)}
                placeholder="Filtrar..."
                className="w-full border-b border-border bg-transparent py-1 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            </th>
            <th className="px-5 pb-3 font-normal">
              <input
                value={filtroCustodio}
                onChange={(e) => conReinicioDePagina(setFiltroCustodio)(e.target.value)}
                placeholder="Filtrar..."
                className="w-full border-b border-border bg-transparent py-1 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            </th>
            <th className="px-5 pb-3 font-normal">
              <select
                value={filtroArea}
                onChange={(e) => conReinicioDePagina(setFiltroArea)(e.target.value)}
                className="w-full border-b border-border bg-transparent py-1 text-xs text-muted focus:outline-none focus:border-accent"
              >
                <option value="" className="bg-surface text-foreground">Todas</option>
                {areasDisponibles.map((area) => (
                  <option key={area} value={area} className="bg-surface text-foreground">
                    {area}
                  </option>
                ))}
              </select>
            </th>
            <th className="px-5 pb-3 font-normal">
              <select
                value={filtroEstado}
                onChange={(e) => conReinicioDePagina(setFiltroEstado)(e.target.value as "" | DeviceStatus)}
                className="w-full border-b border-border bg-transparent py-1 text-xs text-muted focus:outline-none focus:border-accent"
              >
                <option value="" className="bg-surface text-foreground">Todos</option>
                <option value="normal" className="bg-surface text-foreground">Normal</option>
                <option value="alerta" className="bg-surface text-foreground">Alerta</option>
                <option value="sin_senal" className="bg-surface text-foreground">Sin señal</option>
              </select>
            </th>
            <th className="px-5 pb-3" />
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
              <td className="px-5 py-3 text-muted">{areaTexto(d)}</td>
              <td className="px-5 py-3">
                <StatusBadge estado={d.estado} />
              </td>
              <td className="px-5 py-3">
                <ComentarioCell device={d} editable={puedeComentar} />
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
