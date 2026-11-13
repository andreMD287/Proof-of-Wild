/**
 * Prepara la demo en Stellar testnet de principio a fin. Permite rehacer todo en minutos si algo falla
 * (o después del reinicio de testnet):
 *
 *   npm run red:preparar
 *
 * 1. Crea las cuentas de prueba (administrador, emisor del USDC, ONG, proveedores y donantes) y las fondea
 *    con Friendbot. Las llaves quedan en .data/cuentas-demo.json (ignorado por git; solo testnet).
 * 2. Emite el USDC de prueba con su línea de confianza y despliega su Stellar Asset Contract.
 * 3. Sube y despliega el contrato Proof of Wild, lo inicializa y crea los 5 casos con el costo de sus etapas.
 * 4. Reinicia la base de datos y carga los datos de prueba con las cuentas reales.
 * 5. Hace en la red los 13 aportes del documento, en su orden, y los gastos e hitos ya registrados (con su
 *    factura PDF de ejemplo), y guarda en la base de datos una copia de cada transacción.
 * 6. Escribe CONTRACT_ID, ASSET_ISSUER y ASSET_CONTRACT_ID en .env.
 *
 * Requiere el WASM compilado: npm run contrato:build. El aporte de Ana (POW_001) se hace en vivo.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { fromStroops, toStroops } from "@/lib/amount";
import { canonicalJson, sha256Hex } from "@/lib/hash";
import { getDb } from "@/platform/db/client";
import {
  DEMO_ANA_BALANCE,
  DEMO_CASES,
  DEMO_CONTRIBUTIONS,
  DEMO_DONORS,
  DEMO_NGOS,
  DEMO_PROVIDERS,
} from "@/platform/db/demo-data";
import { invoicePdf } from "@/platform/db/invoice-pdf";
import {
  cases,
  contributionAllocations,
  contributions,
  expenses,
  milestones,
  ngos,
  providers,
  stages,
} from "@/platform/db/schema";
import { resetDemo, seedDemo } from "@/platform/db/seed-demo";
import {
  proofOfWildClient,
  signAndSend,
  submitSorobanOperation,
  unwrapResult,
  type ContractNetwork,
} from "@/platform/stellar/proof-of-wild-contract";
import { createEvidenceStorage } from "@/platform/storage";

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const RPC_URL = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const ASSET_CODE = process.env.ASSET_CODE ?? "USDC";
const WASM = path.resolve("contracts/proof-of-wild/target/wasm32v1-none/release/proof_of_wild.wasm");
const ACCOUNTS_FILE = path.resolve(".data/cuentas-demo.json");

const horizon = new Horizon.Server(HORIZON_URL);
const server = new rpc.Server(RPC_URL);
const toUnits = (amount: string) => toStroops(amount);

function log(step: string) {
  console.log(`\n▸ ${step}`);
}

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

function updateEnv(values: Record<string, string>) {
  const file = path.resolve(".env");
  let text = existsSync(file) ? readFileSync(file, "utf8") : "";
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    text = new RegExp(`^${key}=.*$`, "m").test(text)
      ? text.replace(new RegExp(`^${key}=.*$`, "m"), line)
      : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(file, text);
}

async function main() {
  if (!existsSync(WASM)) {
    throw new Error(`Falta el WASM del contrato (${WASM}). Compílalo con: npm run contrato:build`);
  }

  // 1. Cuentas -----------------------------------------------------------------------------------------
  log("Creando y fondeando las cuentas de prueba");
  const keys: Record<string, Keypair> = { ADMIN: Keypair.random(), EMISOR_USDC: Keypair.random() };
  for (const n of DEMO_NGOS) keys[n.key] = Keypair.random();
  for (const p of DEMO_PROVIDERS) keys[p.key] = Keypair.random();
  for (const d of Object.keys(DEMO_DONORS)) keys[d] = Keypair.random();
  const pub = (key: string) => keys[key]!.publicKey();

  const entries = Object.entries(keys);
  for (let i = 0; i < entries.length; i += 4) {
    await Promise.all(entries.slice(i, i + 4).map(([, kp]) => friendbot(kp.publicKey())));
  }
  console.log(`  ${entries.length} cuentas fondeadas con Friendbot`);

  mkdirSync(path.dirname(ACCOUNTS_FILE), { recursive: true });
  const saveAccounts = (extra: Record<string, unknown> = {}) =>
    writeFileSync(
      ACCOUNTS_FILE,
      JSON.stringify(
        {
          aviso: "Cuentas de TESTNET para la demo. No usar en la red principal.",
          public: Object.fromEntries(entries.map(([k, kp]) => [k, kp.publicKey()])),
          secret: Object.fromEntries(entries.map(([k, kp]) => [k, kp.secret()])),
          ...extra,
        },
        null,
        2,
      ),
    );
  saveAccounts();

  // 2. USDC de prueba ----------------------------------------------------------------------------------
  log("Emitiendo el USDC de prueba");
  const usdc = new Asset(ASSET_CODE, pub("EMISOR_USDC"));
  const holders = [...Object.keys(DEMO_DONORS), ...DEMO_PROVIDERS.map((p) => p.key), ...DEMO_NGOS.map((n) => n.key)];
  for (const key of holders) {
    await classic(keys[key]!, (b) => b.addOperation(Operation.changeTrust({ asset: usdc })));
  }
  const needs: Record<string, bigint> = { DON_ANA: toUnits(DEMO_ANA_BALANCE) };
  for (const c of DEMO_CONTRIBUTIONS) needs[c.donor] = (needs[c.donor] ?? 0n) + toUnits(c.amount);
  await classic(keys.EMISOR_USDC!, (b) => {
    for (const [donor, amount] of Object.entries(needs)) {
      b.addOperation(Operation.payment({ destination: pub(donor), asset: usdc, amount: fromStroops(amount) }));
    }
    return b;
  });
  console.log(`  Líneas de confianza para ${holders.length} cuentas; USDC entregado a ${Object.keys(needs).length} donantes`);

  const sac = await submitSorobanOperation(
    server,
    NETWORK_PASSPHRASE,
    keys.ADMIN!,
    Operation.createStellarAssetContract({ asset: usdc }),
  );
  const assetContractId = Address.fromScVal(sac.returnValue!).toString();
  console.log(`  Stellar Asset Contract del USDC: ${assetContractId}`);

  // 3. Contrato ----------------------------------------------------------------------------------------
  log("Desplegando el contrato Proof of Wild");
  const upload = await submitSorobanOperation(
    server,
    NETWORK_PASSPHRASE,
    keys.ADMIN!,
    Operation.uploadContractWasm({ wasm: readFileSync(WASM) }),
  );
  const wasmHash = scValToNative(upload.returnValue!) as Buffer;
  const created = await submitSorobanOperation(
    server,
    NETWORK_PASSPHRASE,
    keys.ADMIN!,
    Operation.createCustomContract({ address: new Address(pub("ADMIN")), wasmHash, salt: randomBytes(32) }),
  );
  const contractId = Address.fromScVal(created.returnValue!).toString();
  console.log(`  Contrato: ${contractId}`);
  saveAccounts({ contrato: contractId, usdc: { code: ASSET_CODE, issuer: pub("EMISOR_USDC"), contract: assetContractId } });
  updateEnv({ CONTRACT_ID: contractId, ASSET_CODE, ASSET_ISSUER: pub("EMISOR_USDC"), ASSET_CONTRACT_ID: assetContractId });

  const network: ContractNetwork = { rpcUrl: RPC_URL, networkPassphrase: NETWORK_PASSPHRASE, contractId };
  const clientFor = (key: string) => proofOfWildClient(network, pub(key), keys[key]);

  const admin = await clientFor("ADMIN");
  await signAndSend(await admin.inicializar({ admin: pub("ADMIN"), token: assetContractId }));
  const caseTx: Record<string, string> = {};
  for (const c of DEMO_CASES) {
    const r = await signAndSend(
      await admin.crear_caso({ caso: c.code, ong: pub(c.ngo), costos_etapas: c.stages.map((s) => toUnits(s.cost)) }),
    );
    caseTx[c.code] = r.txHash;
  }
  console.log(`  Inicializado y con ${DEMO_CASES.length} casos creados`);

  // 4. Base de datos -----------------------------------------------------------------------------------
  log("Cargando los datos de prueba en la base de datos");
  const db = getDb();
  const storage = createEvidenceStorage();
  await resetDemo(db);
  const seed = await seedDemo(db, {
    password: process.env.DEMO_PASSWORD,
    accounts: Object.fromEntries(entries.map(([k, kp]) => [k, kp.publicKey()])),
  });
  if (seed.generatedPassword) console.log(`  Contraseña de las cuentas de demo: ${seed.generatedPassword}`);

  const caseRows = await db.select({ id: cases.id, code: cases.code }).from(cases);
  const caseId = Object.fromEntries(caseRows.map((c) => [c.code, c.id]));
  const stageRows = await db.select({ id: stages.id, caseId: stages.caseId, position: stages.position }).from(stages);
  const stageId = (code: string, position: number) =>
    stageRows.find((s) => s.caseId === caseId[code] && s.position === position)!.id;
  const providerRows = await db.select({ id: providers.id, account: providers.stellarAccount }).from(providers);
  const providerId = (key: string) => providerRows.find((p) => p.account === pub(key))!.id;
  const ngoRows = await db.select({ userId: ngos.userId, account: ngos.stellarAccount }).from(ngos);
  const ngoUser = (key: string) => ngoRows.find((n) => n.account === pub(key))!.userId;
  for (const [code, hash] of Object.entries(caseTx)) {
    await db.update(cases).set({ contractTxHash: hash }).where(eq(cases.code, code));
  }

  // 5. Actividad en la red -----------------------------------------------------------------------------
  log("Haciendo los aportes en la red, en el orden del documento");
  for (const c of DEMO_CONTRIBUTIONS) {
    const donor = await clientFor(c.donor);
    const r = await signAndSend<bigint[]>(
      await donor.aportar({ donante: pub(c.donor), caso: c.caseCode, monto: toUnits(c.amount) }),
    );
    const allocation = r.result.map((units, i) => ({ position: i + 1, amount: fromStroops(BigInt(units)) }));
    const expected = c.expected.map(([position, amount]) => `${position}:${fromStroops(toUnits(amount))}`).join(" ");
    const got = allocation.filter((a) => toStroops(a.amount) > 0n).map((a) => `${a.position}:${a.amount}`).join(" ");
    if (expected !== got) throw new Error(`El reparto de ${c.amount} a ${c.caseCode} no cuadra: ${got} ≠ ${expected}`);

    const [row] = await db
      .insert(contributions)
      .values({
        caseId: caseId[c.caseCode]!,
        donorAccount: pub(c.donor),
        amount: c.amount,
        txHash: r.txHash,
        status: "confirmada",
        confirmedAt: r.ledgerCloseAt,
      })
      .returning({ id: contributions.id });
    await db.insert(contributionAllocations).values(
      allocation
        .filter((a) => toStroops(a.amount) > 0n)
        .map((a) => ({ contributionId: row!.id, stageId: stageId(c.caseCode, a.position), amount: a.amount })),
    );
    console.log(`  ${c.caseCode} ← ${c.amount} USDC de ${c.donor}  (${got})  ${r.txHash.slice(0, 10)}…`);
  }

  log("Registrando en la red los gastos (pago al proveedor) y los hitos");
  const today = new Date().toISOString().slice(0, 10);
  for (const demoCase of DEMO_CASES) {
    const ngo = DEMO_NGOS.find((n) => n.key === demoCase.ngo)!;
    const ngoClient = await clientFor(demoCase.ngo);
    for (const [i, stage] of demoCase.stages.entries()) {
      const position = i + 1;
      if (stage.expense) {
        const e = stage.expense;
        const provider = DEMO_PROVIDERS.find((p) => p.key === e.provider)!;
        const occurredOn = e.occurredOn ?? today;
        const stored = await storage.save({
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
            assetCode: ASSET_CODE,
          }),
        });
        const r = await signAndSend(
          await ngoClient.registrar_gasto({
            ong: pub(demoCase.ngo),
            caso: demoCase.code,
            etapa: position,
            proveedor: pub(e.provider),
            monto: toUnits(e.amount),
            hash_factura: Buffer.from(stored.sha256, "hex"),
          }),
        );
        await db.insert(expenses).values({
          caseId: caseId[demoCase.code]!,
          stageId: stageId(demoCase.code, position),
          providerId: providerId(e.provider),
          category: e.category,
          concept: e.concept ?? null,
          translations: e.translations ?? {},
          amount: e.amount,
          occurredOn,
          invoiceNumber: e.invoiceNumber,
          invoiceKey: stored.key,
          invoiceHash: stored.sha256,
          txHash: r.txHash,
          status: "confirmada",
          validationLevel: e.validationLevel,
          registeredBy: ngoUser(demoCase.ngo),
        });
        console.log(`  Gasto ${demoCase.code} E${position}: ${e.amount} USDC → ${provider.name}  ${r.txHash.slice(0, 10)}…`);
      }
      if (stage.milestone) {
        const m = stage.milestone;
        const occurredOn = m.occurredOn ?? today;
        const evidenceHash = await sha256Hex(
          canonicalJson({ caso: demoCase.code, etapa: position, fecha: occurredOn, descripcion: m.description }),
        );
        const r = await signAndSend(
          await ngoClient.registrar_hito({
            ong: pub(demoCase.ngo),
            caso: demoCase.code,
            etapa: position,
            hash_evidencia: Buffer.from(evidenceHash, "hex"),
          }),
        );
        await db.insert(milestones).values({
          caseId: caseId[demoCase.code]!,
          stageId: stageId(demoCase.code, position),
          occurredOn,
          description: m.description,
          translations: m.translations,
          photoKey: m.photoPath,
          evidenceHash,
          txHash: r.txHash,
          status: "confirmada",
          validationLevel: m.validationLevel,
          registeredBy: ngoUser(demoCase.ngo),
        });
        console.log(`  Hito ${demoCase.code} E${position}  ${r.txHash.slice(0, 10)}…`);
      }
    }
  }

  // Comprobación final contra el contrato.
  log("Comprobando el estado del contrato");
  for (const c of DEMO_CASES) {
    const view = await signAndSendView(await admin.consultar_caso({ caso: c.code }));
    const raised = await db
      .select({ amount: contributions.amount })
      .from(contributions)
      .where(and(eq(contributions.caseId, caseId[c.code]!), eq(contributions.status, "confirmada")));
    const dbRaised = raised.reduce((t, r) => t + toStroops(r.amount), 0n);
    const ok = BigInt(view.recaudado) === dbRaised;
    console.log(`  ${c.code}: recaudado ${fromStroops(BigInt(view.recaudado))}, saldo ${fromStroops(BigInt(view.saldo))} ${ok ? "✓" : "≠ base de datos"}`);
    if (!ok) throw new Error(`El recaudado de ${c.code} en el contrato no coincide con la base de datos.`);
  }

  console.log(`\nListo. Contrato ${contractId}`);
  console.log(`Stellar Expert: https://stellar.expert/explorer/testnet/contract/${contractId}`);
  console.log(`Cuentas y llaves de testnet en ${path.relative(process.cwd(), ACCOUNTS_FILE)}; .env actualizado.`);
}

/** Las consultas solo se simulan: no se envían ni se firman. */
async function signAndSendView(tx: { result: unknown }) {
  return unwrapResult<{ recaudado: bigint; saldo: bigint }>(tx.result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✗", error instanceof Error ? error.message : error);
    process.exit(1);
  });
