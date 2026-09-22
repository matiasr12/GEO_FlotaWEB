export type DeviceStatus = "normal" | "alerta" | "sin_senal";

export interface DevicePosition {
  lat: number;
  lng: number;
  capturedAt: string; // ISO timestamp de cuando el daemon tomó la lectura
  precisionMetros?: number | null;
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
  // Campos reales del backend (GET /api/equipos), no todos tienen
  // equivalente en la maqueta original — se muestran cuando existen.
  faena?: string | null;
  area?: string | null;
  areaDetectada?: string | null;
  connectionType?: "wifi" | "ethernet" | "movil" | null;
  ip?: string | null;
  ultimaTelemetria?: string | null; // receivedAt del backend
}

// Forma real de un elemento de GET /api/equipos (ver db.js:207-255 del backend).
export interface EquipoApiDTO {
  equipoId: number;
  codigoActivo: string;
  computerName: string;
  rut: string | null;
  personalNombre: string | null;
  personalApellido: string | null;
  area: string | null;
  faena: string | null;
  bssids: string[];
  ip: string | null;
  connectionType: "wifi" | "ethernet" | "movil" | null;
  recordTimestamp: string;
  receivedAt: string;
  areaDetectada: string | null;
  alerta: boolean;
  latitud: number | null;
  longitud: number | null;
  precisionMetros: number | null;
}

export interface DeviceInput {
  hostname: string;
  custodioNombre: string;
  custodioId: string;
  turno?: string;
}
