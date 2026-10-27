"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, LayersControl, CircleMarker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import type { Device } from "@/types/device";

// Equipo a enfocar. `vez` cambia en cada clic para poder volver a enfocar
// el mismo equipo después de mover el mapa a mano.
export interface EquipoEnfocado {
  id: string;
  vez: number;
}

const ZOOM_EQUIPO = 18;

// Vuela hasta el equipo elegido en la tabla y abre su popup.
function EnfocarEquipo({
  enfocado,
  devices,
  marcadores,
}: {
  enfocado?: EquipoEnfocado;
  devices: Device[];
  marcadores: React.RefObject<Map<string, LeafletCircleMarker>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enfocado) return;
    const ubicacion = devices.find((d) => d.id === enfocado.id)?.ubicacion;
    if (!ubicacion) return;

    map.flyTo([ubicacion.lat, ubicacion.lng], ZOOM_EQUIPO, { duration: 1.2 });
    map.once("moveend", () => marcadores.current.get(enfocado.id)?.openPopup());
    // devices queda fuera a propósito: solo se enfoca al hacer clic, no
    // cada vez que se refresca la lista de equipos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfocado, map]);

  return null;
}

const VERDE = "#22c55e";
const AMARILLO = "#eab308";
const ROJO = "#ef4444";
const GRIS = "#8ea0c0";

// Tope visual del círculo de precisión: con 100+ equipos, un radio real de
// GPS (a veces 30-50m+) tapa media faena. Se limita a un tamaño legible sin
// mover el centro, que siempre queda en la coordenada real del equipo.
const RADIO_PRECISION_MAX_METROS = 8;

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
  enfocado,
}: {
  devices: Device[];
  center?: [number, number];
  zoom?: number;
  altura?: string;
  enfocado?: EquipoEnfocado;
}) {
  const marcadores = useRef(new Map<string, LeafletCircleMarker>());

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
        style={{ height: "100%", width: "100%", background: "var(--background)" }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Calles">
            <TileLayer
              className="map-tiles-dark"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <EnfocarEquipo enfocado={enfocado} devices={conUbicacion} marcadores={marcadores} />

        {conUbicacion.map((d) => {
          // Sin señal (sin lectura reciente del daemon) = rojo, siempre —
          // esa posición ya no es confiable, aunque haya sido "dentro del
          // área" la última vez. Alerta (fuera de la geocerca, pero con
          // señal activa) = amarillo. Fuera de turno (sin señal, pero el
          // custodio no debería estar reportando) = gris, para no
          // confundirlo con una desconexión real.
          const color =
            d.estado === "sin_senal"
              ? ROJO
              : d.estado === "fuera_de_turno"
                ? GRIS
                : d.estado === "alerta"
                  ? AMARILLO
                  : VERDE;
          const { lat, lng, precisionMetros, capturedAt } = d.ubicacion!;

          return (
            <React.Fragment key={d.id}>
              {precisionMetros != null && (
                <Circle
                  center={[lat, lng]}
                  radius={Math.min(precisionMetros, RADIO_PRECISION_MAX_METROS)}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.12,
                    weight: 1,
                  }}
                />
              )}
              <CircleMarker
                ref={(m) => {
                  if (m) marcadores.current.set(d.id, m);
                  else marcadores.current.delete(d.id);
                }}
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
