export type EstadoAlerta = "abierta" | "revisada" | "cerrada";

// Fila de dbo.Alertas, que el BACKEND abre/cierra solo (geocerca real).
// El panel nunca crea ni cierra una alerta — solo lee, reconoce (abierta ->
// revisada) y deja comentarios.
export interface Alert {
  id: number; // Alertas.Id real en Azure SQL (o un hash estable en modo mock)
  equipoId: string;
  hostname: string;
  custodioNombre: string;
  area: string | null;
  faena: string | null;
  estado: EstadoAlerta;
  ubicacion: { lat: number; lng: number } | null; // de DeviceRecordId
  fechaInicio: string; // ISO
  fechaCierre: string | null; // ISO, solo si estado = "cerrada"
  duracionMinutos: number; // fechaCierre - fechaInicio, o ahora - fechaInicio si sigue abierta
}

// Fila de dbo.AccionesAlerta — bitácora de solo-inserción (trigger bloquea
// UPDATE/DELETE), igual que AuditLog.
export interface AccionAlerta {
  id: number;
  alertaId: number;
  usuarioId: string;
  usuarioNombre: string | null;
  estadoAnterior: EstadoAlerta;
  estadoNuevo: EstadoAlerta | null; // null = solo comentario, sin cambio de estado
  comentario: string | null;
  fecha: string; // ISO
}
