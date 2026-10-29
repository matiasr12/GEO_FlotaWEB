"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import type { DataSubjectRequest, TipoSolicitud } from "@/lib/data-subject-requests";

// Trabajador con computador asignado.
export interface PersonaTitular {
  clave: string;
  nombre: string;
  correo?: string | null; // desde dbo.Personal; se autocompleta al elegirlo
  detalle: string; // RUT · área · equipo
}

const MAX_SUGERENCIAS = 8;

// Sin tildes ni mayúsculas: "jose" encuentra a "José".
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const TIPOS: { value: TipoSolicitud; label: string }[] = [
  { value: "acceso", label: "Acceso a sus datos" },
  { value: "rectificacion", label: "Rectificación" },
  { value: "cancelacion", label: "Cancelación / eliminación" },
  { value: "oposicion", label: "Oposición al tratamiento" },
];

export function DataRequestForm({
  solicitudesIniciales,
  personas,
}: {
  solicitudesIniciales: DataSubjectRequest[];
  personas: PersonaTitular[];
}) {
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<TipoSolicitud>("acceso");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);

  // Busca por nombre, RUT, área o equipo.
  const sugerencias = useMemo(() => {
    const q = normalizar(nombre.trim());
    if (!q) return [];
    return personas
      .filter((p) => normalizar(`${p.nombre} ${p.detalle}`).includes(q))
      .slice(0, MAX_SUGERENCIAS);
  }, [nombre, personas]);

  function elegir(p: PersonaTitular) {
    setNombre(p.nombre);
    if (p.correo) setEmail(p.correo);
    setAbierto(false);
  }

  function onKeyDownNombre(e: KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      elegir(sugerencias[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/privacidad/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solicitanteNombre: nombre,
          solicitanteEmail: email,
          tipoSolicitud: tipo,
          detalle: detalle || undefined,
        }),
      });
      if (res.ok) {
        const { correoEnviado, correoError, ...nueva } = await res.json();
        setSolicitudes((prev) => [nueva, ...prev]);
        setAviso(
          correoEnviado
            ? { ok: true, texto: `Solicitud registrada. Se envió un correo a ${nueva.solicitanteEmail} avisando que está en revisión.` }
            : {
                ok: false,
                texto: `Solicitud registrada, pero no se pudo enviar el correo al titular. Avísale por otro medio.${
                  correoError ? ` Motivo: ${correoError}` : ""
                }`,
              }
        );
        setNombre("");
        setEmail("");
        setDetalle("");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-medium">Registrar solicitud</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <input
              required
              placeholder="Nombre del titular (busca por nombre o RUT)"
              value={nombre}
              autoComplete="off"
              role="combobox"
              aria-expanded={abierto && sugerencias.length > 0}
              aria-controls="sugerencias-titular"
              onChange={(e) => {
                setNombre(e.target.value);
                setAbierto(true);
                setResaltado(0);
              }}
              onFocus={() => setAbierto(true)}
              onBlur={() => setAbierto(false)}
              onKeyDown={onKeyDownNombre}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {abierto && sugerencias.length > 0 && (
              <ul
                id="sugerencias-titular"
                role="listbox"
                className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface shadow-xl"
              >
                {sugerencias.map((p, i) => (
                  <li
                    key={p.clave}
                    role="option"
                    aria-selected={i === resaltado}
                    // mousedown en vez de click: el click llega después del
                    // blur del input, que ya cerró la lista.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      elegir(p);
                    }}
                    onMouseEnter={() => setResaltado(i)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      i === resaltado ? "bg-accent/15" : ""
                    }`}
                  >
                    <span className="block">{p.nombre}</span>
                    {/* El correo a la vista: si una persona aparece dos
                        veces en dbo.Personal, se ve cuál tiene contacto. */}
                    <span className={`block truncate text-xs ${p.correo ? "text-accent" : "text-muted/70 italic"}`}>
                      {p.correo ?? "Sin correo registrado"}
                    </span>
                    <span className="block truncate text-xs text-muted">{p.detalle}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            required
            type="email"
            placeholder="Correo de contacto"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoSolicitud)}
            className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Detalle (opcional)"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
        >
          {enviando ? "Guardando..." : "Registrar solicitud"}
        </button>
        {aviso && (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              aviso.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            }`}
          >
            {aviso.texto}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Esta primera versión solo deja la solicitud registrada para gestión
          manual; la eliminación/entrega automática de datos queda para una
          siguiente iteración.
        </p>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-5 py-3 font-medium">Titular</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  {s.solicitanteNombre}
                  <span className="block text-xs text-muted">{s.solicitanteEmail}</span>
                </td>
                <td className="px-5 py-3 text-muted">{s.tipoSolicitud}</td>
                <td className="px-5 py-3 text-muted">{s.estado}</td>
                <td className="px-5 py-3 text-muted">
                  {new Date(s.creadoEn).toLocaleDateString("es-CL")}
                </td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  Sin solicitudes registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
