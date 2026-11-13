import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconoCheck, IconoEscudo, IconoHuella } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { Reveal } from "@/components/movimiento/Reveal";
import { buttonClass, Chip, EmptyState, ExplorerLink } from "@/components/ui";
import { getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import { explorerTxUrl } from "@/lib/explorer";
import type { RouteStage } from "@/modules/catalog";
import type { DonorView } from "@/platform/db/repositories/donor";
import { ShareButtons } from "./ShareButtons";

/*
 * Piezas de servidor (las pintan la huella pública y el perfil): toman el idioma de la petición con `getT()`.
 * Las rutas que reciben (`sharePath`, `publicLink`) van sin prefijo de idioma; aquí se localizan.
 */

/** Lo que dice la insignia según lo que respalda: casos apoyados y voluntariados. */
function badgeParts(view: DonorView, t: Traductor["t"], tn: Traductor["tn"]): string[] {
  const casesCount = view.cases.length;
  return [
    casesCount > 0 ? tn("huella.insignia.apoya", casesCount) : null,
    view.volunteerings.length > 0 ? t("huella.insignia.voluntariado") : null,
  ].filter((p): p is string => !!p);
}

/**
 * Insignia «Huella verificada» como un sello de mapa: anillo punteado que gira despacio, la huella al centro y el
 * visto bueno cuando ya hay un aporte o un voluntariado. Debajo, compartir y la página pública.
 */
export async function BadgeCard({ view, sharePath, publicLink }: { view: DonorView; sharePath: string; publicLink?: string }) {
  const { t, tn, ruta } = await getT();
  const parts = badgeParts(view, t, tn);
  const active = parts.length > 0;

  return (
    <section aria-labelledby="titulo-insignia" className="flex flex-col items-center gap-4 text-center text-white">
      <span className="relative flex h-40 w-40 items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          aria-hidden
          className={`absolute inset-0 h-full w-full text-arena ${active ? "motion-safe:animate-[spin_40s_linear_infinite]" : "opacity-50"}`}
        >
          <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 9" strokeLinecap="round" />
          <circle cx="80" cy="80" r="64" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
        </svg>
        <span
          className={`relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-arena text-profundo ${active ? "bg-crema" : "bg-crema/70"}`}
        >
          <IconoHuella className="h-12 w-12" />
          {active ? (
            <span className="absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-crema bg-bosque text-white">
              <IconoCheck className="h-5 w-5" />
            </span>
          ) : null}
        </span>
      </span>
      <h2 id="titulo-insignia" className="text-4xl font-bold">
        {t("huella.insignia.titulo")}
      </h2>
      {active ? (
        <>
          <p className="text-lg text-white/90">{parts.join(" · ")}</p>
          <p className="max-w-xs text-sm text-white/80">{t("huella.insignia.comprobable")}</p>
          <ShareButtons path={ruta(sharePath)} text={t("huella.insignia.compartirTexto", { partes: parts.join(" · ") })} />
          {publicLink ? (
            <Link
              href={ruta(publicLink)}
              className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
            >
              {t("huella.insignia.verPublica")}
            </Link>
          ) : null}
        </>
      ) : (
        <p className="max-w-xs text-white/85">{t("huella.insignia.inactiva")}</p>
      )}
    </section>
  );
}

/**
 * Cabecera de la huella (perfil propio o página pública): la inicial en una placa redonda, el nombre que se puede
 * mostrar, la billetera y sus acciones, sobre curvas de nivel; a la derecha, el sello de la insignia.
 */
export async function DonorHeader({
  name,
  account,
  actions,
  seal,
  children,
  verified = false,
}: {
  name: string;
  account: string | null;
  /** Identidad verificada (nivel 2, ADR-21). */
  verified?: boolean;
  actions?: ReactNode;
  seal: ReactNode;
  children?: ReactNode;
}) {
  const { t } = await getT();
  return (
    <Reveal
      as="header"
      variant="capa"
      className="relative isolate grid items-center gap-10 overflow-hidden rounded-[32px] bg-profundo p-8 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto]"
    >
      <ContourField variant="noche" seed={23} className="absolute inset-0 -z-10 h-full w-full" />
      <div className="space-y-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-crema font-display text-4xl font-bold text-profundo ring-4 ring-arena">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold break-words sm:text-6xl">{name}</h1>
          <p className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/25 px-2.5 py-1 font-mono text-sm text-white/85">
              <span aria-hidden className={`h-2 w-2 rounded-full ${account ? "bg-salvia" : "bg-white/40"}`} />
              {account ? `${account.slice(0, 4)}…${account.slice(-5)}` : t("huella.cabecera.sinBilletera")}
            </span>
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-arena px-2.5 py-1 text-sm font-semibold text-profundo">
                <IconoEscudo className="h-4 w-4" /> {t("huella.cabecera.identidadVerificada")}
              </span>
            ) : null}
          </p>
        </div>
        {children ? <div className="max-w-xl text-white/85">{children}</div> : null}
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="lg:px-6">{seal}</div>
    </Reveal>
  );
}

/** Totales de la huella en una franja de leyenda con líneas finas. */
export async function DonorTotals({ view, own = true }: { view: DonorView; own?: boolean }) {
  const { t, formatAmount } = await getT();
  const items: Array<[string, string]> = [
    [t("huella.totales.aportado"), formatAmount(view.totalAmount)],
    [own ? t("huella.totales.casosPropios") : t("huella.totales.casosAjenos"), String(view.cases.length)],
    [t("huella.totales.voluntariados"), String(view.volunteerings.length)],
  ];
  return (
    <Reveal as="dl" variant="sube" className="grid border-y-2 border-texto/80 sm:grid-cols-3">
      {items.map(([label, value], i) => (
        <div key={label} className={`border-arena px-5 py-4 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}>
          <dt className="rotulo text-secundario">{label}</dt>
          <dd className={`cifras mt-1 font-display text-4xl font-bold ${i === 0 ? "text-bosque" : ""}`}>{value}</dd>
        </div>
      ))}
    </Reveal>
  );
}

/** Mis casos (con su ruta y en qué se usó el aporte), el historial de aportes y los voluntariados de una billetera. */
export async function DonorSections({
  view,
  explorerBaseUrl,
  photo,
  own,
  routes,
}: {
  view: DonorView;
  explorerBaseUrl: string;
  photo: (path: string) => string;
  own: boolean;
  /** Ruta de cada caso por código, para dibujarla junto a lo que aportó esta billetera. */
  routes?: Map<string, RouteStage[]>;
}) {
  const { t, ruta, locale, formatAmount, formatDate, formatShortDate } = await getT();

  if (view.cases.length === 0 && view.volunteerings.length === 0) {
    return (
      <EmptyState
        title={own ? t("huella.vacio.propio") : t("huella.vacio.ajeno")}
        action={
          <Link href={ruta("/#casos")} className={buttonClass("primario")}>
            {t("huella.vacio.verCasos")}
          </Link>
        }
      >
        {own ? t("huella.vacio.texto") : null}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-12">
      {view.cases.length > 0 ? (
        <section aria-labelledby="mis-casos" className="space-y-5">
          <Reveal as="h2" variant="sube" id="mis-casos" className="text-4xl">
            {own ? t("huella.casos.propios") : t("huella.casos.ajenos")}
          </Reveal>
          {view.cases.map((c, i) => {
            const route = routes?.get(c.code);
            return (
              <Reveal
                as="article"
                variant="capa"
                delay={i}
                key={c.code}
                className="group/caso grid overflow-hidden rounded-[28px] bg-white ring-1 ring-arena/70 transition-[transform,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-1 hover:ring-bosque/60 md:grid-cols-[15rem_minmax(0,1fr)]"
              >
                <div className="relative min-h-52 overflow-hidden bg-salvia">
                  {c.photoPath ? (
                    <Image
                      src={photo(c.photoPath)}
                      alt={c.name}
                      fill
                      sizes="(min-width: 768px) 240px, 100vw"
                      className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/caso:scale-[1.05]"
                    />
                  ) : null}
                </div>
                <div className="space-y-5 p-6 sm:p-7">
                  <div className="space-y-1">
                    <h3 className="text-3xl">
                      <Link href={ruta(`/casos/${c.code}`)} className="transition-colors hover:text-bosque">
                        {c.name}
                      </Link>
                    </h3>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm text-secundario">
                      <span className="cifras font-semibold">{c.code}</span>
                      <span aria-hidden>·</span>
                      <span>{c.ngoName}</span>
                    </p>
                    {c.lastUpdate ? (
                      <p className="pt-2">
                        <strong>{t("huella.casos.ultimaActualizacion")}</strong> {formatShortDate(c.lastUpdate.at)} ·{" "}
                        {c.lastUpdate.kind === "gasto"
                          ? t("huella.casos.ongPago", { concepto: c.lastUpdate.text.toLocaleLowerCase(locale) })
                          : c.lastUpdate.text}
                      </p>
                    ) : null}
                  </div>

                  {route ? (
                    <RouteMap stages={route} size="compacto" showAmounts={false} label={t("casos.rutaDe", { nombre: c.name })} />
                  ) : null}

                  <div className="rounded-[20px] bg-salvia p-5">
                    <p className="font-semibold">{own ? t("huella.casos.usoPropio") : t("huella.casos.usoAjeno")}</p>
                    <ul className="mt-2 divide-y divide-texto/15">
                      {c.allocations.map((a) => (
                        <li key={a.stageName} className="flex items-baseline justify-between gap-4 py-1.5">
                          <span>{a.stageName}</span>
                          <strong className="cifras whitespace-nowrap">{formatAmount(a.amount)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link href={ruta(`/casos/${c.code}`)} className="enlace inline-block">
                    {t("huella.casos.verCaso")}
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Reveal as="section" variant="sube" aria-labelledby="historial" className="border-t-2 border-texto/80 pt-4">
          <h2 id="historial" className="text-3xl">
            {t("huella.historial.titulo")}
          </h2>
          {view.contributions.length === 0 ? (
            <p className="mt-3 text-secundario">{t("huella.historial.vacio")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-arena">
              {view.contributions.map((c) => (
                <li
                  key={c.txHash}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 rounded-lg py-3.5 transition-colors hover:bg-white/50"
                >
                  <span className="min-w-0">
                    <span className="cifras text-sm text-secundario">{formatShortDate(c.confirmedAt)}</span>
                    <span className="block font-semibold">{c.caseName}</span>
                  </span>
                  <strong className="cifras font-display text-2xl whitespace-nowrap">{formatAmount(c.amount)}</strong>
                  <span className="col-span-2 flex flex-wrap gap-x-4 text-sm">
                    <Link href={ruta(`/comprobante/${c.txHash}`)} className="enlace">
                      {t("huella.historial.comprobante")}
                    </Link>
                    <ExplorerLink href={explorerTxUrl(explorerBaseUrl, c.txHash)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal as="section" variant="sube" delay={1} aria-labelledby="voluntariados" className="border-t-2 border-texto/80 pt-4">
          <h2 id="voluntariados" className="text-3xl">
            {own ? t("huella.voluntariados.propios") : t("huella.voluntariados.ajenos")}
          </h2>
          {view.volunteerings.length === 0 ? (
            <p className="mt-3 text-secundario">
              {own ? (
                <>
                  {t("huella.voluntariados.vacioPropio")}{" "}
                  <Link href={ruta("/#voluntariados")} className="enlace">
                    {t("huella.voluntariados.ver")}
                  </Link>
                </>
              ) : (
                t("huella.voluntariados.vacioAjeno")
              )}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-arena">
              {view.volunteerings.map((v) => (
                <li key={v.ngoName + v.date} className="flex items-start justify-between gap-3 py-3.5">
                  <span className="min-w-0">
                    <span className="cifras text-sm text-secundario">{formatDate(v.date)}</span>
                    <span className="block font-semibold">{v.ngoName}</span>
                    <span className="block text-sm text-secundario">{v.title}</span>
                  </span>
                  <Chip tone="logro">{t("huella.voluntariados.inscrito")}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </div>
  );
}
