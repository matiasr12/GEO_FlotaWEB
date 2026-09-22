-- Registro de auditoría: quién vio o modificó qué y cuándo.
-- Requisito: debe ser inmutable (ni editable ni borrable) porque sirve
-- como evidencia de cumplimiento ante la Ley 19.628 / Ley 21.719
-- (protección de datos personales).
--
-- La inmutabilidad se refuerza en dos capas:
--   1) La aplicación solo expone INSERT y SELECT (ver src/lib/audit.ts).
--   2) A nivel de base de datos, un trigger INSTEAD OF bloquea UPDATE/DELETE
--      incluso si alguien se conecta directo con el usuario admin.
--
-- Recomendado además: crear un login de aplicación separado (no el admin)
-- con permisos GRANT INSERT, SELECT ON AuditLog y sin GRANT UPDATE/DELETE,
-- para no depender solo del trigger.

CREATE TABLE AuditLog (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId    NVARCHAR(100)    NOT NULL,
    UserEmail NVARCHAR(256)    NOT NULL,
    Role      NVARCHAR(20)     NOT NULL,
    Action    NVARCHAR(50)     NOT NULL,
    Detalle   NVARCHAR(1000)   NULL,
    Ip        NVARCHAR(64)     NULL,
    Timestamp DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);

GO

CREATE TRIGGER trg_AuditLog_Inmutable
ON AuditLog
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    RAISERROR('AuditLog es de solo inserción: no se permite UPDATE ni DELETE.', 16, 1);
    ROLLBACK TRANSACTION;
END;
