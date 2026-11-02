// Texto citado en el detalle de auditoría: "…" recortado para que un
// comentario largo no llene la tabla (el texto completo queda en su propia
// bitácora: comentarios de alerta, de solicitud, etc.).
export function citar(texto: string | undefined | null, max = 160): string {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  return `"${limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio}"`;
}
