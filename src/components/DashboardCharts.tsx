"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Device } from "@/types/device";

const VERDE = "#22c55e";
const ROJO = "#ef4444";
const GRIS = "#8ea0c0";
const AZUL = "#3b82f6";

const ESTADO_COLOR: Record<string, string> = {
  Normal: VERDE,
  Alerta: ROJO,
  "Sin señal": GRIS,
};

const ESTADO_LABEL: Record<Device["estado"], string> = {
  normal: "Normal",
  alerta: "Alerta",
  sin_senal: "Sin señal",
};

function contarPor<T extends string>(devices: Device[], obtenerClave: (d: Device) => T | undefined | null) {
  const conteo = new Map<string, number>();
  for (const d of devices) {
    const clave = obtenerClave(d) || "Sin dato";
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return Array.from(conteo, ([nombre, cantidad]) => ({ nombre, cantidad }));
}

function TarjetaGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-muted">{titulo}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function DashboardCharts({ devices }: { devices: Device[] }) {
  const porEstado = useMemo(
    () => contarPor(devices, (d) => ESTADO_LABEL[d.estado]),
    [devices]
  );

  const porArea = useMemo(
    () => contarPor(devices, (d) => d.areaDetectada ?? d.area ?? d.faena),
    [devices]
  );

  const porConexion = useMemo(
    () =>
      contarPor(devices, (d) =>
        d.connectionType ? d.connectionType.charAt(0).toUpperCase() + d.connectionType.slice(1) : "Desconocido"
      ),
    [devices]
  );

  if (devices.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <TarjetaGrafico titulo="Equipos por estado">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={porEstado}
              dataKey="cantidad"
              nameKey="nombre"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {porEstado.map((entrada) => (
                <Cell key={entrada.nombre} fill={ESTADO_COLOR[entrada.nombre] ?? GRIS} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#111a2c", border: "1px solid #223251", borderRadius: 8 }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </TarjetaGrafico>

      <TarjetaGrafico titulo="Equipos por área">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porArea}>
            <CartesianGrid strokeDasharray="3 3" stroke="#223251" />
            <XAxis dataKey="nombre" stroke="#8ea0c0" fontSize={12} />
            <YAxis stroke="#8ea0c0" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#111a2c", border: "1px solid #223251", borderRadius: 8 }}
              cursor={{ fill: "#16213a" }}
            />
            <Bar dataKey="cantidad" fill={AZUL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>

      <TarjetaGrafico titulo="Equipos por tipo de conexión">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={porConexion} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#223251" />
            <XAxis type="number" stroke="#8ea0c0" fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="nombre" stroke="#8ea0c0" fontSize={12} width={80} />
            <Tooltip
              contentStyle={{ background: "#111a2c", border: "1px solid #223251", borderRadius: 8 }}
              cursor={{ fill: "#16213a" }}
            />
            <Bar dataKey="cantidad" fill={AZUL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </TarjetaGrafico>
    </div>
  );
}
