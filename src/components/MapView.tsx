"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { Device } from "@/types/device";

const COLOR: Record<Device["estado"], string> = {
  normal: "#22c55e",
  alerta: "#ef4444",
  sin_senal: "#8ea0c0",
};

export function MapView({
  devices,
  center,
  zoom = 13,
  altura = "100%",
}: {
  devices: Device[];
  center: [number, number];
  zoom?: number;
  altura?: string;
}) {
  const conUbicacion = devices.filter((d) => d.ubicacion);

  return (
    <div style={{ height: altura }} className="overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
      >
        <TileLayer
          className="map-tiles-dark"
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {conUbicacion.map((d) => (
          <CircleMarker
            key={d.id}
            center={[d.ubicacion!.lat, d.ubicacion!.lng]}
            radius={d.estado === "alerta" ? 12 : 8}
            pathOptions={{
              color: COLOR[d.estado],
              fillColor: COLOR[d.estado],
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {d.hostname}
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{d.hostname}</p>
                <p>Custodio: {d.custodioNombre}</p>
                <p>
                  {d.ubicacion!.lat.toFixed(4)}, {d.ubicacion!.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
