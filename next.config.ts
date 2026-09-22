import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce un server.js autocontenido con solo las dependencias que
  // realmente usa en runtime (Next hace el tree-shaking de node_modules).
  // Así Azure no necesita reinstalar 450 paquetes en cada despliegue —
  // solo copia y corre lo que ya viene armado desde GitHub Actions.
  output: "standalone",
};

export default nextConfig;
