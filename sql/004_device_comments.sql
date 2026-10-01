-- Comentarios libres por equipo (ej. "pantalla con fallas", "en reparación").
-- No reemplaza ningún dato del daemon ni de EquipoApiDTO: es exclusivo del
-- panel, para que supervisores dejen contexto que la telemetría automática
-- no captura. Se identifica por EquipoId (mismo id que Device.id en el
-- frontend, ver src/types/device.ts).

CREATE TABLE DeviceComments (
    EquipoId    NVARCHAR(50)   NOT NULL PRIMARY KEY,
    Comentario  NVARCHAR(500)  NOT NULL,
    UpdatedBy   NVARCHAR(256)  NOT NULL,
    UpdatedAt   DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);
