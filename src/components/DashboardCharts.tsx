"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";
import type { Device } from "@/types/device";

// Mismos colores que MapView.tsx/StatusBadge.tsx a propósito — un equipo
// debe leerse igual en todo el panel.
const VERDE = "#22c55e";
const ROJO = "#ef4444";
const GRIS = "#8ea0c0";
const AZUL = "#3b82f6";
const SUPERFICIE = "#111a2c";
const GRILLA = "#223251";

// Alto por fila de barra + aire para los ejes, nunca una altura fija que
// recorte las etiquetas del eje.
function altoGrafico(filas: number) {
  return Math.max(140, filas * 44 + 40);
}

interface FilaSector {
  sector: string;
  cantidad: number;
}

function agruparPorSector(devices: Device[]): FilaSector[] {
  const mapa = new Map<string, number>();
  for (const d of devices) {
    const sector = d.areaDetectada ?? d.area ?? d.faena ?? "Sin sector";
    mapa.set(sector, (mapa.get(sector) ?? 0) + 1);
  }
  return Array.from(mapa, ([sector, cantidad]) => ({ sector, cantidad })).sort(
    (a, b) => b.cantidad - a.cantidad
  );
}

// "Activo" = tiene señal ahora mismo (normal o alerta). "Desactivado" = no
// está reportando (sin señal o fuera de turno) — no hay un flag de
// habilitado/deshabilitado en el modelo, así que se usa la señal como proxy.
function calcularActivosDesactivados(devices: Device[]) {
  let activos = 0;
  let desactivados = 0;
  for (const d of devices) {
    if (d.estado === "normal" || d.estado === "alerta") activos += 1;
    else desactivados += 1;
  }
  return [
    { nombre: "Activos", cantidad: activos, color: VERDE },
    { nombre: "Desactivados", cantidad: desactivados, color: GRIS },
  ];
}

const BUCKETS_OFFLINE = [
  { etiqueta: "Menos de 24 horas", maxHoras: 24 },
  { etiqueta: "1-3 días", maxHoras: 72 },
  { etiqueta: "1 semana", maxHoras: 168 },
  { etiqueta: "1 mes", maxHoras: 720 },
  { etiqueta: "Más de 1 mes", maxHoras: Infinity },
];

interface FilaOffline {
  bucket: string;
  cantidad: number;
}

// Solo equipos que hoy no están reportando (sin señal o fuera de turno),
// agrupados por cuánto tiempo lleva su última telemetría.
function agruparOfflinePorTiempo(devices: Device[]): FilaOffline[] {
  const conteo = new Map(BUCKETS_OFFLINE.map((b) => [b.etiqueta, 0]));

  for (const d of devices) {
    if (d.estado !== "sin_senal" && d.estado !== "fuera_de_turno") continue;

    const ultima = d.ultimaTelemetria ? new Date(d.ultimaTelemetria).getTime() : NaN;
    const horas = Number.isNaN(ultima) ? Infinity : (Date.now() - ultima) / 3_600_000;
    const bucket = BUCKETS_OFFLINE.find((b) => horas < b.maxHoras) ?? BUCKETS_OFFLINE.at(-1)!;
    conteo.set(bucket.etiqueta, (conteo.get(bucket.etiqueta) ?? 0) + 1);
  }

  return BUCKETS_OFFLINE.map((b) => ({ bucket: b.etiqueta, cantidad: conteo.get(b.etiqueta) ?? 0 }));
}

function CajaTooltip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ background: "#16213a", borderColor: GRILLA }}
    >
      {children}
    </div>
  );
}

function TooltipSimple({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <CajaTooltip>
      <span className="font-semibold text-foreground">{payload[0].value}</span>{" "}
      <span className="text-muted">{label}</span>
    </CajaTooltip>
  );
}

function TooltipActivos({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <CajaTooltip>
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{" "}
      <span className="font-semibold text-foreground">{p.value}</span>{" "}
      <span className="text-muted">{p.name}</span>
    </CajaTooltip>
  );
}

function TarjetaGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-muted">{titulo}</h3>
      {children}
    </div>
  );
}

export function DashboardCharts({ devices }: { devices: Device[] }) {
  const porSector = useMemo(() => agruparPorSector(devices), [devices]);
  const activosDesactivados = useMemo(() => calcularActivosDesactivados(devices), [devices]);
  const offlinePorTiempo = useMemo(() => agruparOfflinePorTiempo(devices), [devices]);
  const totalActivosDesactivados = activosDesactivados.reduce((acc, f) => acc + f.cantidad, 0);
  const porcentajeActivos =
    totalActivosDesactivados === 0
      ? 0
      : Math.round((activosDesactivados[0].cantidad / totalActivosDesactivados) * 100);

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        El filtro no encontró equipos para graficar.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TarjetaGrafico titulo="Equipos distribuidos por sector">
        <ResponsiveContainer width="100%" height={altoGrafico(porSector.length)}>
          <BarChart
            data={porSector}
            layout="vertical"
            barCategoryGap={10}
            margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" stroke={GRIS} fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="sector"
              stroke={GRIS}
              fontSize={12}
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TooltipSimple} cursor={{ fill: SUPERFICIE }} />
            <Bar dataKey="cantidad" fill={AZUL} barSize={20} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="cantidad" position="right" fill={GRIS} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>

      <TarjetaGrafico titulo="Equipos activos y desactivados">
        <div className="relative" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activosDesactivados}
                dataKey="cantidad"
                nameKey="nombre"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                stroke={SUPERFICIE}
                strokeWidth={2}
              >
                {activosDesactivados.map((f) => (
                  <Cell key={f.nombre} fill={f.color} />
                ))}
              </Pie>
              <Tooltip content={TooltipActivos} />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => <span className="text-xs text-muted">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
            <p className="text-2xl font-semibold text-foreground">{porcentajeActivos}%</p>
            <p className="text-xs text-muted">activos</p>
          </div>
        </div>
      </TarjetaGrafico>

      <TarjetaGrafico titulo="Equipos offline por tiempo sin reportar">
        <ResponsiveContainer width="100%" height={altoGrafico(offlinePorTiempo.length)}>
          <BarChart
            data={offlinePorTiempo}
            layout="vertical"
            barCategoryGap={10}
            margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" stroke={GRIS} fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="bucket"
              stroke={GRIS}
              fontSize={12}
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TooltipSimple} cursor={{ fill: SUPERFICIE }} />
            <Bar dataKey="cantidad" fill={ROJO} barSize={20} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="cantidad" position="right" fill={GRIS} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>
    </div>
  );
}
