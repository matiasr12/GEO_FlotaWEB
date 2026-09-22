"use client";

import { useState, type FormEvent } from "react";
import type { Device } from "@/types/device";

export function DeviceFormModal({
  device,
  onClose,
  onSaved,
}: {
  device: Device | null;
  onClose: () => void;
  onSaved: (device: Device) => void;
}) {
  const [hostname, setHostname] = useState(device?.hostname ?? "");
  const [custodioNombre, setCustodioNombre] = useState(device?.custodioNombre ?? "");
  const [turno, setTurno] = useState(device?.turno ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      const body = {
        hostname,
        custodioNombre,
        custodioId: device?.custodioId ?? custodioNombre.toLowerCase().replace(/\s+/g, "-"),
        turno: turno || undefined,
      };

      const res = await fetch(device ? `/api/devices/${device.id}` : "/api/devices", {
        method: device ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        return;
      }

      onSaved(await res.json());
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {device ? "Editar equipo" : "Agregar equipo"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted">Hostname</label>
            <input
              required
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">Persona responsable</label>
            <input
              required
              value={custodioNombre}
              onChange={(e) => setCustodioNombre(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">Turno (opcional)</label>
            <input
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-alt"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
