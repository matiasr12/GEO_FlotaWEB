export interface Alert {
  id: string;
  deviceId: string;
  hostname: string;
  custodioNombre: string;
  // La API real no entrega coordenadas por equipo, solo nombres de área.
  ultimaUbicacion: {
    lat: number;
    lng: number;
    capturedAt: string;
  } | null;
  area?: string | null;
  areaDetectada?: string | null;
  detectadaEn: string; // ISO timestamp
  turno?: string;
  reconocida: boolean;
}
