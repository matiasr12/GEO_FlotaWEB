import type { Device } from "@/types/device";
import type { Alert } from "@/types/alert";

// Dataset simulado, usado solo mientras el backend real está caído/incompleto.
//
// Centro = planta industrial de Minera Caserones (confirmado: 28°10'8.56"S
// 69°32'1.06"W, Región de Atacama). El campamento Carrizalillo Grande está
// ~40 km de ahí, camino a Copiapó por la ruta C-401/C-503, pero no se
// encontró su coordenada exacta publicada — reemplazar CAMPAMENTO abajo
// por el dato real (GPS del propio campamento o del daemon) apenas se
// tenga, y agregarlo como un segundo punto de referencia en el mapa.
const CENTRO_FAENA = { lat: -28.169, lng: -69.5336 };

const NOMBRES = [
  "Juan Pérez",
  "María Gómez",
  "Carlos López",
  "Ana Díaz",
  "Pedro Rojas",
  "Camila Soto",
  "Diego Fuentes",
  "Valentina Muñoz",
  "Sebastián Torres",
  "Francisca Vargas",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

let cache: Device[] | null = null;

export function getMockDevices(): Device[] {
  if (cache) return cache;

  const rand = seededRandom(42);
  const total = 450;
  const devices: Device[] = [];

  for (let i = 0; i < total; i++) {
    const num = 985 + i;
    // ±0.02° ≈ ±2.2 km: dispersión acotada al tamaño real de la faena
    // (rajo + planta + caminos), no a toda la región.
    const jitterLat = (rand() - 0.5) * 0.04;
    const jitterLng = (rand() - 0.5) * 0.04;
    const sinSenal = rand() < 0.018; // ~8 equipos sin señal reciente

    devices.push({
      id: `dev-${num}`,
      hostname: `CLMLCCLT${String(num).padStart(6, "0")}`,
      custodioNombre: NOMBRES[i % NOMBRES.length],
      custodioId: `custodio-${i % NOMBRES.length}`,
      ubicacion: sinSenal
        ? null
        : {
            lat: CENTRO_FAENA.lat + jitterLat,
            lng: CENTRO_FAENA.lng + jitterLng,
            capturedAt: new Date(Date.now() - rand() * 3600_000).toISOString(),
          },
      estado: sinSenal ? "sin_senal" : "normal",
      dentroDeArea: true,
    });
  }

  // Caso destacado: un equipo crítico fuera del área autorizada, ~6 km al
  // noroeste del centro de la faena (dirección de la ruta de acceso hacia
  // Copiapó/Carrizalillo Grande) — lo bastante cerca para verse en el mapa
  // del dashboard junto a los equipos normales, como en la maqueta.
  devices[5] = {
    ...devices[5],
    hostname: "CLMLCCLT000990",
    custodioNombre: "Juan Pérez",
    custodioId: "custodio-juan-perez",
    ubicacion: {
      lat: CENTRO_FAENA.lat + 0.045,
      lng: CENTRO_FAENA.lng - 0.07,
      capturedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    },
    estado: "alerta",
    dentroDeArea: false,
  };

  cache = devices;
  return devices;
}

export function actualizarMockDevice(id: string, cambios: Partial<Device>): Device | null {
  const devices = getMockDevices();
  const idx = devices.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  devices[idx] = { ...devices[idx], ...cambios };
  return devices[idx];
}

export function crearMockDevice(input: {
  hostname: string;
  custodioNombre: string;
  custodioId: string;
  turno?: string;
}): Device {
  const devices = getMockDevices();
  const nuevo: Device = {
    id: `dev-${crypto.randomUUID()}`,
    hostname: input.hostname,
    custodioNombre: input.custodioNombre,
    custodioId: input.custodioId,
    turno: input.turno,
    ubicacion: null,
    estado: "sin_senal",
    dentroDeArea: true,
  };
  devices.unshift(nuevo);
  return nuevo;
}

export function getMockAlerts(): Alert[] {
  const devices = getMockDevices();
  return devices
    .filter((d) => d.estado === "alerta" && d.ubicacion)
    .map((d) => ({
      id: `alert-${d.id}`,
      deviceId: d.id,
      hostname: d.hostname,
      custodioNombre: d.custodioNombre,
      ultimaUbicacion: {
        lat: d.ubicacion!.lat,
        lng: d.ubicacion!.lng,
        capturedAt: d.ubicacion!.capturedAt,
      },
      detectadaEn: d.ubicacion!.capturedAt,
      reconocida: false,
    }));
}
