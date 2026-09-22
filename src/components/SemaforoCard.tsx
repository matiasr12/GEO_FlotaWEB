import { AlertTriangle, ShieldCheck } from "lucide-react";

export function SemaforoCard({ hayAlertas }: { hayAlertas: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-muted">Semáforo de Seguridad</h3>

      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full ${
            hayAlertas
              ? "bg-danger/20 ring-8 ring-danger/10"
              : "bg-success/20 ring-8 ring-success/10"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              hayAlertas ? "bg-danger" : "bg-success"
            }`}
          >
            {hayAlertas ? (
              <AlertTriangle className="h-7 w-7 text-white" />
            ) : (
              <ShieldCheck className="h-7 w-7 text-white" />
            )}
          </div>
        </div>

        <p
          className={`flex items-center gap-1.5 text-sm font-semibold ${
            hayAlertas ? "text-danger" : "text-success"
          }`}
        >
          {hayAlertas ? "⚠ ALERTA DETECTADA" : "Todo dentro de rango"}
        </p>
      </div>
    </div>
  );
}
