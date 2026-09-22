import { z } from "zod";

const envSchema = z.object({
  DAEMON_API_BASE_URL: z.string().url(),
  DAEMON_API_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  SESSION_INACTIVITY_MINUTES: z.coerce.number().default(15),
  AZURE_SQL_SERVER: z.string().min(1).optional(),
  AZURE_SQL_DATABASE: z.string().min(1).optional(),
  AZURE_SQL_USER: z.string().min(1).optional(),
  AZURE_SQL_PASSWORD: z.string().min(1).optional(),
  USE_MOCK_DATA: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

// server-only: nunca importar este módulo desde un componente cliente.
export const env = envSchema.parse({
  DAEMON_API_BASE_URL: process.env.DAEMON_API_BASE_URL,
  DAEMON_API_TOKEN: process.env.DAEMON_API_TOKEN,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_INACTIVITY_MINUTES: process.env.SESSION_INACTIVITY_MINUTES,
  AZURE_SQL_SERVER: process.env.AZURE_SQL_SERVER,
  AZURE_SQL_DATABASE: process.env.AZURE_SQL_DATABASE,
  AZURE_SQL_USER: process.env.AZURE_SQL_USER,
  AZURE_SQL_PASSWORD: process.env.AZURE_SQL_PASSWORD,
  USE_MOCK_DATA: process.env.USE_MOCK_DATA,
});
