"use client";

import { useState } from "react";
import { MapPin, Clock, CheckCircle2, History, Send } from "lucide-react";
import type { Alert, AccionAlerta, EstadoAlerta } from "@/types/alert";

const ESTADO_CONFIG: Record<EstadoAlerta, { label: string; className: string }> = {
  abierta: { label: "ABIERTA", className: "bg-danger/15 text-danger" },
  revisada: { label: "REVISADA", className: "bg-warning/15 text-warning" },
  cerrada: { label: "CERRADA", className: "bg-muted/20 text-muted" },
};

function formatearDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function AlertsList({
  alertasIniciales,
  puedeGestionar,
}: {
  alertasIniciales: Alert[];
  puedeGestionar: boolean;
}) {
  const [alertas, setAlertas] = useState(alertasIniciales);
  const [filtro, setFiltro] = useState<EstadoAlerta | "todas">("todas");

  async function reconocer(id: number, comentario: string) {
    const res = await fetch(`/api/alerts/${id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario: comentario || undefined }),
    });
    if (res.ok) {
      setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, estado: "revisada" } : a)));
    }
    return res.ok;
  }

  async function comentar(id: number, comentario: string) {
    const res = await fetch(`/api/alerts/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario }),
    });
    return res.ok;
  }

  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        No hay alertas registradas en este momento.
      </div>
    );
  }

  const visibles = filtro === "todas" ? alertas : alertas.filter((a) => a.estado === filtro);
  const opciones: { valor: EstadoAlerta | "todas"; label: string; activo: string }[] = [
    { valor: "todas", label: "Todas", activo: "bg-accent/15 text-accent border-accent/40" },
    { valor: "abierta", label: "Abiertas", activo: `${ESTADO_CONFIG.abierta.className} border-danger/40` },
    { valor: "revisada", label: "Revisadas", activo: `${ESTADO_CONFIG.revisada.className} border-warning/40` },
    { valor: "cerrada", label: "Cerradas", activo: `${ESTADO_CONFIG.cerrada.className} border-muted/40` },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const cantidad =
            o.valor === "todas" ? alertas.length : alertas.filter((a) => a.estado === o.valor).length;
          const seleccionado = filtro === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={seleccionado}
              onClick={() => setFiltro(o.valor)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                seleccionado ? o.activo : "border-border text-muted hover:text-foreground"
              }`}
            >
              {o.label} <span className="opacity-70">({cantidad})</span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No hay alertas con este estado.
        </div>
      ) : (
        visibles.map((a) => (
          <AlertCard
            key={a.id}
            alerta={a}
            puedeGestionar={puedeGestionar}
            onReconocer={reconocer}
            onComentar={comentar}
          />
        ))
      )}
    </div>
  );
}

function AlertCard({
  alerta: a,
  puedeGestionar,
  onReconocer,
  onComentar,
}: {
  alerta: Alert;
  puedeGestionar: boolean;
  onReconocer: (id: number, comentario: string) => Promise<boolean>;
  onComentar: (id: number, comentario: string) => Promise<boolean>;
}) {
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarComentario, setMostrarComentario] = useState(false);
  const [bitacora, setBitacora] = useState<AccionAlerta[] | null>(null);
  const [cargandoBitacora, setCargandoBitacora] = useState(false);
  const estadoCfg = ESTADO_CONFIG[a.estado];

  async function manejarReconocer() {
    setEnviando(true);
    try {
      await onReconocer(a.id, comentario);
      setComentario("");
      setMostrarComentario(false);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarComentar() {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      const ok = await onComentar(a.id, comentario);
      if (ok) {
        setComentario("");
        setMostrarComentario(false);
        if (bitacora) await cargarBitacora();
      }
    } finally {
      setEnviando(false);
    }
  }

  async function cargarBitacora() {
    setCargandoBitacora(true);
    try {
      const res = await fetch(`/api/alerts/${a.id}/acciones`);
      if (res.ok) setBitacora(await res.json());
    } finally {
      setCargandoBitacora(false);
    }
  }

  async function alternarBitacora() {
    if (bitacora === null) await cargarBitacora();
    else setBitacora(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {a.hostname} <span className="font-normal text-muted">· {a.custodioNombre}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {a.ubicacion
                ? `${a.ubicacion.lat.toFixed(4)}, ${a.ubicacion.lng.toFixed(4)}`
                : (a.area ?? a.faena ?? "Área desconocida")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(a.fechaInicio).toLocaleString("es-CL")} · {formatearDuracion(a.duracionMinutos)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoCfg.className}`}>
            {estadoCfg.label}
          </span>
          {a.estado === "abierta" && puedeGestionar && (
            <button
              onClick={manejarReconocer}
              disabled={enviando}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Reconocer
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        {puedeGestionar && (
          <button
            onClick={() => setMostrarComentario((v) => !v)}
            className="text-accent hover:underline"
          >
            {mostrarComentario ? "Cancelar" : "Agregar comentario"}
          </button>
        )}
        <button onClick={alternarBitacora} className="flex items-center gap-1 text-muted hover:text-foreground">
          <History className="h-3.5 w-3.5" />
          {bitacora === null ? "Ver bitácora" : "Ocultar bitácora"}
        </button>
      </div>

      {mostrarComentario && puedeGestionar && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={a.estado === "abierta" ? "Comentario al reconocer (opcional)..." : "Nuevo comentario..."}
            maxLength={1000}
            className="w-full rounded-md border border-border bg-surface-alt px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {a.estado !== "abierta" && (
            <button
              onClick={manejarComentar}
              disabled={enviando || !comentario.trim()}
              className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar
            </button>
          )}
        </div>
      )}

      {cargandoBitacora && <p className="mt-2 text-xs text-muted">Cargando bitácora...</p>}

      {bitacora !== null && !cargandoBitacora && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {bitacora.length === 0 ? (
            <p className="text-xs text-muted">Sin acciones registradas todavía.</p>
          ) : (
            bitacora.map((acc) => (
              <div key={acc.id} className="text-xs text-muted">
                <span className="font-medium text-foreground">{acc.usuarioNombre ?? "Usuario"}</span>{" "}
                {acc.estadoNuevo
                  ? `cambió el estado de ${acc.estadoAnterior} a ${acc.estadoNuevo}`
                  : "dejó un comentario"}{" "}
                · {new Date(acc.fecha).toLocaleString("es-CL")}
                {acc.comentario && <p className="mt-0.5 text-foreground">“{acc.comentario}”</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
