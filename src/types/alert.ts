export interface Alert {
  id: string;
  deviceId: string;
  hostname: string;
  custodioNombre: string;
  ultimaUbicacion: {
    lat: number;
    lng: number;
    capturedAt: string;
  };
  detectadaEn: string; // ISO timestamp
  turno?: string;
  reconocida: boolean;
}
