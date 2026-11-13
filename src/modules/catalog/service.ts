import type { Idioma } from "@/i18n/config";
import { traducir } from "@/i18n/contenido";
import { fromStroops, sumAmounts, toStroops } from "@/lib/amount";
import { explorerTxUrl } from "@/lib/explorer";
import { isStellarAccount } from "@/lib/stellar-account";
import { fundingProgress, isValidCaseCode, remainingToGoal, stageStatusesFromFunding, type StageStatus } from "../cases";
import type {
  CaseDetailData,
  CaseOutcome,
  CaseRow,
  CaseWithFunding,
  CatalogReader,
  ExpenseCategory,
  StageRow,
  ValidationLevel,
} from "./repository";

/** Chip del caso: la etapa actual mientras está en tratamiento, o su resultado cuando terminó. */
export interface CaseChip {
  label: string;
  tone: "etapa" | "logro" | "reserva";
}

/** Una etapa vista en el mapa: lo cubierto frente a su costo y su estado. */
export interface RouteStage {
  position: number;
  name: string;
  shortName: string;
  cost: string;
  covered: string;
  status: StageStatus;
}

export interface PublicCaseSummary {
  code: string;
  /** Nombre común. Nulo si no es seguro divulgar la especie (RN-05). */
  commonName: string | null;
  scientificName: string | null;
  ngo: { slug: string; name: string };
  shortStory: string;
  photoUrl: string | null;
  chip: CaseChip;
  /** Etapas que aún faltan por cubrir; en un caso cerrado, todas las que tuvo. */
  needs: string[];
  recovered: boolean;
  outcome: CaseOutcome | null;
  outcomeLabel: string | null;
  outcomeDate: string | null;
  goal: string;
  raised: string;
  remaining: string;
  progressPercent: number;
  /** La ruta del tratamiento, etapa por etapa, para dibujarla en el mapa. */
  route: RouteStage[];
}

export interface PublicStageExpense {
  providerName: string;
  invoiceNumber: string;
  amount: string;
  validationLevel: ValidationLevel;
  invoiceUrl: string;
  txUrl: string;
}

export interface PublicStageMilestone {
  occurredOn: string;
  description: string;
  photoUrl: string | null;
  validationLevel: ValidationLevel;
  txUrl: string;
}

export interface PublicStage {
  position: number;
  name: string;
  shortName: string;
  covers: string | null;
  cost: string;
  covered: string;
  spent: string;
  status: StageStatus;
  /** Foto de la etapa: la propia o la del último hito. */
  photoUrl: string | null;
  /** La etapa anterior aún no está cubierta, así que esta todavía no recibe aportes. */
  waitingForPrevious: boolean;
  expenses: PublicStageExpense[];
  milestones: PublicStageMilestone[];
}

export interface PublicExpense extends PublicStageExpense {
  occurredOn: string;
  stagePosition: number;
  stageName: string;
  concept: string;
  category: ExpenseCategory;
}

export interface PublicContribution {
  donorAccount: string;
  amount: string;
  confirmedAt: string;
  txUrl: string;
  allocations: Array<{ position: number; amount: string }>;
}

export interface PublicCaseDetail extends PublicCaseSummary {
  story: string;
  intakeDate: string;
  stages: PublicStage[];
  transparency: {
    received: string;
    spent: string;
    available: string;
    byCategory: Array<{ category: ExpenseCategory; amount: string }>;
    expenses: PublicExpense[];
  };
  contributions: PublicContribution[];
}

export interface PublicReceipt {
  txHash: string;
  caseCode: string;
  caseName: string;
  photoUrl: string | null;
  ngoName: string;
  /** La billetera es pública: está en la red. */
  donorAccount: string;
  amount: string;
  confirmedAt: string;
  txUrl: string;
  allocations: Array<{ position: number; stageName: string; amount: string }>;
}

export interface CatalogServiceConfig {
  explorerBaseUrl: string;
  /** Convierte una clave del almacén de evidencias (o una ruta de public/) en una URL pública. */
  evidenceUrl: (keyOrPath: string) => string;
}

const CATEGORIES: ExpenseCategory[] = [
  "medicamentos",
  "atencion_veterinaria",
  "alimentacion",
  "rehabilitacion",
  "traslado_liberacion",
];

/**
 * Lado de lectura público (RF-CAT-01, RF-CAT-02). Solo construye proyecciones públicas: ningún identificador
 * interno, correo, nombre ni teléfono sale de aquí (QA-SEG-01). Las billeteras sí son públicas: están en la red.
 * Los textos de la ONG salen en el idioma pedido cuando tienen traducción y, si no, como los escribió (ADR-23).
 */
export class CatalogService {
  constructor(
    private readonly reader: CatalogReader,
    private readonly config: CatalogServiceConfig,
  ) {}

  async listCases(idioma: Idioma): Promise<PublicCaseSummary[]> {
    const rows = await this.reader.listCases();
    // Primero los casos en tratamiento; después los recuperados.
    return rows
      .map((row) => this.summary(casoEnIdioma(row, idioma)))
      .sort((a, b) => Number(a.recovered) - Number(b.recovered) || a.code.localeCompare(b.code));
  }

  async recoveredCases(idioma: Idioma): Promise<PublicCaseSummary[]> {
    return (await this.listCases(idioma)).filter((c) => c.recovered);
  }

  async caseDetail(code: string, idioma: Idioma): Promise<PublicCaseDetail | null> {
    if (!isValidCaseCode(code)) return null;
    const found = await this.reader.getCase(code);
    if (!found) return null;
    const data = detalleEnIdioma(found, idioma);

    const tx = (hash: string) => explorerTxUrl(this.config.explorerBaseUrl, hash);
    const media = (keyOrPath: string | null) => (keyOrPath ? this.config.evidenceUrl(keyOrPath) : null);
    const ordered = [...data.stages].sort((a, b) => a.position - b.position);
    const positionOf = new Map(ordered.map((s) => [s.id, s.position]));

    const expensesOf = (stageId: string) => data.expenses.filter((e) => e.stageId === stageId);
    const statuses = statusesOf(ordered, data.coveredByStage);
    let previousFull = true;
    const stages: PublicStage[] = ordered.map((stage) => {
      const covered = data.coveredByStage[stage.id] ?? "0";
      const milestones = data.milestones
        .filter((m) => m.stageId === stage.id)
        .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
      const status = statuses.get(stage.position)!;
      const result: PublicStage = {
        position: stage.position,
        name: stage.name,
        shortName: stage.shortName,
        covers: stage.covers,
        cost: normalize(stage.cost),
        covered: normalize(covered),
        spent: sumAmounts(expensesOf(stage.id).map((e) => e.amount)),
        status,
        // La foto del último hito es la evidencia más reciente; la foto de la etapa solo ilustra una etapa que ya
        // empezó (en una pendiente se muestra «La foto llega cuando empiece la etapa»).
        photoUrl: media(milestones.at(-1)?.photoKey ?? null) ?? (status === "pendiente" ? null : media(stage.photoPath)),
        waitingForPrevious: !previousFull && toStroops(covered) === 0n,
        expenses: expensesOf(stage.id).map((e) => ({
          providerName: e.providerName,
          invoiceNumber: e.invoiceNumber,
          amount: normalize(e.amount),
          validationLevel: e.validationLevel,
          invoiceUrl: this.config.evidenceUrl(e.invoiceKey),
          txUrl: tx(e.txHash),
        })),
        milestones: milestones.map((m) => ({
          occurredOn: m.occurredOn,
          description: m.description,
          photoUrl: media(m.photoKey),
          validationLevel: m.validationLevel,
          txUrl: tx(m.txHash),
        })),
      };
      previousFull = toStroops(covered) >= toStroops(stage.cost);
      return result;
    });

    const expenses: PublicExpense[] = data.expenses
      .map((e) => {
        const position = positionOf.get(e.stageId) ?? 0;
        const stageName = ordered.find((s) => s.id === e.stageId)?.name ?? "";
        return {
          occurredOn: e.occurredOn,
          stagePosition: position,
          stageName,
          concept: e.concept ?? stageName,
          category: e.category,
          providerName: e.providerName,
          invoiceNumber: e.invoiceNumber,
          amount: normalize(e.amount),
          validationLevel: e.validationLevel,
          invoiceUrl: this.config.evidenceUrl(e.invoiceKey),
          txUrl: tx(e.txHash),
        };
      })
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));

    const received = sumAmounts(data.contributions.map((c) => c.amount));
    const spent = sumAmounts(expenses.map((e) => e.amount));
    const available = toStroops(received) - toStroops(spent);

    return {
      ...this.summary(data),
      story: data.row.story,
      intakeDate: data.row.intakeDate,
      stages,
      transparency: {
        received,
        spent,
        available: fromStroops(available > 0n ? available : 0n),
        byCategory: CATEGORIES.map((category) => ({
          category,
          amount: sumAmounts(expenses.filter((e) => e.category === category).map((e) => e.amount)),
        })),
        expenses,
      },
      contributions: data.contributions
        .map((c) => ({
          donorAccount: c.donorAccount,
          amount: normalize(c.amount),
          confirmedAt: c.confirmedAt.toISOString(),
          txUrl: tx(c.txHash),
          allocations: c.allocations
            .map((a) => ({ position: positionOf.get(a.stageId) ?? 0, amount: normalize(a.amount) }))
            .sort((a, b) => a.position - b.position),
        }))
        .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt)),
    };
  }

  /** Comprobante público de un aporte confirmado (RF-COM-01): sin datos personales, solo lo que está en la red. */
  async receipt(txHash: string, idioma: Idioma): Promise<PublicReceipt | null> {
    if (!/^[0-9a-f]{64}$/.test(txHash)) return null;
    const row = await this.reader.getReceipt(txHash);
    if (!row) return null;
    const { commonName } = traducir({ commonName: row.commonName }, row.caseTranslations, idioma);
    return {
      txHash: row.txHash,
      caseCode: row.caseCode,
      caseName: row.speciesPublic ? commonName : "Especie reservada",
      photoUrl: row.photoPath ? this.config.evidenceUrl(row.photoPath) : null,
      ngoName: row.ngoName,
      donorAccount: row.donorAccount,
      amount: normalize(row.amount),
      confirmedAt: row.confirmedAt.toISOString(),
      txUrl: explorerTxUrl(this.config.explorerBaseUrl, row.txHash),
      allocations: row.allocations.map((a) => ({
        position: a.position,
        stageName: traducir({ name: a.stageName }, a.stageTranslations, idioma).name,
        amount: normalize(a.amount),
      })),
    };
  }

  /**
   * «Tu aporte» de la línea de tiempo personalizada: lo que los aportes de una billetera pagaron de cada etapa.
   * Las billeteras y sus aportes son públicos en la red; aquí no se agrega ningún dato personal.
   */
  async donorAllocations(code: string, account: string): Promise<Record<number, string>> {
    if (!isValidCaseCode(code) || !isStellarAccount(account)) return {};
    const rows = await this.reader.donorAllocations(code, account);
    return Object.fromEntries(rows.map((r) => [r.position, normalize(r.amount)]));
  }

  private summary({ row, stages, coveredByStage }: CaseWithFunding): PublicCaseSummary {
    const funding = stages.map((s) => ({ position: s.position, cost: s.cost, covered: coveredByStage[s.id] ?? "0" }));
    const goal = sumAmounts(stages.map((s) => s.cost));
    const raised = sumAmounts(funding.map((s) => s.covered));
    const recovered = row.status === "recuperado";
    const ordered = [...stages].sort((a, b) => a.position - b.position);
    const statuses = statusesOf(ordered, coveredByStage);

    return {
      code: row.code,
      commonName: row.speciesPublic ? row.commonName : null,
      scientificName: row.speciesPublic ? row.scientificName : null,
      ngo: row.ngo,
      shortStory: row.shortStory,
      photoUrl: row.photoPath ? this.config.evidenceUrl(row.photoPath) : null,
      chip: chipFor(row, ordered.map((s) => ({ shortName: s.shortName, status: statuses.get(s.position)! }))),
      needs: recovered
        ? ordered.map((s) => s.name)
        : ordered.filter((s) => toStroops(coveredByStage[s.id] ?? "0") < toStroops(s.cost)).map((s) => s.name),
      recovered,
      outcome: row.outcome,
      outcomeLabel: row.outcomeLabel,
      outcomeDate: row.outcomeDate,
      goal,
      raised,
      remaining: remainingToGoal(funding),
      progressPercent: fundingProgress(goal, raised),
      route: ordered.map((s) => ({
        position: s.position,
        name: s.name,
        shortName: s.shortName,
        cost: normalize(s.cost),
        covered: normalize(coveredByStage[s.id] ?? "0"),
        status: statuses.get(s.position)!,
      })),
    };
  }
}

/** El caso y sus etapas con los textos en el idioma pedido. */
function casoEnIdioma<T extends CaseWithFunding>(data: T, idioma: Idioma): T {
  const { row } = data;
  const textos = traducir({ commonName: row.commonName, shortStory: row.shortStory, story: row.story }, row.translations, idioma);
  return { ...data, row: { ...row, ...textos }, stages: data.stages.map((s) => ({ ...s, ...etapaEnIdioma(s, idioma) })) };
}

/** Además del caso y sus etapas, los conceptos de los gastos y las descripciones de los hitos. */
function detalleEnIdioma(data: CaseDetailData, idioma: Idioma): CaseDetailData {
  return {
    ...casoEnIdioma(data, idioma),
    expenses: data.expenses.map((e) => ({ ...e, ...traducir({ concept: e.concept }, e.translations, idioma) })),
    milestones: data.milestones.map((m) => ({ ...m, ...traducir({ description: m.description }, m.translations, idioma) })),
  };
}

function etapaEnIdioma(stage: StageRow, idioma: Idioma): Pick<StageRow, "name" | "shortName" | "covers"> {
  return traducir({ name: stage.name, shortName: stage.shortName, covers: stage.covers }, stage.translations, idioma);
}

/** Estado de cada etapa según lo cubierto, para que nunca diga «completada» con la etapa sin cubrir. */
function statusesOf(
  stages: ReadonlyArray<{ id: string; position: number; cost: string }>,
  coveredByStage: Record<string, string>,
): Map<number, StageStatus> {
  return stageStatusesFromFunding(
    stages.map((s) => ({ position: s.position, cost: s.cost, covered: coveredByStage[s.id] ?? "0" })),
  );
}

function chipFor(row: CaseRow, ordered: Array<{ shortName: string; status: StageStatus }>): CaseChip {
  if (row.status === "recuperado") {
    return { label: row.outcomeLabel ?? "Recuperado", tone: row.outcome === "liberado" ? "logro" : "reserva" };
  }
  const current =
    ordered.find((s) => s.status === "en_curso") ?? ordered.find((s) => s.status === "pendiente") ?? ordered.at(-1);
  return { label: current?.shortName ?? "Ingreso", tone: "etapa" };
}

function normalize(amount: string): string {
  return fromStroops(toStroops(amount));
}
