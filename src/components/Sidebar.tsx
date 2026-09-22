"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Map,
  AlertTriangle,
  Smartphone,
  FileText,
  Settings,
  Globe2,
} from "lucide-react";
import type { Role } from "@/types/user";
import { tienePermiso } from "@/lib/auth/rbac";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, permiso: "dashboard:ver" as const },
  { href: "/map", label: "Map", icon: Map, permiso: "mapa:ver" as const },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle, permiso: "alertas:ver" as const },
  { href: "/devices", label: "Devices", icon: Smartphone, permiso: "inventario:ver" as const },
  { href: "/reports", label: "Reports", icon: FileText, permiso: "reportes:ver" as const },
  { href: "/settings", label: "Settings", icon: Settings, permiso: undefined },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <Globe2 className="h-7 w-7 text-accent" />
        <span className="text-lg font-semibold">
          Geo<span className="text-accent">Flota</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {ITEMS.filter((item) => !item.permiso || tienePermiso(role, item.permiso)).map(
          (item) => {
            const activo = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  activo
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-surface-alt hover:text-foreground"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          }
        )}
      </nav>
    </aside>
  );
}
