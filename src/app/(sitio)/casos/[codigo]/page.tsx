import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chipLabel, outcomeLabel } from "@/app/_lib/labels";
import { getSession } from "@/app/_lib/session";
import { ApadrinarDialog } from "@/components/casos/ApadrinarDialog";
import { ApadrinarGate } from "@/components/casos/ApadrinarGate";
import { ContributionsTable } from "@/components/casos/ContributionsTable";
import { PersonalizedTimeline } from "@/components/casos/PersonalizedTimeline";
import { TransparencyPanel } from "@/components/casos/TransparencyPanel";
import { IconoFlecha } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { buttonClass, Chip, ProgressBar } from "@/components/ui";
import { getIdioma, getT } from "@/i18n/servidor";
import { getExplorerEnv } from "@/platform/config/env";
import { getCatalogService, getIdentityService } from "@/platform/container";
import { Reveal } from "@/components/movimiento/Reveal";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ pestana?: string; apadrinar?: string; bienvenida?: string; monto?: string }>;
};

const TABS = ["linea", "transparencia", "aportes"] as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ codigo }, { t }] = await Promise.all([params, getT()]);
  const detail = await getCatalogService().caseDetail(codigo, await getIdioma());
  if (!detail) return { title: t("casos.detalle.metaNoEncontrado") };
  const name = detail.commonName ?? t("casos.especieReservada");
  return { title: `${name} · ${detail.code}`, description: detail.shortStory };
}

/**
 * Detalle del caso: la pantalla principal de la demo. La foto y la historia, el bloque de apoyo, la ruta del
 * tratamiento a todo el ancho y tres pestañas: línea de tiempo, transparencia y aportes.
 */
export default async function CaseDetailPage({ params, searchParams }: Params) {
  const [{ codigo }, { pestana, apadrinar, bienvenida, monto }, session, tr] = await Promise.all([
    params,
    searchParams,
    getSession(),
    getT(),
  ]);
  const { t, rich, ruta, formatAmount, formatDate } = tr;
  const detail = await getCatalogService().caseDetail(codigo, await getIdioma());
  if (!detail) notFound();

  const tab = TABS.find((id) => id === pestana) ?? "linea";
  const name = detail.commonName ?? t("casos.especieReservada");
  const canSponsor = !detail.recovered && Number(detail.remaining) > 0;
  // Apadrinar exige una cuenta de persona (ADR-16): sin ella se abre la invitación a crearla o ingresar, y al
  // terminar se vuelve aquí con la ventana de apadrinar abierta. Las rutas que se pasan a las ventanas van sin
  // prefijo de idioma: las ventanas las localizan al navegar.
  const isDonor = session?.role === "persona";
  const returnTo = `/casos/${detail.code}?pestana=${tab}&apadrinar=1&bienvenida=1`;
  // Aportes grandes piden identidad verificada (ADR-21); al verificarse se vuelve a la ventana de apadrinar.
  const identityVerified =
    isDonor && session && apadrinar === "1" ? (await getIdentityService().levelOf(session.userId)) === 2 : false;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-8">
        <Link href={ruta("/#casos")} className="enlace mb-6 inline-flex items-center gap-2">
          <IconoFlecha izquierda /> {t("casos.detalle.volver")}
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          <Reveal as="figure" variant="capa" className="relative m-4">
            {/* Paspartú de curvas de nivel: la foto descansa sobre una hoja del mapa. */}
            <span aria-hidden className="absolute -inset-4 overflow-hidden rounded-[40px]">
              <ContourField variant="papel" seed={19} className="h-full w-full" />
            </span>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] bg-salvia">
              {detail.photoUrl ? (
                <Image
                  src={detail.photoUrl}
                  alt={name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover"
                />
              ) : null}
              <span className="absolute top-4 left-4">
                <Chip tone={detail.chip.tone === "logro" ? "logro" : "etapa"}>{chipLabel(tr, detail)}</Chip>
              </span>
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal variant="sube" className="space-y-2">
              <h1 className="text-6xl font-bold sm:text-7xl">{name}</h1>
              {detail.scientificName ? <p className="cientifico text-2xl text-secundario">{detail.scientificName}</p> : null}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-secundario">
                <span className="cifras font-semibold">{detail.code}</span>
                <span aria-hidden>·</span>
                <span>{t("casos.detalle.ingreso", { fecha: formatDate(detail.intakeDate) })}</span>
                {detail.recovered && detail.outcomeDate ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {t("casos.detalle.resultado", {
                        resultado: outcomeLabel(tr, detail.outcome, detail.outcomeLabel),
                        fecha: formatDate(detail.outcomeDate),
                      })}
                    </span>
                  </>
                ) : null}
              </p>
              <Link href={ruta(`/ong/${detail.ngo.slug}`)} className="enlace inline-block text-lg">
                {detail.ngo.name}
              </Link>
            </Reveal>
            <Reveal as="p" variant="sube" delay={1} className="max-w-prose text-lg leading-relaxed">
              {detail.story}
            </Reveal>

            <Reveal as="aside" variant="pop" delay={2}
              aria-label={t("casos.detalle.apoyoAria")}
              className="relative isolate overflow-hidden rounded-[28px] bg-profundo p-6 text-white sm:p-7"
            >
              <ContourField variant="noche" seed={5} className="absolute inset-0 -z-10 h-full w-full opacity-80" />
              <dl className="grid grid-cols-2 gap-6">
                <div>
                  <dt className="rotulo text-salvia">{t("casos.detalle.costoTotal")}</dt>
                  <dd className="cifras mt-1 font-display text-4xl font-bold">{formatAmount(detail.goal)}</dd>
                </div>
                <div>
                  <dt className="rotulo text-salvia">{t("casos.detalle.recaudado")}</dt>
                  <dd className="cifras mt-1 font-display text-4xl font-bold">{formatAmount(detail.raised)}</dd>
                </div>
              </dl>
              <ProgressBar percent={detail.progressPercent} tone="oscuro" className="mt-5" />
              {canSponsor ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <p className="cifras text-lg">
                    {rich("casos.detalle.faltan", { b: (s) => <strong>{s}</strong> }, { monto: formatAmount(detail.remaining) })}
                  </p>
                  <Link
                    href={ruta(`/casos/${detail.code}?pestana=${tab}&apadrinar=1`)}
                    scroll={false}
                    className={buttonClass("arena", "px-7 py-3.5 text-lg")}
                  >
                    {t("casos.apadrinarEsteCaso")} <IconoFlecha />
                  </Link>
                  {isDonor ? null : (
                    <p className="w-full text-sm text-white/80">{t("casos.detalle.pediremosCuenta")}</p>
                  )}
                </div>
              ) : (
                <p className="mt-5 font-semibold text-arena">
                  {detail.recovered
                    ? t("casos.detalle.metaCumplidaResultado", { resultado: outcomeLabel(tr, detail.outcome, detail.outcomeLabel) })
                    : t("casos.detalle.metaCumplida")}
                </p>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-ruta" className="border-y border-arena/70 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
          <Reveal as="h2" variant="sube" id="titulo-ruta" className="text-4xl">
            {t("casos.detalle.rutaTitulo")}
          </Reveal>
          <RouteMap stages={detail.stages} label={t("casos.rutaDe", { nombre: name })} className="pt-6" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-8">
        <nav
          aria-label={t("casos.detalle.seccionesAria")}
          className="flex flex-wrap gap-2 rounded-2xl bg-white/70 p-1.5 ring-1 ring-arena/70 sm:w-fit"
        >
          {TABS.map((id) => (
            <Link
              key={id}
              href={ruta(`/casos/${detail.code}?pestana=${id}`)}
              scroll={false}
              aria-current={id === tab ? "page" : undefined}
              className={`mov-hover rounded-xl px-5 py-2.5 font-semibold transition-[background-color,color,transform] duration-200 ease-(--ease-spring) active:scale-95 ${
                id === tab ? "bg-bosque text-white" : "text-texto hover:-translate-y-0.5 hover:bg-crema hover:text-bosque"
              }`}
            >
              {t(`casos.detalle.pestana.${id}`)}
            </Link>
          ))}
        </nav>

        <div key={tab} className="anim-ventana">
          {tab === "linea" ? <PersonalizedTimeline caseCode={detail.code} stages={detail.stages} /> : null}
          {tab === "transparencia" ? <TransparencyPanel transparency={detail.transparency} /> : null}
          {tab === "aportes" ? (
            <ContributionsTable
              contributions={detail.contributions}
              sponsorHref={canSponsor ? `/casos/${detail.code}?pestana=aportes&apadrinar=1` : null}
            />
          ) : null}
        </div>
      </section>

      {apadrinar === "1" && canSponsor && !isDonor ? (
        <ApadrinarGate
          item={{ code: detail.code, name, photoUrl: detail.photoUrl, route: detail.stages }}
          returnTo={returnTo}
          closeHref={`/casos/${detail.code}?pestana=${tab}`}
          otherAccount={session ? session.displayName : null}
        />
      ) : null}

      {apadrinar === "1" && canSponsor && isDonor ? (
        <ApadrinarDialog
          item={{
            code: detail.code,
            name,
            ngoName: detail.ngo.name,
            photoUrl: detail.photoUrl,
            remaining: detail.remaining,
            stages: detail.stages.map((s) => ({ position: s.position, name: s.name, cost: s.cost, covered: s.covered })),
          }}
          explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL}
          closeHref={`/casos/${detail.code}?pestana=${tab}`}
          profileHref="/perfil"
          identityVerified={identityVerified}
          returnHref={`/casos/${detail.code}?pestana=${tab}&apadrinar=1`}
          initialAmount={monto && /^\d+([.,]\d{1,7})?$/.test(monto) ? monto : undefined}
          // Sin alias todavía, el nombre que se ve es el correo: en ese caso la bienvenida va sin nombre.
          welcome={bienvenida === "1" ? (session.displayName.includes("@") ? "" : session.displayName) : null}
        />
      ) : null}
    </main>
  );
}
