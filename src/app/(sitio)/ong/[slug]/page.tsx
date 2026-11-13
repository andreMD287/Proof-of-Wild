import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chipLabel, outcomeLabel } from "@/app/_lib/labels";
import { IconoCheck, IconoEscudo } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { Reveal } from "@/components/movimiento/Reveal";
import { RouteMap } from "@/components/mapa/RouteMap";
import { Chip, EmptyState, ExplorerLink } from "@/components/ui";
import { getIdioma, getT } from "@/i18n/servidor";
import type { Clave } from "@/i18n/traductor";
import { explorerAccountUrl, explorerTxUrl } from "@/lib/explorer";
import { shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getPublicNgo } from "@/platform/db/repositories/ngo-profile";
import { listVolunteerings } from "@/platform/db/repositories/volunteering";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * Verificación de la ONG (KYB, ADR-21): lo que se revisa antes de aprobar su perfil y dejarla recibir aportes.
 * En la demo es simulada; en producción la hace un proveedor contra el RUES y la Registraduría.
 */
const KYB_CHECKS: ReadonlyArray<readonly [Clave, Clave]> = [
  ["ong.perfil.kyb.registro.titulo", "ong.perfil.kyb.registro.detalle"],
  ["ong.perfil.kyb.representante.titulo", "ong.perfil.kyb.representante.detalle"],
  ["ong.perfil.cuentaStellar", "ong.perfil.kyb.cuenta.detalle"],
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ngo = await getPublicNgo(getDb(), (await params).slug, await getIdioma());
  if (ngo) return { title: ngo.name, description: ngo.description };
  const { t } = await getT();
  return { title: t("ong.perfil.meta.noEncontrada") };
}

/** Pantalla 6: perfil de una ONG verificada, lo que da visibilidad a los centros poco conocidos. */
export default async function OngProfilePage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const idioma = await getIdioma();
  const ngo = await getPublicNgo(db, slug, idioma);
  if (!ngo) notFound();

  const tr = await getT();
  const { t, rich, ruta, formatAmount, formatDate } = tr;
  const explorer = getExplorerEnv().EXPLORER_BASE_URL;
  const [allCases, volunteering] = await Promise.all([
    getCatalogService().listCases(idioma),
    listVolunteerings(db, idioma),
  ]);
  const own = allCases.filter((c) => c.ngo.slug === ngo.slug);
  const released = own.filter((c) => c.outcome === "liberado").length;
  const invoicedPct =
    Number(ngo.totals.spent) > 0 ? Math.round((Number(ngo.totals.spentWithInvoice) / Number(ngo.totals.spent)) * 100) : 100;
  const indicators: Array<[string, string]> = [
    [t("ong.perfil.indicador.casos"), String(own.length)],
    [t("ong.perfil.indicador.liberados"), String(released)],
    [t("ong.perfil.indicador.recibido"), formatAmount(ngo.totals.received)],
    [t("ong.perfil.indicador.gastado"), formatAmount(ngo.totals.spent)],
    [t("ong.perfil.indicador.conFactura"), t("ong.perfil.porcentaje", { n: invoicedPct })],
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
      <Reveal
        as="header"
        variant="capa"
        className="relative isolate grid gap-6 overflow-hidden rounded-[32px] bg-profundo p-8 text-white lg:grid-cols-[auto_1fr_auto] lg:items-center"
      >
        <ContourField variant="noche" seed={13} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="relative h-36 w-36 overflow-hidden rounded-[24px] bg-crema ring-4 ring-crema">
          {ngo.photoPath ? <Image src={ngo.photoPath} alt="" fill sizes="128px" className="object-cover" /> : null}
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold sm:text-6xl">{ngo.name}</h1>
          <p className="flex flex-wrap gap-2">
            <Chip tone="oscuro">
              {t(`ong.tipo.${ngo.kind}`)} · {ngo.city}
            </Chip>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 text-sm font-semibold text-profundo">
              <IconoEscudo className="h-4 w-4" /> {t("ong.perfil.verificada")}
            </span>
          </p>
          <p className="max-w-2xl text-white/90">
            {ngo.description}
            {ngo.foundedYear ? ` ${t("ong.perfil.desde", { anio: ngo.foundedYear })}` : ""}
          </p>
        </div>
        <div className="space-y-1 border-t border-white/20 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <p className="rotulo text-salvia">{t("ong.perfil.cuentaStellar")}</p>
          <p className="font-mono">{shortAccount(ngo.stellarAccount)}</p>
          <a
            href={explorerAccountUrl(explorer, ngo.stellarAccount)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
          >
            {t("ong.verEnStellarExpert")}
          </a>
        </div>
      </Reveal>

      <Reveal
        as="dl"
        variant="sube"
        className="grid grid-cols-2 border-y-2 border-texto/80 md:grid-cols-5"
      >
        {indicators.map(([label, value], i) => (
          <div key={label} className={`border-arena px-5 py-4 ${i % 2 === 1 ? "border-l" : ""} ${i > 0 ? "md:border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""}`}>
            <dt className="rotulo text-secundario">{label}</dt>
            <dd className={`cifras mt-1 font-display text-3xl font-bold ${i === 4 ? "text-bosque" : ""}`}>{value}</dd>
          </div>
        ))}
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[2.3fr_1fr]">
        <section aria-labelledby="casos-ong" className="space-y-4">
          <h2 id="casos-ong" className="text-3xl">
            {t("ong.perfil.casos.titulo")}
          </h2>
          {own.length === 0 ? (
            <EmptyState title={t("ong.perfil.casos.vacioTitulo")}>{t("ong.perfil.casos.vacioTexto")}</EmptyState>
          ) : null}
          {own.map((c, i) => (
            <Reveal
              as="article"
              variant="pop"
              delay={i}
              key={c.code}
              className="group/caso relative grid overflow-hidden rounded-[24px] bg-white ring-1 ring-arena/70 hover:ring-bosque/60 transition-[transform,box-shadow,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-1 sm:grid-cols-[12rem_1fr]"
            >
              <div className="relative min-h-36 overflow-hidden bg-salvia">
                {c.photoUrl ? (
                  <Image
                    src={c.photoUrl}
                    alt={c.commonName ?? ""}
                    fill
                    sizes="192px"
                    className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/caso:scale-[1.06]"
                  />
                ) : null}
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                <p className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-2xl font-semibold">{c.commonName ?? t("ong.especieReservada")}</span>
                  <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"} className="text-xs">
                    {chipLabel(tr, c)}
                  </Chip>
                  <span className="text-sm text-secundario">{c.code}</span>
                </p>
                <RouteMap
                  stages={c.route}
                  size="compacto"
                  showAmounts={false}
                  label={t("casos.rutaDe", { nombre: c.commonName ?? c.code })}
                  className="pt-3"
                />
                <p className="cifras text-sm">
                  {rich(
                    c.progressPercent >= 100 ? "ong.perfil.casos.metaCumplida" : "ong.perfil.casos.recaudado",
                    { b: (s) => <strong>{s}</strong> },
                    { recaudado: formatAmount(c.raised, "").trim(), meta: formatAmount(c.goal) },
                  )}
                </p>
                {c.recovered && c.outcomeDate ? (
                  <p className="text-sm text-secundario">
                    {t("ong.perfil.casos.desenlace", { desenlace: outcomeLabel(tr, c.outcome, c.outcomeLabel), fecha: formatDate(c.outcomeDate) })}
                  </p>
                ) : null}
                <Link href={ruta(`/casos/${c.code}`)} className="enlace after:absolute after:inset-0 after:content-['']">
                  {c.recovered ? t("ong.perfil.casos.verHistoria") : t("ong.perfil.casos.verCaso")}
                </Link>
              </div>
            </Reveal>
          ))}
        </section>

        <aside className="space-y-6">
          <Reveal as="section" variant="pop" aria-labelledby="verificacion-ong" className="space-y-4 rounded-[24px] bg-white p-5 ring-1 ring-arena/70">
            <h2 id="verificacion-ong" className="flex items-center gap-3 text-2xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-profundo text-crema">
                <IconoEscudo className="h-5 w-5" />
              </span>
              {t("ong.perfil.verificada")}
            </h2>
            <ul className="space-y-3">
              {KYB_CHECKS.map(([title, detail]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
                    <IconoCheck className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <strong className="block leading-snug">{t(title)}</strong>
                    <span className="text-sm text-secundario">{t(detail)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rounded-[14px] bg-crema px-3 py-2 text-sm">{t("ong.perfil.kyb.nota")}</p>
          </Reveal>

          <section className="space-y-3 border-t-2 border-texto/80 pt-4">
            <h2 className="text-2xl">{t("ong.perfil.voluntariados.titulo")}</h2>
            {volunteering.filter((v) => v.ngo.slug === ngo.slug).length === 0 ? (
              <p className="text-secundario">{t("ong.perfil.voluntariados.vacio")}</p>
            ) : (
              volunteering
                .filter((v) => v.ngo.slug === ngo.slug)
                .map((v) => (
                  <p key={v.id}>
                    <strong>{formatDate(v.date)}</strong> · {v.title}: {v.tasks.join(", ").toLowerCase()}.
                  </p>
                ))
            )}
            <Link href={ruta("/#voluntariados")} className="enlace">
              {t("ong.perfil.voluntariados.ver")}
            </Link>
          </section>

          <section className="space-y-3 border-t-2 border-texto/80 pt-4">
            <h2 className="text-2xl">{t("ong.perfil.gastos.titulo")}</h2>
            {ngo.recentExpenses.length === 0 ? (
              <p className="text-secundario">{t("ong.perfil.gastos.vacio")}</p>
            ) : (
              <ul className="divide-y divide-arena/50">
                {ngo.recentExpenses.map((e) => (
                  <li key={e.txHash} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      {e.label} · {e.caseCode}{" "}
                      <ExplorerLink href={explorerTxUrl(explorer, e.txHash)}>
                        <span className="sr-only">{t("ong.perfil.gastos.verPago")}</span>
                      </ExplorerLink>
                    </span>
                    <strong className="cifras whitespace-nowrap">{formatAmount(e.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
