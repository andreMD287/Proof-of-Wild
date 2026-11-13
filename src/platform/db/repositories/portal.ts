import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Idioma } from "@/i18n/config";
import { traducir } from "@/i18n/contenido";
import { stageStatusesFromFunding, type StageStatus } from "@/modules/cases";
import type { Db } from "../client";
import {
  cases,
  contributionAllocations,
  contributions,
  expenses,
  milestones,
  ngos,
  providerNgos,
  providers,
  stages,
} from "../schema";

export interface PortalRecord {
  at: string;
  kind: "gasto" | "aporte" | "hito";
  caseCode: string;
  /** Etapa del gasto o del hito; nula en un aporte. */
  stage: number | null;
  /** Proveedor del gasto o descripción del hito (en el idioma pedido si la ONG la tradujo); nulo en un aporte. */
  text: string | null;
  amount: string | null;
  status: "presentado" | "revisado" | "verificado_independiente" | "en_la_red" | "por_confirmar";
  txHash: string | null;
  fileKey: string | null;
}

export interface PortalData {
  ngo: { id: string; name: string; slug: string; stellarAccount: string };
  providers: Array<{ id: string; name: string; sells: string; account: string }>;
  totals: { received: string; spent: string };
  records: PortalRecord[];
  /** Etapas en curso sin hito confirmado y registros que la red aún no confirma. */
  pending: PortalPending[];
}

/**
 * Pendientes del portal, como datos: la página arma el texto en su idioma.
 * - `subir_foto`: una etapa en curso todavía sin hito confirmado.
 * - `por_confirmar`: un gasto o un hito que la red aún no confirma.
 */
export type PortalPending =
  | { kind: "subir_foto"; stage: number; stageName: string; caseCode: string; tone: "accion" }
  | { kind: "por_confirmar"; record: "gasto" | "hito"; caseCode: string; tone: "espera" };

/** Lo que ve una ONG en su portal (pantalla 9). Solo sus casos. */
export async function getPortalData(db: Db, ngoId: string, idioma: Idioma): Promise<PortalData | null> {
  const [ngo] = await db
    .select({ id: ngos.id, name: ngos.name, slug: ngos.slug, stellarAccount: ngos.stellarAccount })
    .from(ngos)
    .where(eq(ngos.id, ngoId))
    .limit(1);
  if (!ngo) return null;

  const caseRows = await db
    .select({ id: cases.id, code: cases.code, status: cases.status })
    .from(cases)
    .where(eq(cases.ngoId, ngoId));
  const ids = caseRows.map((c) => c.id);
  const codeOf = new Map(caseRows.map((c) => [c.id, c.code]));
  if (ids.length === 0) {
    return { ngo, providers: await providersOf(db, ngoId), totals: { received: "0", spent: "0" }, records: [], pending: [] };
  }

  const [providerRows, received, spent, expenseRows, contributionRows, milestoneRows, stageRows, coveredRows] =
    await Promise.all([
    providersOf(db, ngoId),
    db
      .select({ total: sql<string>`coalesce(sum(${contributions.amount}), 0)` })
      .from(contributions)
      .where(and(inArray(contributions.caseId, ids), eq(contributions.status, "confirmada"))),
    db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(inArray(expenses.caseId, ids), eq(expenses.status, "confirmada"))),
    db
      .select({
        caseId: expenses.caseId,
        at: expenses.createdAt,
        stage: stages.position,
        provider: providers.name,
        amount: expenses.amount,
        status: expenses.status,
        level: expenses.validationLevel,
        txHash: expenses.txHash,
        fileKey: expenses.invoiceKey,
      })
      .from(expenses)
      .innerJoin(stages, eq(stages.id, expenses.stageId))
      .innerJoin(providers, eq(providers.id, expenses.providerId))
      .where(and(inArray(expenses.caseId, ids), isNotNull(expenses.txHash)))
      .orderBy(desc(expenses.createdAt))
      .limit(10),
    db
      .select({ id: contributions.id, caseId: contributions.caseId, at: contributions.confirmedAt, amount: contributions.amount, txHash: contributions.txHash })
      .from(contributions)
      .where(and(inArray(contributions.caseId, ids), eq(contributions.status, "confirmada")))
      .orderBy(desc(contributions.confirmedAt))
      .limit(10),
    db
      .select({
        caseId: milestones.caseId,
        stageId: milestones.stageId,
        at: milestones.createdAt,
        stage: stages.position,
        description: milestones.description,
        translations: milestones.translations,
        status: milestones.status,
        level: milestones.validationLevel,
        txHash: milestones.txHash,
        fileKey: milestones.photoKey,
      })
      .from(milestones)
      .innerJoin(stages, eq(stages.id, milestones.stageId))
      .where(and(inArray(milestones.caseId, ids), isNotNull(milestones.txHash)))
      .orderBy(desc(milestones.createdAt))
      .limit(20),
    db
      .select({
        id: stages.id,
        caseId: stages.caseId,
        position: stages.position,
        name: stages.name,
        translations: stages.translations,
        cost: stages.cost,
      })
      .from(stages)
      .where(inArray(stages.caseId, ids)),
    db
      .select({ stageId: contributionAllocations.stageId, covered: sql<string>`sum(${contributionAllocations.amount})` })
      .from(contributionAllocations)
      .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
      .where(and(inArray(contributions.caseId, ids), eq(contributions.status, "confirmada")))
      .groupBy(contributionAllocations.stageId),
  ]);

  const status = (s: string, level: PortalRecord["status"]): PortalRecord["status"] =>
    s === "confirmada" ? level : "por_confirmar";

  const records: PortalRecord[] = [
    ...expenseRows
      .filter((e) => e.status !== "fallida")
      .map((e) => ({
        at: e.at.toISOString(),
        kind: "gasto" as const,
        caseCode: codeOf.get(e.caseId) ?? "",
        stage: e.stage,
        text: e.provider,
        amount: e.amount,
        status: status(e.status, e.level),
        txHash: e.txHash,
        fileKey: e.fileKey,
      })),
    ...contributionRows.map((c) => ({
      at: (c.at ?? new Date(0)).toISOString(),
      kind: "aporte" as const,
      caseCode: codeOf.get(c.caseId) ?? "",
      stage: null,
      text: null,
      amount: c.amount,
      status: "en_la_red" as const,
      txHash: c.txHash,
      fileKey: null,
    })),
    ...milestoneRows
      .filter((m) => m.status !== "fallida")
      .map((m) => ({
        at: m.at.toISOString(),
        kind: "hito" as const,
        caseCode: codeOf.get(m.caseId) ?? "",
        stage: m.stage,
        text: traducir({ description: m.description }, m.translations, idioma).description,
        amount: null,
        status: status(m.status, m.level),
        txHash: m.txHash,
        fileKey: m.fileKey,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  // El estado de cada etapa sale de lo cubierto, igual que en la página del caso.
  const coveredOf = new Map(coveredRows.map((r) => [r.stageId, r.covered]));
  const statusOf = new Map<string, StageStatus>();
  for (const caseId of new Set(stageRows.map((s) => s.caseId))) {
    const ofCase = stageRows.filter((s) => s.caseId === caseId);
    const statuses = stageStatusesFromFunding(ofCase.map((s) => ({ ...s, covered: coveredOf.get(s.id) ?? "0" })));
    for (const s of ofCase) statusOf.set(s.id, statuses.get(s.position)!);
  }

  const withMilestone = new Set(milestoneRows.filter((m) => m.status === "confirmada").map((m) => m.stageId));
  const activeIds = new Set(caseRows.filter((c) => c.status === "activo").map((c) => c.id));
  const pending: PortalData["pending"] = [
    ...stageRows
      .filter((s) => activeIds.has(s.caseId) && statusOf.get(s.id) === "en_curso" && !withMilestone.has(s.id))
      .map((s) => ({
        kind: "subir_foto" as const,
        stage: s.position,
        stageName: traducir({ name: s.name }, s.translations, idioma).name,
        caseCode: codeOf.get(s.caseId) ?? "",
        tone: "accion" as const,
      })),
    ...records
      .filter((r) => r.status === "por_confirmar" && r.kind !== "aporte")
      .map((r) => ({
        kind: "por_confirmar" as const,
        record: r.kind === "gasto" ? ("gasto" as const) : ("hito" as const),
        caseCode: r.caseCode,
        tone: "espera" as const,
      })),
  ];

  return {
    ngo,
    providers: providerRows,
    totals: { received: received[0]?.total ?? "0", spent: spent[0]?.total ?? "0" },
    records,
    pending,
  };
}

function providersOf(db: Db, ngoId: string) {
  return db
    .select({ id: providers.id, name: providers.name, sells: providers.sells, account: providers.stellarAccount })
    .from(providers)
    .innerJoin(providerNgos, eq(providerNgos.providerId, providers.id))
    .where(eq(providerNgos.ngoId, ngoId))
    .orderBy(providers.name);
}
