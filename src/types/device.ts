export type DeviceStatus = "normal" | "alerta" | "sin_senal";

export interface DevicePosition {
  lat: number;
  lng: number;
  capturedAt: string; // ISO timestamp de cuando el daemon tomó la lectura
}

export interface Device {
  id: string;
  hostname: string;
  custodioNombre: string;
  custodioId: string;
  ubicacion: DevicePosition | null;
  estado: DeviceStatus;
  dentroDeArea: boolean;
  turno?: string;
}

export interface DeviceInput {
  hostname: string;
  custodioNombre: string;
  custodioId: string;
  turno?: string;
}
