# GeoFlota — Panel de administración

Panel web para supervisar la ubicación en terreno de notebooks corporativos
de una faena minera, reemplazando el registro manual en Excel. Un daemon
externo (ya existente) envía las lecturas de posición al backend; este
panel solo las consume y las presenta a supervisores/administradores/auditoría.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Leaflet / react-leaflet para el mapa
- Autenticación propia de usuarios del panel (JWT en cookie httpOnly), con
  RBAC de 3 roles: `admin`, `supervisor`, `auditor` (ver `src/lib/auth/rbac.ts`)
- Azure SQL para usuarios, log de auditoría y solicitudes de titulares de
  datos (opcional mientras no se corran las migraciones — ver abajo)

## Primer arranque

```bash
npm install
npm run dev
```

Se abre en **https://localhost:3000** (HTTPS local vía
`--experimental-https`, certificado autofirmado — el navegador va a pedir
que aceptes la excepción de seguridad la primera vez). El requisito de
"siempre HTTPS, incluso en local" viene dado así por defecto.

Usuarios de prueba (definidos en `src/lib/auth/users.ts`, solo activos
mientras no haya `AZURE_SQL_*` configurado en `.env.local`):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@geoflota.cl | admin123 |
| Supervisor de turno | supervisor@geoflota.cl | supervisor123 |
| Encargado de auditoría | auditor@geoflota.cl | auditor123 |

## Estado del backend real (2026-09-16)

Al probar `DAEMON_API_BASE_URL` el Web App de Azure respondió
**HTTP 403 "This web app is stopped"**. Por eso `.env.local` trae
`USE_MOCK_DATA=true`: el panel funciona con un dataset simulado de 450
equipos (`src/lib/mock-data.ts`) hasta que:

1. El Web App esté corriendo, y
2. Exista un endpoint tipo `GET /api/devices` que devuelva la última
   posición conocida de cada equipo (hoy el backend solo parece recibir
   lecturas del daemon, no listarlas — confirmar el contrato real antes
   de apagar el modo mock).

Cuando eso esté listo, poner `USE_MOCK_DATA=false` y ajustar
`src/lib/daemon-api.ts` al formato real de la respuesta.

## Aviso sobre el fallback de auditoría en memoria

Al probar el flujo completo se confirmó que el log de auditoría en memoria
(`src/lib/audit.ts`, usado solo cuando `AZURE_SQL_*` no está configurado)
**no comparte estado de forma confiable entre distintas rutas** — Next.js
compila cada Route Handler y cada página como entradas independientes, así
que cada una puede terminar con su propia copia del arreglo en memoria. Se
vieron acciones que sí quedaban registradas (`ver_dashboard`) y otras que
se perdían (`login`, `reconocer_alerta`) según qué ruta las generó. Esto es
aceptable para probar la UI, pero significa que **la migración de
`AuditLog` (sql/002_audit_log.sql) no es opcional**: el requisito de
"registro permanente que no se puede editar ni borrar" solo se cumple de
verdad contra Azure SQL, nunca con el fallback en memoria.

## Falta por hacer (fuera del alcance de este scaffold)

- **Autenticación de usuarios real**: hoy es funcional pero corre contra
  usuarios hardcodeados o contra las tablas nuevas de Azure SQL — falta un
  flujo de alta/gestión de usuarios (hoy se insertan a mano, ver
  `sql/001_create_users.sql`).
- **Migraciones SQL**: correr `sql/001_create_users.sql`,
  `sql/002_audit_log.sql` y `sql/003_data_subject_requests.sql` contra
  `free-sql-db-6220728` (no se ejecutaron automáticamente).
- **Endpoint real de equipos/alertas** en el backend del daemon.
- **Exportación de reportes** (hoy solo hay contadores en pantalla).
- **Flujo automático de eliminación/entrega de datos** del titular — hoy
  solo queda la solicitud registrada para gestión manual
  (`/settings/privacidad`).
- **HTTPS en producción**: local usa un certificado autofirmado; en el
  despliegue real hay que servir detrás de HTTPS con certificado válido
  (Azure App Service / Vercel lo dan gratis).

## Seguridad de credenciales

`.env.local` no se sube a git (`.env*` está en `.gitignore`). El token
compartido del daemon y las credenciales de Azure SQL se recomienda
**rotarlas** una vez terminada esta etapa, ya que circularon en texto
plano durante el levantamiento del proyecto.
