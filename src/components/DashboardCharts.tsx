"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  type TooltipContentProps,
} from "recharts";
import type { Device, DeviceStatus } from "@/types/device";

const VERDE = "#22c55e";
const ROJO = "#ef4444";
const GRIS = "#8ea0c0";
const AZUL = "#3b82f6";
const SUPERFICIE = "#111a2c";
const GRILLA = "#223251";

const ESTADO_COLOR: Record<DeviceStatus, string> = {
  normal: VERDE,
  alerta: ROJO,
  sin_senal: GRIS,
};

const ESTADO_LABEL: Record<DeviceStatus, string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
};

// Alto por fila de barra + aire para los ejes, nunca una altura fija que
// recorte las etiquetas del eje.
function altoGrafico(filas: number) {
  return Math.max(140, filas * 44 + 40);
}

interface FilaArea {
  area: string;
  normal: number;
  alerta: number;
  sin_senal: number;
  total: number;
}

function agruparPorAreaYEstado(devices: Device[]): FilaArea[] {
  const mapa = new Map<string, FilaArea>();
  for (const d of devices) {
    const area = d.areaDetectada ?? d.area ?? d.faena ?? "Sin área";
    const fila = mapa.get(area) ?? { area, normal: 0, alerta: 0, sin_senal: 0, total: 0 };
    fila[d.estado] += 1;
    fila.total += 1;
    mapa.set(area, fila);
  }
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

interface FilaConexion {
  nombre: string;
  cantidad: number;
}

function agruparPorConexion(devices: Device[]): FilaConexion[] {
  const mapa = new Map<string, number>();
  for (const d of devices) {
    const nombre = d.connectionType
      ? d.connectionType.charAt(0).toUpperCase() + d.connectionType.slice(1)
      : "Desconocido";
    mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1);
  }
  return Array.from(mapa, ([nombre, cantidad]) => ({ nombre, cantidad })).sort(
    (a, b) => b.cantidad - a.cantidad
  );
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

function TooltipEstadoPorArea({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const filas = payload.filter((p) => typeof p.value === "number" && p.value > 0);
  if (filas.length === 0) return null;

  return (
    <CajaTooltip>
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {filas.map((p) => (
          <div key={p.dataKey as string} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-3 shrink-0" style={{ backgroundColor: p.color }} />
            <span className="font-semibold text-foreground">{p.value}</span>
            <span className="text-muted">{ESTADO_LABEL[p.dataKey as DeviceStatus]}</span>
          </div>
        ))}
      </div>
    </CajaTooltip>
  );
}

function TooltipConexion({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <CajaTooltip>
      <span className="font-semibold text-foreground">{payload[0].value}</span>{" "}
      <span className="text-muted">{label}</span>
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
  const porAreaYEstado = useMemo(() => agruparPorAreaYEstado(devices), [devices]);
  const porConexion = useMemo(() => agruparPorConexion(devices), [devices]);

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
        El filtro no encontró equipos para graficar.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <TarjetaGrafico titulo="Estado de la flota por área">
        <ResponsiveContainer width="100%" height={altoGrafico(porAreaYEstado.length)}>
          <BarChart
            data={porAreaYEstado}
            layout="vertical"
            barCategoryGap={10}
            margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" stroke={GRIS} fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="area"
              stroke={GRIS}
              fontSize={12}
              width={110}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TooltipEstadoPorArea} cursor={{ fill: SUPERFICIE }} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-muted">{ESTADO_LABEL[value as DeviceStatus]}</span>
              )}
            />
            <Bar dataKey="normal" stackId="estado" fill={ESTADO_COLOR.normal} barSize={20} stroke={SUPERFICIE} strokeWidth={2} />
            <Bar dataKey="alerta" stackId="estado" fill={ESTADO_COLOR.alerta} barSize={20} stroke={SUPERFICIE} strokeWidth={2} />
            <Bar
              dataKey="sin_senal"
              stackId="estado"
              fill={ESTADO_COLOR.sin_senal}
              barSize={20}
              stroke={SUPERFICIE}
              strokeWidth={2}
              radius={[0, 4, 4, 0]}
            >
              <LabelList dataKey="total" position="right" fill="#8ea0c0" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>

      <TarjetaGrafico titulo="Equipos por tipo de conexión">
        <ResponsiveContainer width="100%" height={altoGrafico(porConexion.length)}>
          <BarChart
            data={porConexion}
            layout="vertical"
            barCategoryGap={10}
            margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRILLA} />
            <XAxis type="number" stroke={GRIS} fontSize={12} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="nombre"
              stroke={GRIS}
              fontSize={12}
              width={90}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TooltipConexion} cursor={{ fill: SUPERFICIE }} />
            <Bar dataKey="cantidad" fill={AZUL} barSize={20} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="cantidad" position="right" fill="#8ea0c0" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>
    </div>
  );
}
