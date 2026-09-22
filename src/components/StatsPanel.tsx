import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

export function StatsPanel({
  total,
  activos,
  alertas,
}: {
  total: number;
  activos: number;
  alertas: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <dl className="divide-y divide-border">
        <Fila label="Total Devices" valor={total} tendencia />
        <Fila label="Active" valor={activos} tendencia />
        <Fila label="Alerts" valor={alertas} href="/alerts" />
      </dl>
    </div>
  );
}

function Fila({
  label,
  valor,
  tendencia,
  href,
}: {
  label: string;
  valor: number;
  tendencia?: boolean;
  href?: string;
}) {
  const contenido = (
    <>
      <dt className="text-sm text-muted">{label}:</dt>
      <dd className="flex items-center gap-1.5 text-sm font-semibold">
        {valor}
        {tendencia && <ArrowUpRight className="h-3.5 w-3.5 text-success" />}
        {href && <ChevronRight className="h-3.5 w-3.5 text-muted" />}
      </dd>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
        {contenido}
      </Link>
    );
  }

  return <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">{contenido}</div>;
}
