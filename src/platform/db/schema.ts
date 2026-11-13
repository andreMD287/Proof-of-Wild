import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  TextosCaso,
  TextosEtapa,
  TextosGasto,
  TextosHito,
  TextosOng,
  TextosVoluntariado,
  Traducciones,
} from "@/i18n/contenido";

/**
 * Esquema fuera de la red (brief, «Modelo de datos»). El dinero y los hashes viven en el contrato Soroban;
 * aquí se guarda el contenido (casos, etapas, fotos, facturas, perfiles, voluntariados) y una copia de cada
 * transacción para mostrarla rápido, porque el RPC de Stellar solo conserva los eventos unos 7 días.
 * Montos con 7 decimales, como el USDC de prueba. Hashes SHA-256 en hexadecimal (64 caracteres).
 */

export const userRole = pgEnum("user_role", ["persona", "ong", "admin"]);
export const ngoKind = pgEnum("ngo_kind", ["centro_atencion", "fundacion", "ong"]);
export const ngoStatus = pgEnum("ngo_status", ["en_revision", "aprobada", "rechazada"]);
export const animalGroup = pgEnum("animal_group", ["ave", "mamifero", "reptil", "anfibio"]);
export const caseStatus = pgEnum("case_status", ["activo", "recuperado"]);
export const caseOutcome = pgEnum("case_outcome", ["liberado", "en_reserva", "reubicado", "fallecido"]);
export const stageStatus = pgEnum("stage_status", ["pendiente", "en_curso", "completada"]);
export const txStatus = pgEnum("tx_status", ["enviada", "confirmada", "fallida"]);
export const validationLevel = pgEnum("validation_level", [
  "presentado",
  "revisado",
  "verificado_independiente",
]);
export const expenseCategory = pgEnum("expense_category", [
  "alimentacion",
  "atencion_veterinaria",
  "medicamentos",
  "rehabilitacion",
  "traslado_liberacion",
]);
export const availability = pgEnum("availability", ["toda_la_jornada", "manana", "tarde"]);
export const identityDocument = pgEnum("identity_document", ["cedula", "pasaporte"]);
export const identityMethod = pgEnum("identity_method", ["biometria", "simulada"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const money = (name: string) => numeric(name, { precision: 20, scale: 7 });
/**
 * Traducciones de lo que escribe la ONG, `{ en: { campo: texto }, pt: { … } }` (ADR-23). Las columnas normales
 * guardan el texto original; sin traducción, la página lo muestra tal cual.
 */
const translations = <T extends object>() =>
  jsonb("translations").$type<Traducciones<T>>().notNull().default({});
const hex64 = (column: unknown) => sql`${column} ~ '^[0-9a-f]{64}$'`;
const stellarAccount = (column: unknown) => sql`${column} ~ '^G[A-Z2-7]{55}$'`;

// ---------------------------------------------------------------------------
// Cuentas (SRP-6a): la base de datos nunca ve la contraseña, solo la sal y el verificador v = g^x mod N.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    role: userRole("role").notNull(),
    srpSalt: text("srp_salt").notNull(),
    srpVerifier: text("srp_verifier").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("users_srp_hex", sql`${t.srpSalt} ~ '^[0-9a-f]+$' AND ${t.srpVerifier} ~ '^[0-9a-f]+$'`),
  ],
);

/** Paso 1 de SRP. Vence en 2 minutos y se usa una sola vez. userId nulo = respuesta señuelo. */
export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientPublic: text("client_public").notNull(),
    serverPublic: text("server_public").notNull(),
    serverSecret: text("server_secret").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    succeeded: boolean("succeeded"),
    createdAt: createdAt(),
  },
  (t) => [index("auth_challenges_user_idx").on(t.userId, t.createdAt)],
);

/** Sesiones del sitio. Se guarda SHA-256 del token, nunca el token. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [check("sessions_token_hash", hex64(t.tokenHash))],
);

/** Perfil de una persona (donante, voluntaria o las dos). El nombre, el correo y el teléfono son privados. */
export const personProfiles = pgTable(
  "person_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    alias: text("alias"),
    city: text("city"),
    phone: text("phone"),
    wantsToDonate: boolean("wants_to_donate").notNull().default(true),
    wantsToVolunteer: boolean("wants_to_volunteer").notNull().default(false),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    stellarAccount: text("stellar_account").unique(),
    showAlias: boolean("show_alias").notNull().default(true),
    emailUpdates: boolean("email_updates").notNull().default(false),
    /** Autorización de tratamiento de datos (Ley 1581 de 2012). */
    dataConsentAt: timestamp("data_consent_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("person_profiles_stellar", sql`${t.stellarAccount} IS NULL OR ${stellarAccount(t.stellarAccount)}`)],
);

/**
 * Verificación de identidad de una persona (nivel 2, ADR-21). Solo el resultado: ni fotos, ni plantilla del rostro,
 * ni el número del documento (se guarda su HMAC para que un documento no verifique dos cuentas, y los últimos 4).
 */
export const identityVerifications = pgTable(
  "identity_verifications",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: identityDocument("document_type").notNull(),
    documentHash: text("document_hash").notNull().unique(),
    documentLast4: text("document_last4").notNull(),
    method: identityMethod("method").notNull(),
    faceMatch: numeric("face_match", { precision: 4, scale: 3 }),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference").notNull(),
    /** Autorización expresa para tratar datos sensibles (Ley 1581 de 2012, art. 6). */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("identity_verifications_hash", hex64(t.documentHash)),
    check("identity_verifications_last4", sql`${t.documentLast4} ~ '^[0-9A-Z]{4}$'`),
    check(
      "identity_verifications_face_match",
      sql`(${t.method} = 'simulada' AND ${t.faceMatch} IS NULL) OR (${t.method} = 'biometria' AND ${t.faceMatch} BETWEEN 0 AND 1)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// ONG y proveedores
// ---------------------------------------------------------------------------

export const ngos = pgTable(
  "ngos",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nit: text("nit").notNull(),
    kind: ngoKind("kind").notNull(),
    /** Complemento del tipo, por ejemplo «centro de rehabilitación de aves». */
    kindDetail: text("kind_detail"),
    /** Ciudad y departamento, sin dirección exacta (RN-07). */
    city: text("city").notNull(),
    foundedYear: integer("founded_year"),
    description: text("description").notNull(),
    environmentalPermit: text("environmental_permit"),
    translations: translations<TextosOng>(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    /** Cuenta que firma los gastos e hitos en el contrato. */
    stellarAccount: text("stellar_account").notNull().unique(),
    offersVolunteering: boolean("offers_volunteering").notNull().default(false),
    status: ngoStatus("status").notNull().default("en_revision"),
    photoPath: text("photo_path"),
    dataConsentAt: timestamp("data_consent_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("ngos_stellar", stellarAccount(t.stellarAccount)),
    check("ngos_slug", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

/** Proveedores a los que el contrato les paga directamente. */
export const providers = pgTable(
  "providers",
  {
    id: id(),
    name: text("name").notNull(),
    sells: text("sells").notNull(),
    city: text("city").notNull(),
    stellarAccount: text("stellar_account").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [check("providers_stellar", stellarAccount(t.stellarAccount))],
);

export const providerNgos = pgTable(
  "provider_ngos",
  {
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    ngoId: uuid("ngo_id")
      .notNull()
      .references(() => ngos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.ngoId] })],
);

// ---------------------------------------------------------------------------
// Casos y etapas
// ---------------------------------------------------------------------------

export const cases = pgTable(
  "cases",
  {
    id: id(),
    /** Mismo código que en el contrato, donde va como Symbol: POW_001. */
    code: text("code").notNull().unique(),
    ngoId: uuid("ngo_id")
      .notNull()
      .references(() => ngos.id),
    commonName: text("common_name").notNull(),
    scientificName: text("scientific_name").notNull(),
    group: animalGroup("group").notNull(),
    /** La especie se muestra solo cuando es seguro divulgarla (RN-05). */
    speciesPublic: boolean("species_public").notNull().default(true),
    shortStory: text("short_story").notNull(),
    story: text("story").notNull(),
    translations: translations<TextosCaso>(),
    photoPath: text("photo_path"),
    intakeDate: date("intake_date").notNull(),
    status: caseStatus("status").notNull().default("activo"),
    outcome: caseOutcome("outcome"),
    /** Texto del resultado tal como se muestra, por ejemplo «Liberada» o «En reserva». */
    outcomeLabel: text("outcome_label"),
    outcomeDate: date("outcome_date"),
    /** Transacción de crear_caso en el contrato. */
    contractTxHash: text("contract_tx_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    check("cases_code_format", sql`${t.code} ~ '^POW_[0-9]{3,6}$'`),
    check("cases_outcome_when_recovered", sql`${t.status} = 'activo' OR ${t.outcome} IS NOT NULL`),
    index("cases_ngo_idx").on(t.ngoId),
  ],
);

/** Etapas del tratamiento, en orden. El orden y los costos son los mismos que se pasaron a crear_caso. */
export const stages = pgTable(
  "stages",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    /** Nombre corto para el chip de etapa, por ejemplo «Cuidados especiales». */
    shortName: text("short_name").notNull(),
    covers: text("covers"),
    translations: translations<TextosEtapa>(),
    cost: money("cost").notNull(),
    photoPath: text("photo_path"),
    status: stageStatus("status").notNull().default("pendiente"),
  },
  (t) => [
    unique("stages_case_position_uq").on(t.caseId, t.position),
    check("stages_position_positive", sql`${t.position} >= 1`),
    check("stages_cost_positive", sql`${t.cost} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// Copia de lo que pasó en la red
// ---------------------------------------------------------------------------

/** Alias público de una billetera que aporta. Sin alias se muestra la dirección abreviada. */
export const donors = pgTable(
  "donors",
  {
    stellarAccount: text("stellar_account").primaryKey(),
    alias: text("alias"),
    createdAt: createdAt(),
  },
  (t) => [check("donors_stellar", stellarAccount(t.stellarAccount))],
);

/**
 * Aporte. Se guarda al enviar la transacción (estado «enviada») y pasa a «confirmada» cuando el servidor
 * la lee en la red, con el reparto por etapa que emitió el contrato en el evento `aporte`.
 */
export const contributions = pgTable(
  "contributions",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    donorAccount: text("donor_account").notNull(),
    amount: money("amount").notNull(),
    txHash: text("tx_hash").notNull().unique(),
    status: txStatus("status").notNull().default("enviada"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    /** Fecha del ledger en que quedó la transacción. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (t) => [
    check("contributions_amount_positive", sql`${t.amount} > 0`),
    check("contributions_tx_hash", hex64(t.txHash)),
    check("contributions_donor", stellarAccount(t.donorAccount)),
    check("contributions_confirmed_at", sql`${t.status} <> 'confirmada' OR ${t.confirmedAt} IS NOT NULL`),
    index("contributions_case_idx").on(t.caseId),
    index("contributions_donor_idx").on(t.donorAccount),
  ],
);

export const contributionAllocations = pgTable(
  "contribution_allocations",
  {
    contributionId: uuid("contribution_id")
      .notNull()
      .references(() => contributions.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    amount: money("amount").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.contributionId, t.stageId] }),
    check("contribution_allocations_positive", sql`${t.amount} > 0`),
  ],
);

/**
 * Gasto: registrar_gasto le paga al proveedor desde la etapa y guarda el hash de la factura en la misma
 * llamada; la factura se publica en la página (doble confirmación). Sin validar se muestra como
 * «presentado por la ONG», nunca como confirmado (RN-01).
 */
export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id),
    category: expenseCategory("category").notNull(),
    /** Concepto corto, por ejemplo «Revisión antes de liberar». Sin concepto se muestra el nombre de la etapa. */
    concept: text("concept"),
    translations: translations<TextosGasto>(),
    amount: money("amount").notNull(),
    occurredOn: date("occurred_on").notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    /** Clave del archivo de la factura en el almacén de evidencias (pública, sin datos de terceros). */
    invoiceKey: text("invoice_key").notNull(),
    invoiceHash: text("invoice_hash").notNull(),
    txHash: text("tx_hash").unique(),
    status: txStatus("status").notNull().default("enviada"),
    validationLevel: validationLevel("validation_level").notNull().default("presentado"),
    registeredBy: uuid("registered_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    check("expenses_invoice_hash", hex64(t.invoiceHash)),
    check("expenses_confirmed_tx", sql`${t.status} <> 'confirmada' OR ${t.txHash} IS NOT NULL`),
    index("expenses_case_idx").on(t.caseId),
  ],
);

/** Hito: avance del tratamiento con su foto; el hash de la foto queda en el evento `hito` del contrato. */
export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    occurredOn: date("occurred_on").notNull(),
    description: text("description").notNull(),
    translations: translations<TextosHito>(),
    /** Clave del archivo en el almacén de evidencias o ruta en public/ para los datos de prueba. */
    photoKey: text("photo_key"),
    evidenceHash: text("evidence_hash").notNull(),
    txHash: text("tx_hash").unique(),
    status: txStatus("status").notNull().default("enviada"),
    validationLevel: validationLevel("validation_level").notNull().default("presentado"),
    registeredBy: uuid("registered_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("milestones_evidence_hash", hex64(t.evidenceHash)),
    check("milestones_confirmed_tx", sql`${t.status} <> 'confirmada' OR ${t.txHash} IS NOT NULL`),
    index("milestones_case_idx").on(t.caseId),
  ],
);

// ---------------------------------------------------------------------------
// Voluntariado (solo base de datos, nunca en la red)
// ---------------------------------------------------------------------------

export const volunteerings = pgTable(
  "volunteerings",
  {
    id: id(),
    ngoId: uuid("ngo_id")
      .notNull()
      .references(() => ngos.id),
    title: text("title").notNull(),
    date: date("date").notNull(),
    schedule: text("schedule").notNull(),
    city: text("city").notNull(),
    tasks: text("tasks").array().notNull(),
    requirements: text("requirements").array().notNull(),
    translations: translations<TextosVoluntariado>(),
    capacity: integer("capacity").notNull(),
    /** Cupos ya ocupados por inscripciones hechas fuera de la página. */
    preOccupied: integer("pre_occupied").notNull().default(0),
    photoPath: text("photo_path"),
    createdAt: createdAt(),
  },
  (t) => [check("volunteerings_capacity", sql`${t.capacity} > 0 AND ${t.preOccupied} BETWEEN 0 AND ${t.capacity}`)],
);

/** Inscripción a un voluntariado. Datos personales protegidos por la Ley 1581 de 2012. */
export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    volunteeringId: uuid("volunteering_id")
      .notNull()
      .references(() => volunteerings.id),
    userId: uuid("user_id").references(() => users.id),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    availability: availability("availability").notNull(),
    dataConsentAt: timestamp("data_consent_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("enrollments_volunteering_email_uq").on(t.volunteeringId, t.email)],
);

// ---------------------------------------------------------------------------
// Evidencias publicadas (facturas y fotos de hitos)
// ---------------------------------------------------------------------------

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * Archivos de evidencia guardados en la base de datos. Así funcionan igual en local y en un servidor sin
 * disco persistente (Vercel). Las imágenes ya vienen sin metadatos; `sha256` es el hash que quedó en la red.
 */
export const evidenceFiles = pgTable(
  "evidence_files",
  {
    key: text("key").primaryKey(),
    contentType: text("content_type").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("evidence_files_sha256", hex64(t.sha256)),
    check("evidence_files_key", sql`${t.key} ~ '^[0-9a-f-]{36}\\.[a-z]{2,4}$'`),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);
