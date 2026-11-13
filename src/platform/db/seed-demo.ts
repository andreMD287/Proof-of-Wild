import { randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { and, eq, sql } from "drizzle-orm";
import * as srpClient from "secure-remote-password/client";
import { fromStroops, toStroops } from "@/lib/amount";
import { canonicalJson, sha256Hex } from "@/lib/hash";
import { allocateContribution } from "@/modules/cases";
import { normalizeEmail } from "@/platform/auth/srp";
import type { EvidenceStorage } from "@/ports/evidence-storage";
import type { Db } from "./client";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_CASES,
  DEMO_CONTRIBUTIONS,
  DEMO_DONORS,
  DEMO_NGOS,
  DEMO_PROVIDERS,
  DEMO_VOLUNTEERINGS,
  type AccountKey,
} from "./demo-data";
import { invoicePdf } from "./invoice-pdf";
import {
  cases,
  contributionAllocations,
  contributions,
  donors,
  expenses,
  milestones,
  ngos,
  providerNgos,
  providers,
  stages,
  users,
  volunteerings,
} from "./schema";

export interface SeedOptions {
  /** Contraseña de las cuentas que crea el script (administrador y las 2 ONG). Si falta, se genera una. */
  password?: string;
  /**
   * Cuentas públicas de Stellar por clave corta (ONG_ALAS, PROV_ARRAYAN, DON_ANA…), tal como las dejó el script
   * de preparación de la red. Las que falten se generan al azar y NO existen en la red.
   */
  accounts?: Record<AccountKey, string>;
  /**
   * Agrega aportes, gastos e hitos con hashes de transacción inventados que NO existen en la red. Solo sirve
   * para trabajar la interfaz; en la demo los carga el script que llama al contrato.
   */
  withActivity?: boolean;
  /** Necesario con `withActivity`: guarda las facturas de prueba en PDF. */
  storage?: EvidenceStorage;
  /** Fecha para los gastos e hitos sin fecha en los datos de prueba (por defecto, hoy). */
  today?: string;
}

export interface SeedResult {
  skipped: boolean;
  /** Contraseña generada, si no se pasó una. Se muestra una sola vez. */
  generatedPassword: string | null;
  /** Claves de cuentas que se inventaron porque no venían del script de la red. */
  generatedAccounts: AccountKey[];
}

/** Hash inventado y reproducible para la actividad de ejemplo. Parece un hash de transacción pero no existe. */
const fakeTx = (label: string) => sha256Hex(`pow-demo:${label}`);

function credentials(email: string, password: string) {
  const salt = srpClient.generateSalt();
  const verifier = srpClient.deriveVerifier(srpClient.derivePrivateKey(salt, normalizeEmail(email), password));
  return { srpSalt: salt, srpVerifier: verifier };
}

/** Borra todos los datos. Solo para la base de datos local de la demo o de pruebas. */
export async function resetDemo(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE
    evidence_files, audit_log, enrollments, volunteerings, contribution_allocations, contributions, expenses, milestones,
    stages, cases, provider_ngos, providers, donors, ngos, sessions, auth_challenges, person_profiles, users
    CASCADE`);
}

export async function seedDemo(db: Db, options: SeedOptions = {}): Promise<SeedResult> {
  const existing = await db.select({ id: cases.id }).from(cases).limit(1);
  if (existing.length > 0) return { skipped: true, generatedPassword: null, generatedAccounts: [] };

  const password = options.password ?? randomBytes(9).toString("base64url");
  const generatedAccounts: AccountKey[] = [];
  const account = (key: AccountKey) => {
    const known = options.accounts?.[key];
    if (known) return known;
    generatedAccounts.push(key);
    const random = Keypair.random().publicKey();
    (options.accounts ??= {})[key] = random;
    return random;
  };
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({ email: DEMO_ADMIN_EMAIL, role: "admin", ...credentials(DEMO_ADMIN_EMAIL, password) });

    const ngoIds: Record<AccountKey, string> = {};
    for (const ngo of DEMO_NGOS) {
      const [user] = await tx
        .insert(users)
        .values({ email: ngo.loginEmail, role: "ong", ...credentials(ngo.loginEmail, password) })
        .returning({ id: users.id });
      const { key, loginEmail: _, ...data } = ngo;
      const [row] = await tx
        .insert(ngos)
        .values({
          ...data,
          userId: user!.id,
          stellarAccount: account(key),
          status: "aprobada",
          dataConsentAt: now,
          approvedAt: now,
        })
        .returning({ id: ngos.id });
      ngoIds[key] = row!.id;
    }

    const providerIds: Record<AccountKey, string> = {};
    for (const provider of DEMO_PROVIDERS) {
      const [row] = await tx
        .insert(providers)
        .values({ name: provider.name, sells: provider.sells, city: provider.city, stellarAccount: account(provider.key) })
        .returning({ id: providers.id });
      providerIds[provider.key] = row!.id;
      await tx.insert(providerNgos).values(provider.ngos.map((n) => ({ providerId: row!.id, ngoId: ngoIds[n]! })));
    }

    const stageIds: Record<string, string[]> = {};
    const caseIds: Record<string, string> = {};
    for (const demoCase of DEMO_CASES) {
      const [row] = await tx
        .insert(cases)
        .values({
          code: demoCase.code,
          ngoId: ngoIds[demoCase.ngo]!,
          commonName: demoCase.commonName,
          scientificName: demoCase.scientificName,
          group: demoCase.group,
          shortStory: demoCase.shortStory,
          story: demoCase.story,
          translations: demoCase.translations,
          photoPath: demoCase.photoPath,
          intakeDate: demoCase.intakeDate,
          status: demoCase.outcome ? "recuperado" : "activo",
          outcome: demoCase.outcome?.kind ?? null,
          outcomeLabel: demoCase.outcome?.label ?? null,
          outcomeDate: demoCase.outcome?.date ?? null,
        })
        .returning({ id: cases.id });
      caseIds[demoCase.code] = row!.id;
      const inserted = await tx
        .insert(stages)
        .values(
          demoCase.stages.map((s, i) => ({
            caseId: row!.id,
            position: i + 1,
            name: s.name,
            shortName: s.shortName,
            covers: s.covers,
            translations: s.translations,
            cost: s.cost,
            status: s.status,
            photoPath: s.photoPath ?? null,
          })),
        )
        .returning({ id: stages.id, position: stages.position });
      stageIds[demoCase.code] = inserted.sort((a, b) => a.position - b.position).map((s) => s.id);
    }

    await tx
      .insert(donors)
      .values(Object.entries(DEMO_DONORS).map(([key, alias]) => ({ stellarAccount: account(key), alias })));

    for (const v of DEMO_VOLUNTEERINGS) {
      const { ngo, ...data } = v;
      await tx.insert(volunteerings).values({ ...data, ngoId: ngoIds[ngo]! });
    }

    if (!options.withActivity) return;
    if (!options.storage) throw new Error("La actividad de ejemplo necesita el almacén de evidencias.");

    // Aportes en el orden del documento, repartidos como lo haría el contrato.
    const covered: Record<string, bigint[]> = {};
    for (const [index, c] of DEMO_CONTRIBUTIONS.entries()) {
      const demoCase = DEMO_CASES.find((d) => d.code === c.caseCode)!;
      const current = (covered[c.caseCode] ??= demoCase.stages.map(() => 0n));
      const allocation = allocateContribution(
        demoCase.stages.map((s, i) => ({ position: i + 1, cost: s.cost, covered: fromStroops(current[i]!) })),
        c.amount,
      );
      const [row] = await tx
        .insert(contributions)
        .values({
          caseId: caseIds[c.caseCode]!,
          donorAccount: account(c.donor),
          amount: c.amount,
          txHash: await fakeTx(`aporte:${index}`),
          status: "confirmada",
          confirmedAt: new Date(now.getTime() - (DEMO_CONTRIBUTIONS.length - index) * 3_600_000),
        })
        .returning({ id: contributions.id });
      await tx.insert(contributionAllocations).values(
        allocation.map((a) => ({
          contributionId: row!.id,
          stageId: stageIds[c.caseCode]![a.position - 1]!,
          amount: a.amount,
        })),
      );
      for (const a of allocation) current[a.position - 1]! += toStroops(a.amount);
    }

    // Gastos con su factura de prueba en PDF e hitos.
    for (const demoCase of DEMO_CASES) {
      const ngo = DEMO_NGOS.find((n) => n.key === demoCase.ngo)!;
      for (const [i, stage] of demoCase.stages.entries()) {
        const stageId = stageIds[demoCase.code]![i]!;
        if (stage.expense) {
          const e = stage.expense;
          const provider = DEMO_PROVIDERS.find((p) => p.key === e.provider)!;
          const occurredOn = e.occurredOn ?? today;
          const stored = await options.storage.save({
            contentType: "application/pdf",
            data: invoicePdf({
              number: e.invoiceNumber,
              date: occurredOn,
              providerName: provider.name,
              providerCity: provider.city,
              ngoName: ngo.name,
              ngoNit: ngo.nit,
              caseCode: demoCase.code,
              stageName: stage.name,
              concept: e.concept ?? stage.covers,
              amount: e.amount,
              assetCode: "USDC",
            }),
          });
          await tx.insert(expenses).values({
            caseId: caseIds[demoCase.code]!,
            stageId,
            providerId: providerIds[e.provider]!,
            category: e.category,
            concept: e.concept ?? null,
            translations: e.translations ?? {},
            amount: e.amount,
            occurredOn,
            invoiceNumber: e.invoiceNumber,
            invoiceKey: stored.key,
            invoiceHash: stored.sha256,
            txHash: await fakeTx(`gasto:${demoCase.code}:${i + 1}`),
            status: "confirmada",
            validationLevel: e.validationLevel,
          });
        }
        if (stage.milestone) {
          const m = stage.milestone;
          const occurredOn = m.occurredOn ?? today;
          await tx.insert(milestones).values({
            caseId: caseIds[demoCase.code]!,
            stageId,
            occurredOn,
            description: m.description,
            translations: m.translations,
            photoKey: m.photoPath,
            // Sin foto, el hash es el del JSON canónico del registro.
            evidenceHash: await sha256Hex(
              canonicalJson({ caso: demoCase.code, etapa: i + 1, fecha: occurredOn, descripcion: m.description }),
            ),
            txHash: await fakeTx(`hito:${demoCase.code}:${i + 1}`),
            status: "confirmada",
            validationLevel: m.validationLevel,
          });
        }
      }
    }
  });

  return { skipped: false, generatedPassword: options.password ? null : password, generatedAccounts };
}

/**
 * Pone las traducciones de los datos de prueba en una base que ya tiene la demo cargada (por ejemplo, la que dejó
 * `red:preparar` antes de que existieran). Busca cada fila por lo que no cambia: el slug de la ONG, el código del
 * caso y la posición de la etapa, el número de factura y el texto original del hito o del voluntariado. Así no toca
 * lo que se registró en vivo durante la demo. Se puede correr las veces que haga falta.
 */
export async function applyDemoTranslations(db: Db): Promise<{ updated: number }> {
  let updated = 0;
  const count = (rows: unknown[]) => (updated += rows.length);
  await db.transaction(async (tx) => {
    for (const ngo of DEMO_NGOS) {
      count(
        await tx
          .update(ngos)
          .set({ translations: ngo.translations })
          .where(eq(ngos.slug, ngo.slug))
          .returning({ id: ngos.id }),
      );
      const [row] = await tx.select({ id: ngos.id }).from(ngos).where(eq(ngos.slug, ngo.slug)).limit(1);
      if (!row) continue;
      for (const v of DEMO_VOLUNTEERINGS.filter((x) => x.ngo === ngo.key)) {
        count(
          await tx
            .update(volunteerings)
            .set({ translations: v.translations })
            .where(and(eq(volunteerings.ngoId, row.id), eq(volunteerings.title, v.title)))
            .returning({ id: volunteerings.id }),
        );
      }
    }

    for (const demoCase of DEMO_CASES) {
      const [row] = await tx
        .update(cases)
        .set({ translations: demoCase.translations })
        .where(eq(cases.code, demoCase.code))
        .returning({ id: cases.id });
      if (!row) continue;
      count([row]);
      for (const [i, stage] of demoCase.stages.entries()) {
        const [stageRow] = await tx
          .update(stages)
          .set({ translations: stage.translations })
          .where(and(eq(stages.caseId, row.id), eq(stages.position, i + 1)))
          .returning({ id: stages.id });
        if (!stageRow) continue;
        count([stageRow]);
        if (stage.expense?.translations) {
          count(
            await tx
              .update(expenses)
              .set({ translations: stage.expense.translations })
              .where(and(eq(expenses.stageId, stageRow.id), eq(expenses.invoiceNumber, stage.expense.invoiceNumber)))
              .returning({ id: expenses.id }),
          );
        }
        if (stage.milestone) {
          count(
            await tx
              .update(milestones)
              .set({ translations: stage.milestone.translations })
              .where(and(eq(milestones.stageId, stageRow.id), eq(milestones.description, stage.milestone.description)))
              .returning({ id: milestones.id }),
          );
        }
      }
    }
  });
  return { updated };
}
