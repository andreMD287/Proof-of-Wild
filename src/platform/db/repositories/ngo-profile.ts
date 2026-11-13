import { and, desc, eq, sql } from "drizzle-orm";
import type { Idioma } from "@/i18n/config";
import { traducir } from "@/i18n/contenido";
import type { Db } from "../client";
import { cases, contributions, expenses, ngos, providers, stages } from "../schema";

/**
 * Perfil público de una ONG aprobada: sin NIT, correo ni teléfono de contacto. La descripción y los gastos salen en el
 * idioma pedido si la ONG los tradujo.
 */
export interface PublicNgo {
  slug: string;
  name: string;
  kind: "centro_atencion" | "fundacion" | "ong";
  city: string;
  foundedYear: number | null;
  description: string;
  stellarAccount: string;
  photoPath: string | null;
  offersVolunteering: boolean;
  totals: { received: string; spent: string; spentWithInvoice: string };
  recentExpenses: Array<{ label: string; caseCode: string; amount: string; txHash: string }>;
}

export async function getPublicNgo(db: Db, slug: string, idioma: Idioma): Promise<PublicNgo | null> {
  const [ngo] = await db
    .select()
    .from(ngos)
    .where(and(eq(ngos.slug, slug), eq(ngos.status, "aprobada")))
    .limit(1);
  if (!ngo) return null;

  const [received] = await db
    .select({ total: sql<string>`coalesce(sum(${contributions.amount}), 0)` })
    .from(contributions)
    .innerJoin(cases, eq(cases.id, contributions.caseId))
    .where(and(eq(cases.ngoId, ngo.id), eq(contributions.status, "confirmada")));

  const [spent] = await db
    .select({
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      withInvoice: sql<string>`coalesce(sum(${expenses.amount}) filter (where ${expenses.invoiceKey} <> ''), 0)`,
    })
    .from(expenses)
    .innerJoin(cases, eq(cases.id, expenses.caseId))
    .where(and(eq(cases.ngoId, ngo.id), eq(expenses.status, "confirmada")));

  const recent = await db
    .select({
      concept: expenses.concept,
      conceptTranslations: expenses.translations,
      stageName: stages.name,
      stageTranslations: stages.translations,
      providerName: providers.name,
      caseCode: cases.code,
      amount: expenses.amount,
      txHash: expenses.txHash,
    })
    .from(expenses)
    .innerJoin(cases, eq(cases.id, expenses.caseId))
    .innerJoin(stages, eq(stages.id, expenses.stageId))
    .innerJoin(providers, eq(providers.id, expenses.providerId))
    .where(and(eq(cases.ngoId, ngo.id), eq(expenses.status, "confirmada")))
    .orderBy(desc(expenses.occurredOn), desc(expenses.createdAt))
    .limit(4);

  return {
    slug: ngo.slug,
    name: ngo.name,
    kind: ngo.kind,
    city: ngo.city,
    foundedYear: ngo.foundedYear,
    description: traducir({ description: ngo.description }, ngo.translations, idioma).description,
    stellarAccount: ngo.stellarAccount,
    photoPath: ngo.photoPath,
    offersVolunteering: ngo.offersVolunteering,
    totals: { received: received?.total ?? "0", spent: spent?.total ?? "0", spentWithInvoice: spent?.withInvoice ?? "0" },
    recentExpenses: recent.map((r) => ({
      label:
        traducir({ concept: r.concept }, r.conceptTranslations, idioma).concept ??
        traducir({ name: r.stageName }, r.stageTranslations, idioma).name,
      caseCode: r.caseCode,
      amount: r.amount,
      txHash: r.txHash ?? "",
    })),
  };
}
