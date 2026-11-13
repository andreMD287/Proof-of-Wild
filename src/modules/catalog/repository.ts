import type { TextosCaso, TextosEtapa, TextosGasto, TextosHito, Traducciones } from "@/i18n/contenido";
import type { StageStatus } from "../cases";

/**
 * Puerto de lectura del lado público (ADR-06): lee de la base de datos, nunca de la red.
 * Solo trae lo que ya se confirmó en la red (aportes, gastos e hitos en estado «confirmada»).
 * Los textos de la ONG llegan como los escribió, con sus traducciones aparte (`translations`); el servicio elige el
 * idioma de cada página.
 */

export type AnimalGroup = "ave" | "mamifero" | "reptil" | "anfibio";
export type CaseOutcome = "liberado" | "en_reserva" | "reubicado" | "fallecido";
export type ValidationLevel = "presentado" | "revisado" | "verificado_independiente";
export type ExpenseCategory =
  | "alimentacion"
  | "atencion_veterinaria"
  | "medicamentos"
  | "rehabilitacion"
  | "traslado_liberacion";

export interface CaseRow {
  id: string;
  code: string;
  commonName: string;
  scientificName: string;
  group: AnimalGroup;
  speciesPublic: boolean;
  shortStory: string;
  story: string;
  translations: Traducciones<TextosCaso>;
  photoPath: string | null;
  intakeDate: string;
  status: "activo" | "recuperado";
  outcome: CaseOutcome | null;
  outcomeLabel: string | null;
  outcomeDate: string | null;
  ngo: { slug: string; name: string };
}

export interface StageRow {
  id: string;
  position: number;
  name: string;
  shortName: string;
  covers: string | null;
  translations: Traducciones<TextosEtapa>;
  cost: string;
  photoPath: string | null;
  status: StageStatus;
}

export interface ContributionRow {
  txHash: string;
  donorAccount: string;
  amount: string;
  confirmedAt: Date;
  allocations: Array<{ stageId: string; amount: string }>;
}

export interface ExpenseRow {
  stageId: string;
  providerName: string;
  category: ExpenseCategory;
  concept: string | null;
  translations: Traducciones<TextosGasto>;
  amount: string;
  occurredOn: string;
  invoiceNumber: string;
  invoiceKey: string;
  txHash: string;
  validationLevel: ValidationLevel;
}

export interface MilestoneRow {
  stageId: string;
  occurredOn: string;
  description: string;
  translations: Traducciones<TextosHito>;
  photoKey: string | null;
  txHash: string;
  validationLevel: ValidationLevel;
}

/** Caso con sus etapas y lo cubierto por etapa (suma de los repartos de los aportes confirmados). */
export interface CaseWithFunding {
  row: CaseRow;
  stages: StageRow[];
  coveredByStage: Record<string, string>;
}

export interface CaseDetailData extends CaseWithFunding {
  contributions: ContributionRow[];
  expenses: ExpenseRow[];
  milestones: MilestoneRow[];
}

export interface CatalogReader {
  listCases(): Promise<CaseWithFunding[]>;
  getCase(code: string): Promise<CaseDetailData | null>;
  /** Lo que los aportes confirmados de una billetera asignaron a cada etapa del caso. */
  donorAllocations(code: string, account: string): Promise<Array<{ position: number; amount: string }>>;
  getReceipt(txHash: string): Promise<ReceiptRow | null>;
}

export interface ReceiptRow {
  txHash: string;
  caseCode: string;
  commonName: string;
  caseTranslations: Traducciones<TextosCaso>;
  speciesPublic: boolean;
  photoPath: string | null;
  ngoName: string;
  donorAccount: string;
  amount: string;
  confirmedAt: Date;
  allocations: Array<{ position: number; stageName: string; stageTranslations: Traducciones<TextosEtapa>; amount: string }>;
}
