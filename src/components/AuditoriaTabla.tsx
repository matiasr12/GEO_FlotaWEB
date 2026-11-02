"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronDown, FilterX, User, X } from "lucide-react";
import type { AuditLogEntry } from "@/types/audit";

const MAX_SUGERENCIAS = 8;

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  auditor: "Auditor",
};

// Sin tildes ni mayúsculas: "matias" encuentra a "Matías".
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const claseCampo =
  "h-9 w-full rounded-lg border border-border bg-surface-alt text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent";

// "2026-11-02" (input type=date) → inicio de ese día en hora local.
function inicioDelDia(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).getTime();
}

export function AuditoriaTabla({ registros }: { registros: AuditLogEntry[] }) {
  const [usuario, setUsuario] = useState("");
  const [rol, setRol] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const listaId = useId();

  const usuarios = useMemo(
    () => Array.from(new Set(registros.map((r) => r.userEmail))).sort((a, b) => a.localeCompare(b, "es")),
    [registros]
  );
  const roles = useMemo(() => Array.from(new Set(registros.map((r) => r.role))).sort(), [registros]);

  const sugerencias = useMemo(() => {
    const q = normalizar(usuario.trim());
    if (!q) return [];
    return usuarios.filter((u) => normalizar(u).includes(q) && u !== usuario).slice(0, MAX_SUGERENCIAS);
  }, [usuario, usuarios]);
  const mostrar = abierto && sugerencias.length > 0;

  const filtrados = useMemo(() => {
    const q = normalizar(usuario.trim());
    const min = desde ? inicioDelDia(desde) : -Infinity;
    // "hasta" incluye el día completo.
    const max = hasta ? inicioDelDia(hasta) + 24 * 60 * 60 * 1000 : Infinity;
    return registros.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return (
        (!q || normalizar(r.userEmail).includes(q)) &&
        (!rol || r.role === rol) &&
        t >= min &&
        t < max
      );
    });
  }, [registros, usuario, rol, desde, hasta]);

  const hayFiltros = Boolean(usuario || rol || desde || hasta);

  function elegir(u: string) {
    setUsuario(u);
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
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Usuario con autocompletado */}
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={usuario}
              placeholder="Buscar usuario..."
              autoComplete="off"
              role="combobox"
              aria-expanded={mostrar}
              aria-controls={listaId}
              onChange={(e) => {
                setUsuario(e.target.value);
                setAbierto(true);
                setResaltado(0);
              }}
              onFocus={() => setAbierto(true)}
              onBlur={() => setAbierto(false)}
              onKeyDown={onKeyDown}
              className={`${claseCampo} pl-9 ${usuario ? "pr-8" : "pr-3"}`}
            />
            {usuario && (
              <button
                type="button"
                onClick={() => setUsuario("")}
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
                {sugerencias.map((u, i) => (
                  <li
                    key={u}
                    role="option"
                    aria-selected={i === resaltado}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      elegir(u);
                    }}
                    onMouseEnter={() => setResaltado(i)}
                    className={`cursor-pointer truncate px-3 py-1.5 text-sm ${
                      i === resaltado ? "bg-accent/15 text-foreground" : "text-muted"
                    }`}
                  >
                    {u}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rol */}
          <div className="relative">
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className={`${claseCampo} cursor-pointer appearance-none pl-3 pr-8 ${rol ? "" : "text-muted"}`}
            >
              <option value="" className="bg-surface text-foreground">Todos los roles</option>
              {roles.map((r) => (
                <option key={r} value={r} className="bg-surface text-foreground">
                  {ROL_LABEL[r] ?? r}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>

          {/* Fechas */}
          <label className="relative block">
            <span className="sr-only">Desde</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              title="Desde"
              className={`${claseCampo} pl-9 pr-2 ${desde ? "" : "text-muted"}`}
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Hasta</span>
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              title="Hasta"
              className={`${claseCampo} pl-9 pr-2 ${hasta ? "" : "text-muted"}`}
            />
          </label>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span>
            {filtrados.length === registros.length
              ? `${registros.length} registros`
              : `${filtrados.length} de ${registros.length} registros`}
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setUsuario("");
                setRol("");
                setDesde("");
                setHasta("");
              }}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Acción</th>
              <th className="px-5 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-muted">{new Date(r.timestamp).toLocaleString("es-CL")}</td>
                <td className="px-5 py-3">{r.userEmail}</td>
                <td className="px-5 py-3 text-muted">{ROL_LABEL[r.role] ?? r.role}</td>
                <td className="px-5 py-3">{r.action}</td>
                <td className="px-5 py-3 text-muted">{r.detalle ?? "—"}</td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  {registros.length === 0 ? "Aún no hay registros." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
