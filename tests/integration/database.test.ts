import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as srpClient from "secure-remote-password/client";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CatalogService } from "@/modules/catalog";
import {
  createSession,
  findSessionUser,
  finishLogin,
  registerAccount,
  startLogin,
  TooManyAttemptsError,
} from "@/platform/auth";
import type { Db } from "@/platform/db/client";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import { DbContributionStore } from "@/platform/db/repositories/contributions";
import { getPortalData } from "@/platform/db/repositories/portal";
import * as schema from "@/platform/db/schema";
import { resetDemo, seedDemo } from "@/platform/db/seed-demo";
import { sha256Hex } from "@/lib/hash";
import { DbEvidenceStorage } from "@/platform/storage/db-storage";
import { LocalEvidenceStorage } from "@/platform/storage/local-storage";

/**
 * Pruebas contra PostgreSQL real. VACÍAN la base de TEST_DATABASE_URL: debe ser una base desechable,
 * distinta de la de la demo. Sin TEST_DATABASE_URL se omiten.
 */
const url = process.env.TEST_DATABASE_URL;
const SECRET = "s".repeat(40);

describe.skipIf(!url)("integración con PostgreSQL", () => {
  let client: postgres.Sql;
  let db: Db;
  let evidenceDir: string;
  let catalog: CatalogService;

  beforeAll(async () => {
    if (url === process.env.DATABASE_URL) {
      throw new Error("TEST_DATABASE_URL no puede ser la misma base de la demo: estas pruebas la vacían.");
    }
    client = postgres(url!, { max: 4, onnotice: () => {} });
    db = drizzle(client, { schema }) as unknown as Db;
    await migrate(db, { migrationsFolder: "drizzle" });
    await resetDemo(db);
    evidenceDir = await mkdtemp(path.join(os.tmpdir(), "pow-it-"));
    const storage = new LocalEvidenceStorage(evidenceDir);
    await seedDemo(db, { password: "clave-de-prueba", withActivity: true, storage, today: "2026-11-10" });
    catalog = new CatalogService(new DbCatalogReader(db), {
      explorerBaseUrl: "https://stellar.expert/explorer/testnet",
      evidenceUrl: (k) => (k.startsWith("/") ? k : storage.publicUrl(k)),
    });
  }, 60_000);

  afterAll(async () => {
    await client?.end();
    if (evidenceDir) await rm(evidenceDir, { recursive: true, force: true });
  });

  describe("catálogo público", () => {
    it("lista primero los casos en tratamiento y después los recuperados", async () => {
      const cases = await catalog.listCases("es");
      expect(cases.map((c) => c.code)).toEqual(["POW_001", "POW_002", "POW_003", "POW_004", "POW_005"]);
      expect(cases.map((c) => c.recovered)).toEqual([false, false, true, true, true]);
      // Antes del aporte en vivo la guacamaya está en 0: su etapa actual es la 1 (pasa a «Cuidados especiales»
      // cuando Ana cubre los 40 USDC del medicamento).
      expect(cases[0]).toMatchObject({ raised: "0.0000000", goal: "150.0000000", chip: { label: "Medicamento" } });
    });

    it("el estado de cada etapa sale de lo cubierto: la guacamaya en 0 no muestra la etapa 1 completada", async () => {
      const d = (await catalog.caseDetail("POW_001", "es"))!;
      expect(d.stages.map((s) => [s.status, s.covered])).toEqual([
        ["en_curso", "0.0000000"],
        ["pendiente", "0.0000000"],
        ["pendiente", "0.0000000"],
        ["pendiente", "0.0000000"],
      ]);
      const tortuga = (await catalog.caseDetail("POW_002", "es"))!;
      expect(tortuga.stages.map((s) => s.status)).toEqual(["completada", "en_curso", "pendiente", "pendiente"]);
    });

    it("la foto de una etapa se ve cuando la etapa ya empezó, no mientras está pendiente", async () => {
      const guacamaya = (await catalog.caseDetail("POW_001", "es"))!;
      expect(guacamaya.stages.map((s) => s.photoUrl)).toEqual(["/fotos/etapas/pow_001-etapa-1.webp", null, null, null]);
      const zarigueya = (await catalog.caseDetail("POW_003", "es"))!;
      expect(zarigueya.stages.map((s) => s.photoUrl)).toEqual([1, 2, 3, 4].map((n) => `/fotos/etapas/pow_003-etapa-${n}.webp`));
    });

    it("el portal pide la foto del avance de la etapa que está en curso según lo cubierto", async () => {
      const [alas] = await db
        .select({ id: schema.ngos.id })
        .from(schema.ngos)
        .where(eq(schema.ngos.slug, "refugio-alas-libres"));
      const portal = (await getPortalData(db, alas!.id, "es"))!;
      const fotos = portal.pending.flatMap((p) => (p.kind === "subir_foto" ? [[p.stage, p.stageName, p.caseCode]] : []));
      expect(fotos).toEqual([[1, "Medicamento para el ala", "POW_001"]]);
    });

    it("el detalle cuadra con los datos de prueba: tortuga con 35 recibidos, 25 gastados y 10 disponibles", async () => {
      const d = (await catalog.caseDetail("POW_002", "es"))!;
      expect(d.transparency).toMatchObject({ received: "35.0000000", spent: "25.0000000", available: "10.0000000" });
      expect(d.stages.map((s) => [s.covered, s.cost])).toEqual([
        ["25.0000000", "25.0000000"],
        ["10.0000000", "35.0000000"],
        ["0.0000000", "20.0000000"],
        ["0.0000000", "10.0000000"],
      ]);
      expect(d.stages[2]!.waitingForPrevious).toBe(true);
      expect(d.contributions).toHaveLength(2);
      expect(d.transparency.expenses[0]).toMatchObject({ providerName: "Clínica Veterinaria Sabana", invoiceNumber: "FV-0388" });
    });

    it("no expone identificadores internos, correos, NIT ni teléfonos", async () => {
      const json = JSON.stringify([await catalog.caseDetail("POW_004", "es"), await catalog.listCases("es")]);
      const internalIds = [
        ...(await db.select({ id: schema.cases.id }).from(schema.cases)),
        ...(await db.select({ id: schema.stages.id }).from(schema.stages)),
        ...(await db.select({ id: schema.ngos.id }).from(schema.ngos)),
        ...(await db.select({ id: schema.users.id }).from(schema.users)),
        ...(await db.select({ id: schema.providers.id }).from(schema.providers)),
      ].map((r) => r.id);
      for (const id of internalIds) expect(json).not.toContain(id);
      expect(json).not.toContain("@");
      expect(json).not.toContain("900.000");
      expect(json).not.toContain("+57");
    });

    it("devuelve nulo para un código inexistente o con formato inválido", async () => {
      expect(await catalog.caseDetail("POW_999", "es")).toBeNull();
      expect(await catalog.caseDetail("POW-001", "es")).toBeNull();
    });
  });

  describe("reglas en la base de datos", () => {
    it("un aporte confirmado necesita fecha de confirmación y un código de caso válido", async () => {
      const [c] = await db.select({ id: schema.cases.id }).from(schema.cases).limit(1);
      await expect(
        db.insert(schema.contributions).values({
          caseId: c!.id,
          donorAccount: "G" + "A".repeat(55),
          amount: "1",
          txHash: "a".repeat(64),
          status: "confirmada",
        }),
      ).rejects.toThrow();
      await expect(
        db.execute(`update cases set code = 'POW-001' where id = '${c!.id}'`),
      ).rejects.toThrow();
    });
  });

  describe("evidencias guardadas en la base de datos", () => {
    it("guarda un PDF tal cual y lo devuelve con el mismo hash", async () => {
      const storage = new DbEvidenceStorage(db);
      const pdf = new TextEncoder().encode("%PDF-1.4 factura de prueba");
      const stored = await storage.save({ data: pdf, contentType: "application/pdf" });
      expect(stored.key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
      expect(stored.sha256).toBe(await sha256Hex(pdf));
      expect(await storage.read(stored.key)).toEqual(pdf);
      expect(storage.publicUrl(stored.key)).toBe(`/api/evidencias/${stored.key}`);
    });

    it("guarda las imágenes sin EXIF y rechaza claves desconocidas o con rutas", async () => {
      const storage = new DbEvidenceStorage(db);
      const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#386641" } })
        .jpeg()
        .withExif({ IFD0: { Artist: "persona" } })
        .toBuffer();
      const stored = await storage.save({ data: new Uint8Array(jpeg), contentType: "image/jpeg" });
      const saved = await storage.read(stored.key);
      expect((await sharp(saved).metadata()).exif).toBeUndefined();
      expect(stored.sha256).toBe(await sha256Hex(saved));
      await expect(storage.read("00000000-0000-0000-0000-000000000000.pdf")).rejects.toThrow(RangeError);
      await expect(storage.read("../secreto.pdf")).rejects.toThrow(RangeError);
    });
  });

  describe("copias de los aportes (ADR-12)", () => {
    it("un aporte rechazado por la red se puede reenviar con la misma transacción y confirmarse", async () => {
      const store = new DbContributionStore(db);
      const [pow1] = await db.select({ id: schema.cases.id }).from(schema.cases).where(eq(schema.cases.code, "POW_001"));
      const txHash = "e".repeat(64);
      const input = { caseId: pow1!.id, donorAccount: "G" + "E".repeat(55), amount: "5", txHash };
      await store.saveSubmitted(input);
      await store.markFailed(txHash, "La firma no corresponde a la cuenta esperada.");
      expect(await store.find(txHash)).toMatchObject({ status: "fallida" });

      await store.saveSubmitted(input);
      expect(await store.find(txHash)).toMatchObject({ status: "enviada", lastError: null });
      await store.markConfirmed(txHash, { confirmedAt: new Date("2026-11-10T12:00:00Z"), allocations: [] });
      await store.saveSubmitted(input);
      expect(await store.find(txHash)).toMatchObject({ status: "confirmada" });
      await db.delete(schema.contributions).where(eq(schema.contributions.txHash, txHash));
    });
  });

  describe("cuentas con SRP-6a", () => {
    const email = "Ana.M@Demo.Example";
    const password = "una-clave-larga";

    async function login(pass: string, mail = email) {
      const user = mail.trim().toLowerCase();
      const eph = srpClient.generateEphemeral();
      const challenge = await startLogin(db, mail, eph.public, SECRET);
      const key = srpClient.derivePrivateKey(challenge.salt, user, pass);
      const session = srpClient.deriveSession(eph.secret, challenge.serverPublic, challenge.salt, user, key);
      const result = await finishLogin(db, challenge.challengeId, session.proof, SECRET);
      if (result) srpClient.verifySession(eph.public, session, result.serverProof);
      return { result, challenge, proof: session.proof };
    }

    beforeAll(async () => {
      const user = email.toLowerCase();
      const salt = srpClient.generateSalt();
      const verifier = srpClient.deriveVerifier(srpClient.derivePrivateKey(salt, user, password));
      await registerAccount(db, { email, role: "persona", salt, verifier });
    });

    it("la base de datos guarda la sal y el verificador, nunca la contraseña", async () => {
      const rows = await db.select().from(schema.users);
      expect(JSON.stringify(rows)).not.toContain(password);
    });

    it("inicia sesión con la contraseña correcta y el navegador verifica al servidor (M2)", async () => {
      const { result } = await login(password);
      expect(result?.role).toBe("persona");
      const { token } = await createSession(db, result!.userId);
      const user = await findSessionUser(db, token);
      expect(user).toMatchObject({ email: "ana.m@demo.example", role: "persona", profileCompleted: false });
    });

    it("un desafío se usa una sola vez", async () => {
      const { challenge, proof } = await login(password);
      expect(await finishLogin(db, challenge.challengeId, proof, SECRET)).toBeNull();
    });

    it("un correo inexistente recibe un señuelo con el mismo formato y nunca entra", async () => {
      const { result, challenge } = await login(password, "nadie@demo.example");
      expect(challenge.salt).toMatch(/^[0-9a-f]{64}$/);
      expect(result).toBeNull();
    });

    it("bloquea el inicio de sesión tras 5 intentos fallidos en 15 minutos", async () => {
      for (let i = 0; i < 5; i++) expect((await login("clave-incorrecta")).result).toBeNull();
      await expect(login(password)).rejects.toThrow(TooManyAttemptsError);
    });
  });
});
