import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/tema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoFlota",
  description: "Seguimiento de ubicación de equipos en terreno",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // El script de abajo puede poner data-theme="light" antes de hidratar.
      suppressHydrationWarning
    >
      <head>
        {/* El panel ya trae modo claro y oscuro propios: que el navegador
            (modo oscuro automático de Chrome/Edge) y extensiones como
            Dark Reader no le cambien los colores. */}
        <meta name="color-scheme" content="dark light" />
        <meta name="darkreader-lock" />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
