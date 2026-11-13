import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type {
  CaseDetailData,
  CaseRow,
  CaseWithFunding,
  CatalogReader,
  StageRow,
} from "@/modules/catalog";
import type { Db } from "../client";
import {
  cases,
  contributionAllocations,
  contributions,
  expenses,
  milestones,
  ngos,
  providers,
  stages,
} from "../schema";

const caseColumns = {
  id: cases.id,
  code: cases.code,
  commonName: cases.commonName,
  scientificName: cases.scientificName,
  group: cases.group,
  speciesPublic: cases.speciesPublic,
  shortStory: cases.shortStory,
  story: cases.story,
  translations: cases.translations,
  photoPath: cases.photoPath,
  intakeDate: cases.intakeDate,
  status: cases.status,
  outcome: cases.outcome,
  outcomeLabel: cases.outcomeLabel,
  outcomeDate: cases.outcomeDate,
  ngoSlug: ngos.slug,
  ngoName: ngos.name,
};

function toCaseRow(r: Omit<CaseRow, "ngo"> & { ngoSlug: string; ngoName: string }): CaseRow {
  const { ngoSlug, ngoName, ...rest } = r;
  return { ...rest, ngo: { slug: ngoSlug, name: ngoName } };
}

/** Lector del lado público: solo la base de datos, solo ONG aprobadas y solo lo confirmado en la red. */
export class DbCatalogReader implements CatalogReader {
  constructor(private readonly db: Db) {}

  async listCases(): Promise<CaseWithFunding[]> {
    const rows = await this.db
      .select(caseColumns)
      .from(cases)
      .innerJoin(ngos, eq(ngos.id, cases.ngoId))
      .where(eq(ngos.status, "aprobada"))
      .orderBy(asc(cases.code));
    return this.withFunding(rows.map(toCaseRow));
  }

  async getCase(code: string): Promise<CaseDetailData | null> {
    const [found] = await this.db
      .select(caseColumns)
      .from(cases)
      .innerJoin(ngos, eq(ngos.id, cases.ngoId))
      .where(and(eq(cases.code, code), eq(ngos.status, "aprobada")))
      .limit(1);
    if (!found) return null;

    const [base] = await this.withFunding([toCaseRow(found)]);
    if (!base) return null;
    const caseId = found.id;

    const [contributionRows, allocationRows, expenseRows, milestoneRows] = await Promise.all([
      this.db
        .select({
          id: contributions.id,
          txHash: contributions.txHash,
          donorAccount: contributions.donorAccount,
          amount: contributions.amount,
          confirmedAt: contributions.confirmedAt,
        })
        .from(contributions)
        .where(and(eq(contributions.caseId, caseId), eq(contributions.status, "confirmada"))),
      this.db
        .select({
          contributionId: contributionAllocations.contributionId,
          stageId: contributionAllocations.stageId,
          amount: contributionAllocations.amount,
        })
        .from(contributionAllocations)
        .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
        .where(and(eq(contributions.caseId, caseId), eq(contributions.status, "confirmada"))),
      this.db
        .select({
          stageId: expenses.stageId,
          providerName: providers.name,
          category: expenses.category,
          concept: expenses.concept,
          translations: expenses.translations,
          amount: expenses.amount,
          occurredOn: expenses.occurredOn,
          invoiceNumber: expenses.invoiceNumber,
          invoiceKey: expenses.invoiceKey,
          txHash: expenses.txHash,
          validationLevel: expenses.validationLevel,
        })
        .from(expenses)
        .innerJoin(providers, eq(providers.id, expenses.providerId))
        .where(and(eq(expenses.caseId, caseId), eq(expenses.status, "confirmada"))),
      this.db
        .select({
          stageId: milestones.stageId,
          occurredOn: milestones.occurredOn,
          description: milestones.description,
          translations: milestones.translations,
          photoKey: milestones.photoKey,
          txHash: milestones.txHash,
          validationLevel: milestones.validationLevel,
        })
        .from(milestones)
        .where(and(eq(milestones.caseId, caseId), eq(milestones.status, "confirmada"))),
    ]);

    return {
      ...base,
      contributions: contributionRows.map((c) => ({
        txHash: c.txHash,
        donorAccount: c.donorAccount,
        amount: c.amount,
        confirmedAt: c.confirmedAt ?? new Date(0),
        allocations: allocationRows
          .filter((a) => a.contributionId === c.id)
          .map((a) => ({ stageId: a.stageId, amount: a.amount })),
      })),
      // Las filas confirmadas siempre tienen hash (restricción de la base de datos).
      expenses: expenseRows.map((e) => ({ ...e, txHash: e.txHash ?? "" })),
      milestones: milestoneRows.map((m) => ({ ...m, txHash: m.txHash ?? "" })),
    };
  }

  async getReceipt(txHash: string) {
    const [row] = await this.db
      .select({
        id: contributions.id,
        txHash: contributions.txHash,
        caseCode: cases.code,
        commonName: cases.commonName,
        caseTranslations: cases.translations,
        speciesPublic: cases.speciesPublic,
        photoPath: cases.photoPath,
        ngoName: ngos.name,
        donorAccount: contributions.donorAccount,
        amount: contributions.amount,
        confirmedAt: contributions.confirmedAt,
      })
      .from(contributions)
      .innerJoin(cases, eq(cases.id, contributions.caseId))
      .innerJoin(ngos, eq(ngos.id, cases.ngoId))
      .where(and(eq(contributions.txHash, txHash), eq(contributions.status, "confirmada")))
      .limit(1);
    if (!row || !row.confirmedAt) return null;
    const allocations = await this.db
      .select({
        position: stages.position,
        stageName: stages.name,
        stageTranslations: stages.translations,
        amount: contributionAllocations.amount,
      })
      .from(contributionAllocations)
      .innerJoin(stages, eq(stages.id, contributionAllocations.stageId))
      .where(eq(contributionAllocations.contributionId, row.id))
      .orderBy(asc(stages.position));
    const { id: _, confirmedAt, ...rest } = row;
    return { ...rest, confirmedAt, allocations };
  }

  async donorAllocations(code: string, account: string) {
    return this.db
      .select({ position: stages.position, amount: sql<string>`sum(${contributionAllocations.amount})` })
      .from(contributionAllocations)
      .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
      .innerJoin(stages, eq(stages.id, contributionAllocations.stageId))
      .innerJoin(cases, eq(cases.id, contributions.caseId))
      .where(
        and(eq(cases.code, code), eq(contributions.donorAccount, account), eq(contributions.status, "confirmada")),
      )
      .groupBy(stages.position)
      .orderBy(asc(stages.position));
  }

  /** Agrega a cada caso sus etapas y lo cubierto por etapa con los aportes confirmados. */
  private async withFunding(rows: CaseRow[]): Promise<CaseWithFunding[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [stageRows, coveredRows] = await Promise.all([
      this.db
        .select({
          id: stages.id,
          caseId: stages.caseId,
          position: stages.position,
          name: stages.name,
          shortName: stages.shortName,
          covers: stages.covers,
          translations: stages.translations,
          cost: stages.cost,
          photoPath: stages.photoPath,
          status: stages.status,
        })
        .from(stages)
        .where(inArray(stages.caseId, ids))
        .orderBy(asc(stages.position)),
      this.db
        .select({
          stageId: contributionAllocations.stageId,
          total: sql<string>`sum(${contributionAllocations.amount})`,
        })
        .from(contributionAllocations)
        .innerJoin(contributions, eq(contributions.id, contributionAllocations.contributionId))
        .where(and(inArray(contributions.caseId, ids), eq(contributions.status, "confirmada")))
        .groupBy(contributionAllocations.stageId),
    ]);

    const covered = Object.fromEntries(coveredRows.map((r) => [r.stageId, r.total]));
    return rows.map((row) => {
      const own: StageRow[] = stageRows.filter((s) => s.caseId === row.id).map(({ caseId: _, ...s }) => s);
      return {
        row,
        stages: own,
        coveredByStage: Object.fromEntries(own.map((s) => [s.id, covered[s.id] ?? "0"])),
      };
    });
  }
}
