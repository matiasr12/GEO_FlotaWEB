"use client";

import dynamic from "next/dynamic";
import type { Device } from "@/types/device";

// Leaflet toca `window` al importarse, así que el mapa se carga solo en
// el cliente (sin SSR) desde este wrapper.
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-surface-alt text-sm text-muted">
      Cargando mapa...
    </div>
  ),
});

export function MapViewClient(props: {
  devices: Device[];
  center?: [number, number];
  zoom?: number;
  altura?: string;
}) {
  return <MapView {...props} />;
}
