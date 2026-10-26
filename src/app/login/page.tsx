import { Suspense } from "react";
import { connection } from "next/server";
import { getEnv } from "@/lib/env";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  // La site key se lee al atender el request (App Settings de Azure), no
  // en el build: connection() evita que la página se prerenderice en CI.
  await connection();
  const { TURNSTILE_SITE_KEY } = getEnv();

  return (
    <Suspense>
      <LoginForm turnstileSiteKey={TURNSTILE_SITE_KEY} />
    </Suspense>
  );
}
