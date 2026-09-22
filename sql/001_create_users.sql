-- Tabla de usuarios humanos del panel (admin / supervisor / auditor).
-- El backend del daemon NO usa esta tabla: sigue autenticándose con el
-- token compartido. Esto es exclusivo para el login del panel web.

CREATE TABLE Users (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Email         NVARCHAR(256)    NOT NULL UNIQUE,
    Nombre        NVARCHAR(200)    NOT NULL,
    Role          NVARCHAR(20)     NOT NULL CHECK (Role IN ('admin', 'supervisor', 'auditor')),
    Turno         NVARCHAR(50)     NULL,
    PasswordHash  NVARCHAR(200)    NOT NULL, -- bcrypt
    Activo        BIT              NOT NULL DEFAULT 1,
    CreadoEn      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Usuario administrador inicial. La contraseña se debe fijar generando
-- un hash bcrypt (ver scripts/hash-password.ts) y reemplazando el valor
-- de abajo antes de correr este script; no dejar contraseñas por defecto
-- en un ambiente productivo.
-- INSERT INTO Users (Email, Nombre, Role, PasswordHash)
-- VALUES ('admin@empresa.cl', 'Nombre Apellido', 'admin', '<hash_bcrypt_aqui>');
