-- Solicitudes de titulares de datos (derecho a acceso, rectificación,
-- cancelación u oposición sobre su información de ubicación asociada).
-- Hoy el panel solo deja la solicitud registrada para que un
-- administrador la gestione manualmente; el flujo de eliminación/entrega
-- automática queda fuera del alcance de esta primera versión.

CREATE TABLE DataSubjectRequests (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    SolicitanteNombre NVARCHAR(200) NOT NULL,
    SolicitanteEmail  NVARCHAR(256) NOT NULL,
    TipoSolicitud NVARCHAR(30)  NOT NULL CHECK (TipoSolicitud IN ('acceso', 'rectificacion', 'cancelacion', 'oposicion')),
    Detalle       NVARCHAR(2000) NULL,
    Estado        NVARCHAR(20)  NOT NULL DEFAULT 'pendiente' CHECK (Estado IN ('pendiente', 'en_proceso', 'resuelta', 'rechazada')),
    CreadoEn      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    ResueltoEn    DATETIME2     NULL,
    ResueltoPor   NVARCHAR(100) NULL
);
