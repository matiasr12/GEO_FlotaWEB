-- Comentario libre por equipo (ej. "pantalla con fallas", "en reparación").
-- Se agrega directo a la tabla Equipos ya existente (administrada por el
-- backend/daemon) en vez de una tabla separada, porque Equipos vive en la
-- misma base de datos y así queda todo junto con una sola fuente de verdad.
-- Columna NULLABLE: no rompe los INSERT que ya hace el backend del daemon,
-- que no la incluyen.

ALTER TABLE Equipos ADD Comentarios NVARCHAR(500) NULL;
