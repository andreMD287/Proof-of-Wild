/**
 * Pone en una base ya sembrada las traducciones al inglés y al portugués de los datos de prueba (demo-data.ts), sin
 * volver a sembrar: solo escribe la columna `translations` de ONG, casos, etapas, gastos, hitos y voluntariados.
 * Lo que una ONG registró en vivo no se toca. Es idempotente. La base necesita la migración 0003 (`db:migrate`).
 *
 *   npm run db:traducciones                                     (la base de .env)
 *   npx tsx --env-file=.env.vercel scripts/traducciones-a-bd.ts   (otra base, por ejemplo la de Vercel)
 */
import { getDb } from "@/platform/db/client";
import { applyDemoTranslations } from "@/platform/db/seed-demo";

async function main() {
  const { updated } = await applyDemoTranslations(getDb());
  console.log(`Traducciones al día: ${updated} filas.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
