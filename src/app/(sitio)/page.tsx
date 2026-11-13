import { getSession } from "@/app/_lib/session";
import { CasosSeccion } from "@/components/inicio/CasosSeccion";
import { ComoFunciona } from "@/components/inicio/ComoFunciona";
import { Portada } from "@/components/inicio/Portada";
import { VoluntariadosSeccion } from "@/components/inicio/VoluntariadosSeccion";
import { getIdioma } from "@/i18n/servidor";
import { explorerContractUrl } from "@/lib/explorer";
import { getExplorerEnv } from "@/platform/config/env";
import { getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { enrollmentDefaults, listVolunteerings } from "@/platform/db/repositories/volunteering";
import { EnrollmentDialog } from "./voluntariados/EnrollmentDialog";

// Lee de la base de datos en cada visita; no se prerenderiza en la compilación.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ inscribirme?: string }> };

/**
 * Página principal única: Inicio, Cómo funciona, Casos y Voluntariados son secciones de la misma página y el menú
 * baja a cada una. `?inscribirme=<id>` abre la inscripción a una jornada sin salir de aquí.
 */
export default async function InicioPage({ searchParams }: Props) {
  const db = getDb();
  const idioma = await getIdioma();
  const [{ inscribirme }, session, cases, volunteerings] = await Promise.all([
    searchParams,
    getSession(),
    getCatalogService().listCases(idioma),
    listVolunteerings(db, idioma),
  ]);
  const selected = volunteerings.find((v) => v.id === inscribirme);
  const defaults =
    selected && session?.role === "persona"
      ? await enrollmentDefaults(db, session.userId)
      : { fullName: "", email: "", phone: "" };

  // En la portada, el caso en tratamiento que más avanza: su tramo recorrido y sus etapas cubiertas se ven de una vez.
  const destacado = cases.filter((c) => !c.recovered).sort((a, b) => b.progressPercent - a.progressPercent)[0] ?? null;
  const contractId = process.env.CONTRACT_ID;
  const contractUrl = contractId ? explorerContractUrl(getExplorerEnv().EXPLORER_BASE_URL, contractId) : null;

  return (
    <main>
      <Portada destacado={destacado} contractUrl={contractUrl} />
      <ComoFunciona />
      <CasosSeccion cases={cases} />
      <VoluntariadosSeccion list={volunteerings} />
      {selected ? (
        <EnrollmentDialog volunteering={selected} defaults={defaults} signedIn={session?.role === "persona"} />
      ) : null}
    </main>
  );
}
