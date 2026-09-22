"use client";

import { useState, type FormEvent } from "react";
import type { DataSubjectRequest, TipoSolicitud } from "@/lib/data-subject-requests";

const TIPOS: { value: TipoSolicitud; label: string }[] = [
  { value: "acceso", label: "Acceso a sus datos" },
  { value: "rectificacion", label: "Rectificación" },
  { value: "cancelacion", label: "Cancelación / eliminación" },
  { value: "oposicion", label: "Oposición al tratamiento" },
];

export function DataRequestForm({
  solicitudesIniciales,
}: {
  solicitudesIniciales: DataSubjectRequest[];
}) {
  const [solicitudes, setSolicitudes] = useState(solicitudesIniciales);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<TipoSolicitud>("acceso");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
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
        const nueva = await res.json();
        setSolicitudes((prev) => [nueva, ...prev]);
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
          <input
            required
            placeholder="Nombre del titular"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
          />
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
        <p className="mt-3 text-xs text-muted">
          Esta primera versión solo deja la solicitud registrada para gestión
          manual; la eliminación/entrega automática de datos queda para una
          siguiente iteración.
        </p>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
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
