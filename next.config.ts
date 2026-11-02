import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce un server.js autocontenido con solo las dependencias que
  // realmente usa en runtime (Next hace el tree-shaking de node_modules).
  // Así Azure no necesita reinstalar 450 paquetes en cada despliegue —
  // solo copia y corre lo que ya viene armado desde GitHub Actions.
  output: "standalone",

  // pdfkit lee sus fuentes (.afm) desde su propia carpeta en tiempo de
  // ejecución: no se empaqueta y esas fuentes se copian al build standalone
  // que sube GitHub Actions a Azure (reportes PDF de equipos y auditoría).
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reportes/*": ["./node_modules/pdfkit/js/data/**/*"],
  },

  // Headers de seguridad para todas las respuestas. frame-ancestors /
  // X-Frame-Options impiden que otro sitio meta el panel en un iframe
  // para engañar clics (clickjacking).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
