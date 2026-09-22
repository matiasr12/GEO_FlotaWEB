"use client";

import { useState } from "react";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import type { Alert } from "@/types/alert";

export function AlertsList({
  alertasIniciales,
  puedeGestionar,
}: {
  alertasIniciales: Alert[];
  puedeGestionar: boolean;
}) {
  const [alertas, setAlertas] = useState(alertasIniciales);

  async function reconocer(id: string) {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, reconocida: true } : a)));
    await fetch(`/api/alerts/${id}/acknowledge`, { method: "POST" });
  }

  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        No hay equipos fuera del área autorizada en este momento.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alertas.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
        >
          <div>
            <p className="font-medium">
              {a.hostname}{" "}
              <span className="font-normal text-muted">· {a.custodioNombre}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {a.ultimaUbicacion.lat.toFixed(4)}, {a.ultimaUbicacion.lng.toFixed(4)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(a.ultimaUbicacion.capturedAt).toLocaleString("es-CL")}
              </span>
            </div>
          </div>

          {a.reconocida ? (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Reconocida
            </span>
          ) : puedeGestionar ? (
            <button
              onClick={() => reconocer(a.id)}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            >
              Reconocer
            </button>
          ) : (
            <span className="text-sm text-danger">Pendiente</span>
          )}
        </div>
      ))}
    </div>
  );
}
