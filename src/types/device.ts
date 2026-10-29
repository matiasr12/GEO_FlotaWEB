export type DeviceStatus = "normal" | "alerta" | "sin_senal" | "fuera_de_turno";

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
  turno?: string | null;
  // Campos reales del backend (GET /api/equipos), no todos tienen
  // equivalente en la maqueta original — se muestran cuando existen.
  codigoActivo?: string | null;
  faena?: string | null;
  area?: string | null;
  areaDetectada?: string | null;
  connectionType?: "wifi" | "ethernet" | "movil" | null;
  ip?: string | null;
  ultimaTelemetria?: string | null; // receivedAt del backend
  // Nota libre del supervisor/admin (ej. "pantalla con fallas"), guardada en
  // la base propia del panel — no viene del daemon. Ver lib/device-comments.ts.
  comentario?: string | null;
  // Contacto del trabajador, desde dbo.Personal (cruce por RUT). Ver
  // lib/personal.ts.
  correo?: string | null;
  telefono?: string | null;
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
  turno: string | null;
  enTurno: boolean | null;
}

export interface DeviceInput {
  hostname: string;
  custodioNombre: string;
  custodioId: string;
  turno?: string;
}
