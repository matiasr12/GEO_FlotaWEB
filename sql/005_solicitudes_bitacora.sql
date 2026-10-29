-- Bitácora de cada solicitud de titular de datos: comentarios internos,
-- cambios de estado y avisos enviados por correo al titular. Solo se
-- agregan filas (nunca se editan ni borran) para que quede el historial
-- completo de cómo se gestionó cada solicitud.

CREATE TABLE DataSubjectRequestNotes (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    SolicitudId    UNIQUEIDENTIFIER NOT NULL REFERENCES DataSubjectRequests(Id),
    UserId         NVARCHAR(100)  NOT NULL,
    UserNombre     NVARCHAR(200)  NOT NULL,
    Tipo           NVARCHAR(20)   NOT NULL CHECK (Tipo IN ('comentario', 'estado', 'aviso')),
    Comentario     NVARCHAR(2000) NULL,
    EstadoAnterior NVARCHAR(20)   NULL,
    EstadoNuevo    NVARCHAR(20)   NULL,
    CreadoEn       DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_DataSubjectRequestNotes_Solicitud
    ON DataSubjectRequestNotes (SolicitudId, CreadoEn);
