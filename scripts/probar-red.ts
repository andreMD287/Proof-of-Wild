/**
 * Prueba de punta a punta contra Stellar testnet, SIN tocar la demo:
 *
 *   npm run red:probar
 *
 * Crea cuentas nuevas, un USDC de prueba propio y un contrato Proof of Wild desechable, y usa la base de
 * TEST_DATABASE_URL (que vacía). Con eso recorre el camino real del servidor: el servicio arma la transacción,
 * una llave la firma (como lo haría la billetera), el servicio la envía y la confirma leyendo la red.
 *
 * - Aporte: reparto previsto = reparto del contrato = reparto guardado; rechazos (supera la meta, firma ajena,
 *   cuenta sin USDC).
 * - Gasto: paga al proveedor desde la etapa (saldo en Horizon) y guarda el hash de la factura; rechazos
 *   (supera lo cubierto de la etapa, transacción firmada que no coincide con lo registrado).
 * - Hito con foto: el hash de la foto (ya sin EXIF) queda en el contrato.
 * - Lo que muestran el catálogo, el comprobante y el perfil del donante coincide con `consultar_caso`.
 *
 * No escribe .env ni .data/cuentas-demo.json. Requiere el WASM compilado (npm run contrato:build).
 */
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import {
  Address,
  Asset,
  Horizon,
  Keypair,
  Operation,
  rpc,
  scValToNative,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import sharp from "sharp";
import { fromStroops, toStroops } from "@/lib/amount";
import { CatalogService } from "@/modules/catalog";
import { ContributionService } from "@/modules/contributions";
import { RecordService } from "@/modules/records";
import { DomainError } from "@/modules/shared/errors";
import type { Db } from "@/platform/db/client";
import { DEMO_CASES } from "@/platform/db/demo-data";
import { invoicePdf } from "@/platform/db/invoice-pdf";
import { DbCatalogReader } from "@/platform/db/repositories/catalog";
import { DbContributionStore } from "@/platform/db/repositories/contributions";
import { getDonorView } from "@/platform/db/repositories/donor";
import { DbRecordStore } from "@/platform/db/repositories/records";
import * as schema from "@/platform/db/schema";
import { resetDemo, seedDemo } from "@/platform/db/seed-demo";
import { cleanDatabaseUrl } from "@/platform/db/url";
import { SorobanContractLedger } from "@/platform/stellar/contract-ledger";
import {
  proofOfWildClient,
  signAndSend,
  submitSorobanOperation,
  unwrapResult,
} from "@/platform/stellar/proof-of-wild-contract";
import { DbEvidenceStorage } from "@/platform/storage/db-storage";

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const RPC_URL = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const WASM = path.resolve("contracts/proof-of-wild/target/wasm32v1-none/release/proof_of_wild.wasm");
const CASE = DEMO_CASES.find((c) => c.code === "POW_001")!;

const horizon = new Horizon.Server(HORIZON_URL);
const server = new rpc.Server(RPC_URL);
let checks = 0;

function ok(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Falló: ${message}`);
  checks += 1;
  console.log(`  ✓ ${message}`);
}

function same(actual: unknown, expected: unknown, message: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`Falló: ${message}\n    esperado ${e}\n    obtenido ${a}`);
  checks += 1;
  console.log(`  ✓ ${message}`);
}

/** La promesa debe fallar con un error de dominio cuyo mensaje contenga el texto. */
async function rejects(promise: Promise<unknown>, text: string, message: string) {
  try {
    await promise;
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    if (!error.message.includes(text)) throw new Error(`Falló: ${message}\n    mensaje: ${error.message}`);
    checks += 1;
    console.log(`  ✓ ${message} («${error.message}»)`);
    return;
  }
  throw new Error(`Falló: ${message} (no fue rechazado)`);
}

const sign = (xdr: string, key: Keypair) => {
  const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE);
  tx.sign(key);
  return tx.toXDR();
};

/** Monto sin ceros de sobra, para comparar: "40.0000000" → "40". */
const units = (amount: string) => fromStroops(toStroops(amount)).replace(/0+$/, "").replace(/\.$/, "");

async function friendbot(account: string) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(`https://friendbot.stellar.org/?addr=${account}`);
    if (response.ok) return;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`Friendbot no fondeó ${account}.`);
}

async function classic(source: Keypair, build: (b: TransactionBuilder) => TransactionBuilder) {
  const account = await horizon.loadAccount(source.publicKey());
  const tx = build(new TransactionBuilder(account, { fee: "10000", networkPassphrase: NETWORK_PASSPHRASE }))
    .setTimeout(120)
    .build();
  tx.sign(source);
  return horizon.submitTransaction(tx);
}

async function usdcBalance(account: string, asset: Asset): Promise<string> {
  const loaded = await horizon.loadAccount(account);
  const line = loaded.balances.find(
    (b) => "asset_code" in b && b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer(),
  );
  return line ? units(line.balance) : "0";
}

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Falta TEST_DATABASE_URL: la prueba usa una base desechable, nunca la de la demo.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL no puede ser la base de la demo: la prueba la vacía.");
  if (!existsSync(WASM)) throw new Error(`Falta el WASM del contrato (${WASM}). Compílalo con: npm run contrato:build`);

  console.log("\n▸ Cuentas, USDC de prueba y contrato desechables");
  const keys = {
    ADMIN: Keypair.random(),
    EMISOR: Keypair.random(),
    ONG_ALAS: Keypair.random(),
    PROV_ARRAYAN: Keypair.random(),
    DON_ANA: Keypair.random(),
    SIN_USDC: Keypair.random(),
  };
  await Promise.all(Object.values(keys).map((k) => friendbot(k.publicKey())));
  const usdc = new Asset("USDC", keys.EMISOR.publicKey());
  for (const holder of [keys.ONG_ALAS, keys.PROV_ARRAYAN, keys.DON_ANA]) {
    await classic(holder, (b) => b.addOperation(Operation.changeTrust({ asset: usdc })));
  }
  await classic(keys.EMISOR, (b) =>
    b.addOperation(Operation.payment({ destination: keys.DON_ANA.publicKey(), asset: usdc, amount: "100" })),
  );
  const sac = await submitSorobanOperation(server, NETWORK_PASSPHRASE, keys.ADMIN, Operation.createStellarAssetContract({ asset: usdc }));
  const assetContractId = Address.fromScVal(sac.returnValue!).toString();
  const upload = await submitSorobanOperation(server, NETWORK_PASSPHRASE, keys.ADMIN, Operation.uploadContractWasm({ wasm: readFileSync(WASM) }));
  const created = await submitSorobanOperation(
    server,
    NETWORK_PASSPHRASE,
    keys.ADMIN,
    Operation.createCustomContract({
      address: new Address(keys.ADMIN.publicKey()),
      wasmHash: scValToNative(upload.returnValue!) as Buffer,
      salt: randomBytes(32),
    }),
  );
  const contractId = Address.fromScVal(created.returnValue!).toString();
  const network = { rpcUrl: RPC_URL, networkPassphrase: NETWORK_PASSPHRASE, contractId };
  const admin = await proofOfWildClient(network, keys.ADMIN.publicKey(), keys.ADMIN);
  await signAndSend(await admin.inicializar({ admin: keys.ADMIN.publicKey(), token: assetContractId }));
  await signAndSend(
    await admin.crear_caso({ caso: CASE.code, ong: keys.ONG_ALAS.publicKey(), costos_etapas: CASE.stages.map((s) => toStroops(s.cost)) }),
  );
  console.log(`  Contrato desechable ${contractId}`);

  console.log("\n▸ Base de datos de prueba");
  const client = postgres(cleanDatabaseUrl(url), { max: 4, prepare: false, onnotice: () => {} });
  const db = drizzle(client, { schema }) as unknown as Db;
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await resetDemo(db);
    await seedDemo(db, {
      password: randomBytes(12).toString("base64url"),
      accounts: {
        ONG_ALAS: keys.ONG_ALAS.publicKey(),
        PROV_ARRAYAN: keys.PROV_ARRAYAN.publicKey(),
        DON_ANA: keys.DON_ANA.publicKey(),
      },
    });
    const storage = new DbEvidenceStorage(db);
    const ledger = new SorobanContractLedger(network);
    const contributionService = new ContributionService(ledger, new DbContributionStore(db), { pollAttempts: 15, pollIntervalMs: 2000 });
    const recordService = new RecordService(ledger, new DbRecordStore(db), storage, { pollAttempts: 15, pollIntervalMs: 2000 });
    const catalog = new CatalogService(new DbCatalogReader(db), {
      explorerBaseUrl: "https://stellar.expert/explorer/testnet",
      evidenceUrl: (k) => (k.startsWith("/") ? k : storage.publicUrl(k)),
    });
    same(units((await catalog.caseDetail(CASE.code, "es"))!.transparency.received), "0", `${CASE.code} empieza en 0 USDC`);

    // Aporte ----------------------------------------------------------------------------------------------
    console.log("\n▸ Aporte de 50 USDC a POW_001");
    const donor = keys.DON_ANA.publicKey();
    const prepared = await contributionService.prepare({ caseCode: CASE.code, donorAccount: donor, amount: "50" });
    same(
      prepared.allocation.filter((a) => a.amount !== "0").map((a) => [a.position, units(a.amount)]),
      [[1, "40"], [2, "10"]],
      "el reparto previsto llena la etapa 1 (40) y pone 10 en la 2",
    );
    // Firmar con otra llave no cambia la cuenta de origen: la red rechaza la firma y el aporte queda «fallida».
    const wrong = await contributionService.prepare({ caseCode: CASE.code, donorAccount: donor, amount: "5" });
    await rejects(
      contributionService.submit(sign(wrong.xdr, keys.SIN_USDC)),
      "La firma no corresponde",
      "un aporte firmado por otra billetera se rechaza",
    );
    const sent = await contributionService.submit(sign(prepared.xdr, keys.DON_ANA));
    same(sent.status, "confirmada", "el aporte se confirma leyendo la red");
    const [row] = await db.select().from(schema.contributions).where(eq(schema.contributions.txHash, sent.txHash));
    ok(row?.status === "confirmada" && row.confirmedAt, "la copia guardada antes de enviar quedó confirmada con su fecha");
    const allocations = await db
      .select({ position: schema.stages.position, amount: schema.contributionAllocations.amount })
      .from(schema.contributionAllocations)
      .innerJoin(schema.stages, eq(schema.stages.id, schema.contributionAllocations.stageId))
      .where(eq(schema.contributionAllocations.contributionId, row!.id))
      .orderBy(schema.stages.position);
    same(allocations.map((a) => [a.position, units(a.amount)]), [[1, "40"], [2, "10"]], "el reparto guardado es el que devolvió el contrato");
    same((await contributionService.refresh(sent.txHash)).status, "confirmada", "consultar el estado otra vez no cambia nada");
    same(await usdcBalance(donor, usdc), "50", "a la billetera le quedan 50 USDC");

    await rejects(
      contributionService.prepare({ caseCode: CASE.code, donorAccount: donor, amount: "101" }),
      "",
      "un aporte que supera lo que falta para la meta se rechaza antes de firmar",
    );
    await rejects(
      contributionService.prepare({ caseCode: CASE.code, donorAccount: keys.SIN_USDC.publicKey(), amount: "5" }),
      "USDC",
      "una billetera sin USDC recibe un mensaje claro",
    );

    // Gasto -----------------------------------------------------------------------------------------------
    console.log("\n▸ Gasto de 25 USDC en la etapa 1, pagado al proveedor");
    const [ngo] = await db.select().from(schema.ngos).where(eq(schema.ngos.stellarAccount, keys.ONG_ALAS.publicKey()));
    const actor = { userId: ngo!.userId, ngoId: ngo!.id, ngoAccount: ngo!.stellarAccount! };
    const [provider] = await db.select().from(schema.providers).where(eq(schema.providers.stellarAccount, keys.PROV_ARRAYAN.publicKey()));
    const today = new Date().toISOString().slice(0, 10);
    const invoice = invoicePdf({
      number: "FV-PRUEBA-1",
      date: today,
      providerName: provider!.name,
      providerCity: "Villavicencio",
      ngoName: ngo!.name,
      ngoNit: ngo!.nit ?? "",
      caseCode: CASE.code,
      stageName: CASE.stages[0]!.name,
      concept: "Prueba de punta a punta",
      amount: "25",
      assetCode: "USDC",
    });
    const expenseInput = {
      caseCode: CASE.code,
      stage: 1,
      providerId: provider!.id,
      category: "medicamentos" as const,
      occurredOn: today,
      invoiceNumber: "FV-PRUEBA-1",
      concept: "Prueba de punta a punta",
      invoice: { contentType: "application/pdf", data: invoice },
    };
    await rejects(
      recordService.prepareExpense(actor, { ...expenseInput, stage: 2, amount: "11" }),
      "solo tiene 10",
      "un gasto mayor que lo cubierto y sin gastar de la etapa se rechaza",
    );
    const other = await recordService.prepareExpense(actor, { ...expenseInput, amount: "6" });
    const expense = await recordService.prepareExpense(actor, { ...expenseInput, amount: "25" });
    await rejects(
      recordService.submit(actor, "gasto", expense.id, sign(other.xdr, keys.ONG_ALAS)),
      "no coincide",
      "una transacción firmada que no es la del registro se rechaza",
    );
    const expenseResult = await recordService.submit(actor, "gasto", expense.id, sign(expense.xdr, keys.ONG_ALAS));
    same(expenseResult.status, "confirmada", "el gasto se confirma leyendo la red");
    same(await usdcBalance(keys.PROV_ARRAYAN.publicKey(), usdc), "25", "el proveedor recibió 25 USDC del contrato");
    const [expenseRow] = await db.select().from(schema.expenses).where(eq(schema.expenses.id, expense.id));
    ok(expenseRow?.invoiceHash && expenseRow.invoiceKey, "la factura quedó guardada con su hash");
    const savedInvoice = await storage.read(expenseRow!.invoiceKey!);
    same(Buffer.from(savedInvoice).equals(Buffer.from(invoice)), true, "la factura publicada es idéntica a la subida");

    // Hito ------------------------------------------------------------------------------------------------
    console.log("\n▸ Hito con foto en la etapa 1");
    const photo = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#386641" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "prueba" } } })
      .toBuffer();
    const milestone = await recordService.prepareMilestone(actor, {
      caseCode: CASE.code,
      stage: 1,
      occurredOn: today,
      description: "Prueba de punta a punta: el ave recibió su primera dosis.",
      photo: { contentType: "image/jpeg", data: new Uint8Array(photo) },
    });
    const milestoneResult = await recordService.submit(actor, "hito", milestone.id, sign(milestone.xdr, keys.ONG_ALAS));
    same(milestoneResult.status, "confirmada", "el hito se confirma leyendo la red");
    const [milestoneRow] = await db.select().from(schema.milestones).where(eq(schema.milestones.id, milestone.id));
    const onChain = unwrapResult<{ etapa: number; hash_evidencia: Buffer }>(
      (await admin.consultar_hito({ caso: CASE.code, indice: 0 })).result,
    );
    same(
      [Number(onChain.etapa), Buffer.from(onChain.hash_evidencia).toString("hex")],
      [1, milestoneRow!.evidenceHash],
      "el contrato guarda la etapa y el hash de la foto",
    );
    const storedPhoto = await storage.read(milestoneRow!.photoKey!);
    const meta = await sharp(Buffer.from(storedPhoto)).metadata();
    ok(!meta.exif, "la foto publicada ya no tiene EXIF");

    // Lo público coincide con el contrato -------------------------------------------------------------------
    console.log("\n▸ Lo que muestra la página coincide con el contrato");
    const view = unwrapResult<{ recaudado: bigint; gastado: bigint; saldo: bigint; hitos: number }>(
      (await admin.consultar_caso({ caso: CASE.code })).result,
    );
    same([fromStroops(BigInt(view.recaudado)), fromStroops(BigInt(view.gastado)), fromStroops(BigInt(view.saldo))].map(units), ["50", "25", "25"], "el contrato: recaudado 50, gastado 25, saldo 25");
    same(Number(view.hitos), 1, "el contrato tiene 1 hito");
    const detail = await catalog.caseDetail(CASE.code, "es");
    same(
      [detail!.transparency.received, detail!.transparency.spent, detail!.transparency.available].map(units),
      ["50", "25", "25"],
      "el panel de transparencia muestra lo mismo",
    );
    same(
      detail!.stages.map((s) => [s.position, units(s.covered), units(s.spent)]),
      [[1, "40", "25"], [2, "10", "0"], [3, "0", "0"], [4, "0", "0"]],
      "cada etapa muestra lo cubierto y lo gastado",
    );
    ok(detail!.stages[0]!.milestones.length === 1 && detail!.stages[0]!.expenses.length === 1, "la etapa 1 muestra su gasto y su hito");
    const receipt = await catalog.receipt(sent.txHash, "es");
    same(receipt?.allocations.map((a) => [a.position, units(a.amount)]), [[1, "40"], [2, "10"]], "el comprobante muestra el reparto");
    const donorView = await getDonorView(db, donor, "es");
    same([units(donorView.totalAmount), donorView.cases.length], ["50", 1], "el perfil del donante: 50 USDC en 1 caso");
    const confirmedExpenses = await db
      .select({ id: schema.expenses.id })
      .from(schema.expenses)
      .where(and(eq(schema.expenses.caseId, row!.caseId), eq(schema.expenses.status, "confirmada")));
    same(confirmedExpenses.map((e) => e.id), [expense.id], "solo el gasto firmado quedó confirmado (el otro borrador no cuenta)");

    console.log(`\nListo: ${checks} comprobaciones en ${contractId}`);
    console.log(`Stellar Expert: https://stellar.expert/explorer/testnet/contract/${contractId}`);
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✗", error instanceof Error ? error.message : error);
    process.exit(1);
  });
