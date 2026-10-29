"use client";

import { useEffect, useState } from "react";
import { X, Send, MessageSquare, RefreshCw, Mail } from "lucide-react";
import type {
  DataSubjectRequest,
  EstadoSolicitud,
  NotaSolicitud,
} from "@/lib/data-subject-requests";

export const ESTADO_CONFIG: Record<EstadoSolicitud, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-warning/15 text-warning" },
  en_proceso: { label: "En proceso", className: "bg-accent/15 text-accent" },
  resuelta: { label: "Resuelta", className: "bg-success/15 text-success" },
  rechazada: { label: "Rechazada", className: "bg-danger/15 text-danger" },
};

export const TIPO_LABEL: Record<DataSubjectRequest["tipoSolicitud"], string> = {
  acceso: "Acceso a sus datos",
  rectificacion: "Rectificación",
  cancelacion: "Cancelación / eliminación",
  oposicion: "Oposición al tratamiento",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

// Detalle de una solicitud: datos, cambio de estado, comentarios internos,
// aviso por correo al titular y bitácora de todo lo hecho.
export function SolicitudDetalleModal({
  solicitudId,
  onCerrar,
  onActualizada,
}: {
  solicitudId: string;
  onCerrar: () => void;
  onActualizada: (s: DataSubjectRequest) => void;
}) {
  const [solicitud, setSolicitud] = useState<DataSubjectRequest | null>(null);
  const [notas, setNotas] = useState<NotaSolicitud[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSolicitud>("pendiente");
  const [comentario, setComentario] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [avisando, setAvisando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/privacidad/solicitudes/${solicitudId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelado) return;
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la solicitud");
        setSolicitud(data.solicitud);
        setEstado(data.solicitud.estado);
        setNotas(data.notas);
      })
      .catch((err) => !cancelado && setError(err.message));
    return () => {
      cancelado = true;
    };
  }, [solicitudId]);

  // Esc cierra la ventana.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  const cambiaEstado = solicitud !== null && estado !== solicitud.estado;
  const puedeGuardar = cambiaEstado || comentario.trim().length > 0;

  async function guardar() {
    if (!solicitud || !puedeGuardar) return;
    setGuardando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/privacidad/solicitudes/${solicitud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: cambiaEstado ? estado : undefined,
          comentario: comentario.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso({ ok: false, texto: data.error ?? "No se pudo guardar" });
        return;
      }
      setSolicitud(data.solicitud);
      setEstado(data.solicitud.estado);
      setNotas(data.notas);
      setComentario("");
      onActualizada(data.solicitud);
      setAviso({
        ok: true,
        texto: cambiaEstado
          ? "Estado actualizado. Usa \"Avisar al titular\" si quieres informarle el cambio."
          : "Comentario guardado.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function avisarTitular() {
    if (!solicitud) return;
    setAvisando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/privacidad/solicitudes/${solicitud.id}/avisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: mensaje.trim() || undefined }),
      });
      // Si el servidor falla con una página de error (no JSON), igual se
      // muestra algo en vez de quedar en silencio.
      const data = await res.json().catch(() => ({}));
      if (data.notas) setNotas(data.notas);
      if (res.ok && data.correoEnviado) {
        setMensaje("");
        setAviso({ ok: true, texto: `Se envió el estado de la solicitud a ${solicitud.solicitanteEmail}.` });
      } else {
        const motivo = data.correoError ?? data.error ?? (res.ok ? undefined : `error ${res.status} del servidor`);
        setAviso({
          ok: false,
          texto: `No se pudo enviar el correo.${motivo ? ` Motivo: ${motivo}` : ""}`,
        });
      }
    } catch {
      setAviso({ ok: false, texto: "No se pudo enviar el correo: sin conexión con el panel." });
    } finally {
      setAvisando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-solicitud"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="titulo-solicitud" className="truncate font-semibold">
              {solicitud?.solicitanteNombre ?? "Solicitud"}
            </h2>
            {solicitud && (
              <p className="truncate text-xs text-muted">{solicitud.solicitanteEmail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted hover:bg-surface-alt hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          {!solicitud && !error && <p className="text-sm text-muted">Cargando...</p>}

          {solicitud && (
            <div className="flex flex-col gap-5">
              {/* Datos */}
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted">Tipo</dt>
                  <dd>{TIPO_LABEL[solicitud.tipoSolicitud]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Estado actual</dt>
                  <dd>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_CONFIG[solicitud.estado].className}`}>
                      {ESTADO_CONFIG[solicitud.estado].label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Registrada</dt>
                  <dd>{formatearFecha(solicitud.creadoEn)}</dd>
                </div>
                <div className="sm:col-span-3">
                  <dt className="text-xs text-muted">Detalle del titular</dt>
                  <dd className="whitespace-pre-line">{solicitud.detalle || "—"}</dd>
                </div>
              </dl>

              {/* Estado + comentario interno */}
              <section className="rounded-lg border border-border p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="h-4 w-4 text-muted" />
                  Actualizar solicitud
                </h3>
                <div className="flex flex-col gap-3">
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoSolicitud)}
                    className="h-9 rounded-lg border border-border bg-surface-alt px-3 text-sm outline-none focus:border-accent"
                  >
                    {(Object.keys(ESTADO_CONFIG) as EstadoSolicitud[]).map((e) => (
                      <option key={e} value={e} className="bg-surface text-foreground">
                        {ESTADO_CONFIG[e].label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    placeholder="Comentario interno (no se envía al titular)..."
                    className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={guardar}
                    disabled={!puedeGuardar || guardando}
                    className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </section>

              {/* Aviso al titular */}
              <section className="rounded-lg border border-border p-4">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted" />
                  Avisar al titular
                </h3>
                <p className="mb-3 text-xs text-muted">
                  Le envía a {solicitud.solicitanteEmail} el estado actual (
                  {ESTADO_CONFIG[solicitud.estado].label.toLowerCase()}) y, si escribes algo, tu mensaje.
                </p>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Mensaje para el titular (opcional)..."
                  className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={avisarTitular}
                  disabled={avisando || cambiaEstado}
                  title={cambiaEstado ? "Guarda primero el cambio de estado" : undefined}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {avisando ? "Enviando..." : "Avisar al titular"}
                </button>
                {cambiaEstado && (
                  <p className="mt-2 text-xs text-warning">
                    Guarda primero el cambio de estado para avisar el estado nuevo.
                  </p>
                )}
              </section>

              {aviso && (
                <p
                  className={`rounded-md px-3 py-2 text-sm ${
                    aviso.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                  }`}
                >
                  {aviso.texto}
                </p>
              )}

              {/* Bitácora */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-muted" />
                  Bitácora
                </h3>
                {notas.length === 0 ? (
                  <p className="text-xs text-muted">Sin movimientos todavía.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {notas.map((n) => (
                      <li key={n.id} className="rounded-lg bg-surface-alt px-3 py-2 text-sm">
                        <p className="text-xs text-muted">
                          {n.userNombre} · {formatearFecha(n.creadoEn)}
                        </p>
                        {n.tipo === "estado" && n.estadoAnterior && n.estadoNuevo && (
                          <p>
                            Cambió el estado de <strong>{ESTADO_CONFIG[n.estadoAnterior].label}</strong> a{" "}
                            <strong>{ESTADO_CONFIG[n.estadoNuevo].label}</strong>
                          </p>
                        )}
                        {n.tipo === "aviso" && (
                          <p className="flex items-start gap-1.5 text-accent">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{n.comentario}</span>
                          </p>
                        )}
                        {n.tipo !== "aviso" && n.comentario && (
                          <p className="whitespace-pre-line">{n.comentario}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
