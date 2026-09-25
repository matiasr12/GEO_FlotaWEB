"use client";

import React from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip } from "react-leaflet";
import type { Device } from "@/types/device";

const VERDE = "#22c55e";
const ROJO = "#ef4444";

// Fallback cuando todavía no hay ningún equipo con coordenadas válidas.
const CENTRO_ATACAMA: [number, number] = [-27.37, -70.33];

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function calcularCentro(devices: Device[]): [number, number] {
  const conUbicacion = devices.filter((d) => d.ubicacion);
  if (conUbicacion.length === 0) return CENTRO_ATACAMA;

  const suma = conUbicacion.reduce(
    (acc, d) => ({
      lat: acc.lat + d.ubicacion!.lat,
      lng: acc.lng + d.ubicacion!.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return [suma.lat / conUbicacion.length, suma.lng / conUbicacion.length];
}

export function MapView({
  devices,
  center,
  zoom = 13,
  altura = "100%",
}: {
  devices: Device[];
  center?: [number, number];
  zoom?: number;
  altura?: string;
}) {
  // Nunca se dibuja un marcador para un equipo sin latitud/longitud real
  // — no hay forma honesta de "inventar" dónde está.
  const conUbicacion = devices.filter((d) => d.ubicacion);
  const centroMapa = center ?? calcularCentro(devices);

  return (
    <div style={{ height: altura }} className="overflow-hidden rounded-xl">
      <MapContainer
        center={centroMapa}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
      >
        <TileLayer
          className="map-tiles-dark"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {conUbicacion.map((d) => {
          const color = d.dentroDeArea ? VERDE : ROJO;
          const { lat, lng, precisionMetros, capturedAt } = d.ubicacion!;

          return (
            <React.Fragment key={d.id}>
              {precisionMetros != null && (
                <Circle
                  center={[lat, lng]}
                  radius={precisionMetros}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.12,
                    weight: 1,
                  }}
                />
              )}
              <CircleMarker
                center={[lat, lng]}
                radius={d.dentroDeArea ? 8 : 12}
                pathOptions={{
                  color,
                  fillColor: color,
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
                    <p>{d.custodioNombre}</p>
                    <p>Área: {d.area ?? "—"}</p>
                    <p>Faena: {d.faena ?? "—"}</p>
                    <p className="text-xs text-muted">{formatearFecha(capturedAt)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
