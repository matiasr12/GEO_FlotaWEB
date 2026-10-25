// Next recomienda esto para cualquier ruta dinámica (todas las de acá lo
// son — leen la sesión/cookies en cada request): sin esto, el clic en un
// link del Sidebar no muestra nada hasta que el servidor responde, y se
// siente como que "no hizo nada". Esto da feedback inmediato.
export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
