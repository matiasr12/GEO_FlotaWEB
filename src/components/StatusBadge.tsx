import { CheckCircle2, XCircle, WifiOff } from "lucide-react";
import type { DeviceStatus } from "@/types/device";

const CONFIG: Record<DeviceStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  normal: {
    label: "NORMAL",
    className: "bg-success/15 text-success",
    icon: CheckCircle2,
  },
  alerta: {
    label: "CRÍTICO",
    className: "bg-danger/15 text-danger",
    icon: XCircle,
  },
  sin_senal: {
    label: "SIN SEÑAL",
    className: "bg-muted/20 text-muted",
    icon: WifiOff,
  },
};

export function StatusBadge({ estado }: { estado: DeviceStatus }) {
  const { label, className, icon: Icon } = CONFIG[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
