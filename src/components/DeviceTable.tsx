"use client";

import { useEffect, useId, useMemo, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown,
  Pencil,
  RotateCw,
  Download,
  Check,
  Monitor,
  User,
  X,
  FilterX,
} from "lucide-react";
import type { Device, DeviceStatus } from "@/types/device";
import { StatusBadge } from "./StatusBadge";

const ESTADO_LABEL: Record<DeviceStatus, string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
  fuera_de_turno: "Fuera de turno",
};

const MAX_SUGERENCIAS = 8;

// Sin tildes ni mayúsculas: "matias" encuentra a "Matías".
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const claseCampo =
  "h-9 w-full rounded-lg border border-border bg-surface-alt text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent";

// Input de búsqueda con sugerencias: mientras se escribe muestra los
// valores que coinciden y al elegir uno se autocompleta.
function CampoBusqueda({
  icono,
  placeholder,
  valor,
  onChange,
  opciones,
}: {
  icono: ReactNode;
  placeholder: string;
  valor: string;
  onChange: (v: string) => void;
  opciones: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const listaId = useId();

  const sugerencias = useMemo(() => {
    const q = normalizar(valor.trim());
    if (!q) return [];
    return opciones
      .filter((o) => normalizar(o).includes(q) && o !== valor)
      .slice(0, MAX_SUGERENCIAS);
  }, [valor, opciones]);

  const mostrar = abierto && sugerencias.length > 0;

  function elegir(o: string) {
    onChange(o);
    setAbierto(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!mostrar) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      elegir(sugerencias[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        {icono}
      </span>
      <input
        value={valor}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={listaId}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setResaltado(0);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={onKeyDown}
        className={`${claseCampo} pl-9 ${valor ? "pr-8" : "pr-3"}`}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Borrar"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {mostrar && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
        >
          {sugerencias.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={i === resaltado}
              // mousedown en vez de click: el click llega después del blur
              // del input, que ya cerró la lista.
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(o);
              }}
              onMouseEnter={() => setResaltado(i)}
              className={`cursor-pointer truncate px-3 py-1.5 text-sm ${
                i === resaltado ? "bg-accent/15 text-foreground" : "text-muted"
              }`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampoSelect({
  valor,
  onChange,
  children,
}: {
  valor: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${claseCampo} cursor-pointer appearance-none pl-3 pr-8 ${valor ? "" : "text-muted"}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

function areaTexto(d: Device) {
  return d.areaDetectada ?? d.area ?? d.faena ?? "—";
}

async function descargarExcel(devices: Device[]) {
  // Import perezoso: exceljs es pesado, no tiene por qué ir en el bundle
  // inicial de la tabla — solo se carga cuando alguien realmente exporta.
  const ExcelJS = (await import("exceljs")).default;

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Equipos");

  hoja.columns = [
    { header: "Hostname", key: "hostname", width: 22 },
    { header: "Trabajador", key: "trabajador", width: 28 },
    { header: "Área", key: "area", width: 24 },
    { header: "Faena", key: "faena", width: 18 },
    { header: "Código de activo", key: "codigoActivo", width: 18 },
    { header: "Turno", key: "turno", width: 16 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const d of devices) {
    hoja.addRow({
      hostname: d.hostname,
      trabajador: d.custodioNombre,
      area: areaTexto(d),
      faena: d.faena ?? "",
      codigoActivo: d.codigoActivo ?? "",
      turno: d.turno ?? "",
    });
  }

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `equipos_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const hostnamesDisponibles = useMemo(
    () => Array.from(new Set(devices.map((d) => d.hostname))).sort((a, b) => a.localeCompare(b, "es")),
    [devices]
  );
  const custodiosDisponibles = useMemo(
    () =>
      Array.from(new Set(devices.map((d) => d.custodioNombre)))
        .filter((n) => n !== "Sin asignar")
        .sort((a, b) => a.localeCompare(b, "es")),
    [devices]
  );

  const hayFiltros = Boolean(filtroHostname || filtroCustodio || filtroArea || filtroEstado);

  function limpiarFiltros() {
    setFiltroHostname("");
    setFiltroCustodio("");
    setFiltroArea("");
    setFiltroEstado("");
    setPagina(1);
  }

  const filtrados = useMemo(() => {
    const h = normalizar(filtroHostname.trim());
    const c = normalizar(filtroCustodio.trim());
    return devices.filter(
      (d) =>
        (!h || normalizar(d.hostname).includes(h)) &&
        (!c || normalizar(d.custodioNombre).includes(c)) &&
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
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CampoBusqueda
            icono={<Monitor className="h-4 w-4" />}
            placeholder="Buscar hostname..."
            valor={filtroHostname}
            onChange={conReinicioDePagina(setFiltroHostname)}
            opciones={hostnamesDisponibles}
          />
          <CampoBusqueda
            icono={<User className="h-4 w-4" />}
            placeholder="Buscar trabajador..."
            valor={filtroCustodio}
            onChange={conReinicioDePagina(setFiltroCustodio)}
            opciones={custodiosDisponibles}
          />
          <CampoSelect valor={filtroArea} onChange={conReinicioDePagina(setFiltroArea)}>
            <option value="" className="bg-surface text-foreground">Todas las áreas</option>
            {areasDisponibles.map((area) => (
              <option key={area} value={area} className="bg-surface text-foreground">
                {area}
              </option>
            ))}
          </CampoSelect>
          <CampoSelect
            valor={filtroEstado}
            onChange={(v) => conReinicioDePagina(setFiltroEstado)(v as "" | DeviceStatus)}
          >
            <option value="" className="bg-surface text-foreground">Todos los estados</option>
            {(Object.keys(ESTADO_LABEL) as DeviceStatus[]).map((estado) => (
              <option key={estado} value={estado} className="bg-surface text-foreground">
                {ESTADO_LABEL[estado]}
              </option>
            ))}
          </CampoSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              {filtrados.length === devices.length
                ? `${devices.length} equipos`
                : `${filtrados.length} de ${devices.length} equipos`}
            </span>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <FilterX className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={recargar}
              disabled={refrescando}
              title="Actualizar dispositivos y mapa"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-muted hover:bg-surface-alt hover:text-foreground disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refrescando ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={() => descargarExcel(filtrados)}
              title="Descargar en Excel"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-muted hover:bg-surface-alt hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="px-5 py-3 font-medium">Hostname</th>
            <th className="px-5 py-3 font-medium">Trabajador</th>
            <th className="px-5 py-3 font-medium">Área</th>
            <th className="px-5 py-3 font-medium">Estado</th>
            <th className="px-5 py-3 font-medium">Comentario</th>
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
              <td className="px-5 py-3 text-muted">
                {d.custodioNombre}
                {d.turno && <div className="text-xs text-muted/70">{d.turno}</div>}
              </td>
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
          {visibles.length === 0 && (
            <tr>
              <td colSpan={onEdit ? 6 : 5} className="px-5 py-8 text-center text-muted">
                Ningún equipo coincide con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

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
