import { and, asc, count, eq, gte } from "drizzle-orm";
import type { Idioma } from "@/i18n/config";
import { traducir } from "@/i18n/contenido";
import type { Db } from "../client";
import { enrollments, ngos, personProfiles, users, volunteerings } from "../schema";

/** Voluntariado tal como se muestra en la página: sin datos de contacto de nadie. */
export interface PublicVolunteering {
  id: string;
  ngo: { slug: string; name: string };
  title: string;
  date: string;
  schedule: string;
  city: string;
  tasks: string[];
  requirements: string[];
  capacity: number;
  occupied: number;
  photoPath: string | null;
}

/**
 * Voluntariados próximos de las ONG aprobadas, con los cupos ocupados (los previos más las inscripciones). El título,
 * el horario, las tareas y los requisitos salen en el idioma pedido si la ONG los tradujo.
 */
export async function listVolunteerings(
  db: Db,
  idioma: Idioma,
  today = new Date().toISOString().slice(0, 10),
): Promise<PublicVolunteering[]> {
  const rows = await db
    .select({
      id: volunteerings.id,
      ngoSlug: ngos.slug,
      ngoName: ngos.name,
      title: volunteerings.title,
      date: volunteerings.date,
      schedule: volunteerings.schedule,
      city: volunteerings.city,
      tasks: volunteerings.tasks,
      requirements: volunteerings.requirements,
      translations: volunteerings.translations,
      capacity: volunteerings.capacity,
      preOccupied: volunteerings.preOccupied,
      photoPath: volunteerings.photoPath,
    })
    .from(volunteerings)
    .innerJoin(ngos, eq(ngos.id, volunteerings.ngoId))
    .where(and(eq(ngos.status, "aprobada"), gte(volunteerings.date, today)))
    .orderBy(asc(volunteerings.date));

  const taken = await db
    .select({ volunteeringId: enrollments.volunteeringId, n: count() })
    .from(enrollments)
    .groupBy(enrollments.volunteeringId);
  const takenBy = new Map(taken.map((t) => [t.volunteeringId, t.n]));

  return rows.map(({ ngoSlug, ngoName, preOccupied, translations, ...v }) => ({
    ...v,
    ...traducir({ title: v.title, schedule: v.schedule, tasks: v.tasks, requirements: v.requirements }, translations, idioma),
    ngo: { slug: ngoSlug, name: ngoName },
    occupied: Math.min(v.capacity, preOccupied + (takenBy.get(v.id) ?? 0)),
  }));
}

export class VolunteeringFullError extends Error {
  constructor() {
    super("Esta jornada ya no tiene cupos.");
  }
}

export class AlreadyEnrolledError extends Error {
  constructor() {
    super("Ya hay una inscripción con ese correo para esta jornada.");
  }
}

export interface NewEnrollment {
  volunteeringId: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  availability: "toda_la_jornada" | "manana" | "tarde";
}

/** Inscribe a una persona si quedan cupos. Los datos personales solo los ve la ONG (Ley 1581 de 2012). */
export async function enroll(db: Db, input: NewEnrollment): Promise<void> {
  await db.transaction(async (tx) => {
    // Bloquea la fila del voluntariado para que dos inscripciones simultáneas no superen los cupos.
    const [v] = await tx
      .select({ capacity: volunteerings.capacity, preOccupied: volunteerings.preOccupied })
      .from(volunteerings)
      .where(eq(volunteerings.id, input.volunteeringId))
      .for("update");
    if (!v) throw new RangeError("Ese voluntariado no existe.");
    const [{ n } = { n: 0 }] = await tx
      .select({ n: count() })
      .from(enrollments)
      .where(eq(enrollments.volunteeringId, input.volunteeringId));
    if (v.preOccupied + n >= v.capacity) throw new VolunteeringFullError();

    const inserted = await tx
      .insert(enrollments)
      .values({ ...input, email: input.email.trim().toLowerCase(), dataConsentAt: new Date() })
      .onConflictDoNothing()
      .returning({ id: enrollments.id });
    if (inserted.length === 0) throw new AlreadyEnrolledError();
  });
}

/** Datos para llenar la inscripción de quien ya ingresó con su cuenta. */
export async function enrollmentDefaults(db: Db, userId: string) {
  const [row] = await db
    .select({ fullName: personProfiles.fullName, phone: personProfiles.phone, email: users.email })
    .from(users)
    .leftJoin(personProfiles, eq(personProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return { fullName: row?.fullName ?? "", phone: row?.phone ?? "", email: row?.email ?? "" };
}
