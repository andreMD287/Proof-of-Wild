import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { chipLabel, validationLabel } from "@/app/_lib/labels";
import { requireSession } from "@/app/_lib/session";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { Reveal } from "@/components/movimiento/Reveal";
import { buttonClass, Chip, EmptyState, ExplorerLink } from "@/components/ui";
import { getIdioma, getT } from "@/i18n/servidor";
import type { Traductor } from "@/i18n/traductor";
import { explorerTxUrl } from "@/lib/explorer";
import { fromStroops, sumAmounts, toStroops } from "@/lib/amount";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getPortalData, type PortalPending, type PortalRecord } from "@/platform/db/repositories/portal";
import { DbRecordStore } from "@/platform/db/repositories/records";
import { RecordDialog, type PortalCaseOption } from "./RecordDialog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("ong.portal.titulo") };
}
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ registrar?: string; caso?: string }> };

/** «Etapa 2 · Veterinaria Arrayán»: el detalle de un gasto o de un hito; un aporte no tiene etapa. */
function recordDetail(t: Traductor["t"], r: { kind: PortalRecord["kind"]; stage: number | null; text: string | null }): string {
  if (r.kind === "aporte" || r.stage === null) return t("ong.portal.tipo.aporte");
  return `${t("ong.portal.etapa", { n: r.stage })} · ${r.text ?? ""}`;
}

/** Título y detalle de un pendiente en el idioma de la página. */
function pendingText(t: Traductor["t"], p: PortalPending): { title: string; detail: string } {
  if (p.kind === "subir_foto") {
    return {
      title: t("ong.portal.pendientes.subirFoto"),
      detail: `${t("ong.portal.etapa", { n: p.stage })} · ${p.stageName} · ${p.caseCode}`,
    };
  }
  return {
    title: t("ong.portal.pendientes.esperandoRed"),
    detail: `${t(p.record === "gasto" ? "ong.portal.tipo.gasto" : "ong.portal.tipo.hito")} · ${p.caseCode}`,
  };
}

/** Pantalla 9: el portal de la ONG. Lo que registra aquí aparece en la línea de tiempo y el panel de cada caso. */
export default async function PortalPage({ searchParams }: Props) {
  const session = await requireSession("/portal", "ong");
  const { registrar, caso } = await searchParams;
  const db = getDb();
  const idioma = await getIdioma();
  const data = await getPortalData(db, session.ngoId!, idioma);
  if (!data) return null;
  const tr = await getT();
  const { t, ruta, formatAmount, formatShortDate } = tr;

  const explorer = getExplorerEnv().EXPLORER_BASE_URL;
  const own = (await getCatalogService().listCases(idioma)).filter((c) => c.ngo.slug === data.ngo.slug);
  const store = new DbRecordStore(db);
  const funding = await Promise.all(own.map((c) => store.caseForNgo(data.ngo.id, c.code)));
  const options: PortalCaseOption[] = own.map((c, i) => ({
    code: c.code,
    name: c.commonName ?? t("ong.especieReservada"),
    stages: (funding[i]?.stages ?? []).map((s) => {
      const available = toStroops(s.covered) - toStroops(s.spent);
      return { position: s.position, name: s.name, available: fromStroops(available > 0n ? available : 0n) };
    }),
  }));
  const spentOf = (i: number) => sumAmounts((funding[i]?.stages ?? []).map((s) => s.spent));
  const active = own.filter((c) => !c.recovered).length;

  const kpis: Array<[string, string]> = [
    [t("ong.portal.kpi.activos"), String(active)],
    [t("ong.portal.kpi.recibido"), formatAmount(data.totals.received)],
    [t("ong.portal.kpi.gastado"), formatAmount(data.totals.spent)],
    [t("ong.portal.kpi.pendientes"), String(data.pending.length)],
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
      <Reveal
        as="header"
        variant="capa"
        className="relative isolate grid items-end gap-8 overflow-hidden rounded-[32px] bg-profundo p-8 text-white sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto]"
      >
        <ContourField variant="noche" seed={29} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="space-y-3">
          <h1 className="text-5xl font-bold sm:text-6xl">{t("ong.portal.hola", { nombre: data.ngo.name })}</h1>
          <p className="max-w-2xl text-lg text-white/90">
            {t("ong.portal.intro")}{" "}
            <Link
              href={ruta(`/ong/${data.ngo.slug}`)}
              className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
            >
              {t("ong.portal.verPerfil")}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={ruta("/portal?registrar=gasto")} scroll={false} className={buttonClass("arena", "px-7 py-3.5")}>
            {t("ong.portal.registrarGasto")}
          </Link>
          <Link href={ruta("/portal?registrar=hito")} scroll={false} className={buttonClass("contorno", "px-7 py-3.5")}>
            {t("ong.portal.registrarHito")}
          </Link>
        </div>
      </Reveal>

      <Reveal as="dl" variant="sube" className="grid grid-cols-2 border-y-2 border-texto/80 lg:grid-cols-4">
        {kpis.map(([label, value], i) => (
          <div
            key={label}
            className={`border-arena px-5 py-4 ${i % 2 === 1 ? "border-l" : ""} ${i > 0 ? "lg:border-l" : ""} ${i > 1 ? "border-t lg:border-t-0" : ""}`}
          >
            <dt className="rotulo text-secundario">{label}</dt>
            <dd
              className={`cifras mt-1 font-display text-4xl font-bold ${i === 3 && data.pending.length > 0 ? "text-error" : i === 1 ? "text-bosque" : ""}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </Reveal>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="mis-casos" className="space-y-4">
          <Reveal as="h2" variant="sube" id="mis-casos" className="text-4xl">
            {t("ong.portal.misCasos")}
          </Reveal>
          {own.length === 0 ? (
            <EmptyState title={t("ong.portal.vacio.titulo")}>{t("ong.portal.vacio.texto")}</EmptyState>
          ) : (
            own.map((c, i) => (
              <Reveal
                as="article"
                variant="pop"
                delay={i}
                key={c.code}
                className="group/caso grid gap-5 rounded-[24px] bg-white p-4 ring-1 ring-arena/70 transition-[transform,--tw-ring-color] duration-300 ease-(--ease-spring) hover:-translate-y-0.5 hover:ring-bosque/60 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:p-5"
              >
                <div className="relative h-24 w-24 overflow-hidden rounded-[18px] bg-salvia sm:h-[6.5rem] sm:w-[6.5rem]">
                  {c.photoUrl ? (
                    <Image
                      src={c.photoUrl}
                      alt=""
                      fill
                      sizes="104px"
                      className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover/caso:scale-[1.08]"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl">
                        <Link href={ruta(`/casos/${c.code}`)} className="transition-colors hover:text-bosque">
                          {c.commonName ?? t("ong.especieReservada")}
                        </Link>
                        <Chip tone={c.chip.tone === "logro" ? "logro" : "etapa"}>{chipLabel(tr, c)}</Chip>
                      </h3>
                      <p className="cifras text-sm text-secundario">{c.code}</p>
                    </div>
                    <span className="flex flex-wrap gap-2">
                      <Link
                        href={ruta(`/portal?registrar=hito&caso=${c.code}`)}
                        scroll={false}
                        className={buttonClass("secundario", "px-4 py-2 text-sm")}
                      >
                        {c.recovered ? t("ong.portal.seguimiento") : t("ong.portal.tipo.hito")}
                      </Link>
                      {c.recovered ? null : (
                        <Link
                          href={ruta(`/portal?registrar=gasto&caso=${c.code}`)}
                          scroll={false}
                          className={buttonClass("primario", "px-4 py-2 text-sm")}
                        >
                          {t("ong.portal.tipo.gasto")}
                        </Link>
                      )}
                    </span>
                  </div>
                  <RouteMap
                    stages={c.route}
                    size="compacto"
                    showAmounts={false}
                    label={t("casos.rutaDe", { nombre: c.commonName ?? c.code })}
                  />
                  <dl className="cifras grid grid-cols-3 gap-3 border-t border-arena pt-3 text-sm">
                    <div>
                      <dt className="rotulo text-secundario">{t("ong.portal.costoTotal")}</dt>
                      <dd className="font-semibold">{formatAmount(c.goal)}</dd>
                    </div>
                    <div>
                      <dt className="rotulo text-secundario">{t("ong.portal.recaudado")}</dt>
                      <dd className="font-semibold text-bosque">{formatAmount(c.raised)}</dd>
                    </div>
                    <div>
                      <dt className="rotulo text-secundario">{t("ong.portal.kpi.gastado")}</dt>
                      <dd className="font-semibold">{formatAmount(spentOf(i))}</dd>
                    </div>
                  </dl>
                </div>
              </Reveal>
            ))
          )}
        </section>

        <Reveal as="section" variant="sube" delay={1} aria-labelledby="pendientes" className="space-y-3 self-start border-t-2 border-texto/80 pt-4">
          <h2 id="pendientes" className="text-3xl">
            {t("ong.portal.kpi.pendientes")}
          </h2>
          {data.pending.length === 0 ? (
            <p className="text-secundario">{t("ong.portal.pendientes.vacio")}</p>
          ) : (
            <ul className="divide-y divide-arena">
              {data.pending.map((p) => {
                const { title, detail } = pendingText(t, p);
                return (
                  <li key={title + detail} className="flex gap-3 py-3">
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.tone === "accion" ? "animate-brillo bg-error" : "bg-arena"}`}
                    />
                    <span className="min-w-0">
                      <strong className="block">{title}</strong>
                      <span className="text-sm text-secundario">{detail}</span>
                      {p.kind === "subir_foto" ? (
                        <Link
                          href={ruta(`/portal?registrar=hito&caso=${p.caseCode}`)}
                          scroll={false}
                          className="enlace mt-1 block text-sm"
                        >
                          {t("ong.portal.pendientes.registrarHito")}
                        </Link>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Reveal>
      </div>

      <Reveal as="section" variant="sube" aria-labelledby="ultimos" className="border-t-2 border-texto/80 pt-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ultimos" className="text-3xl">
            {t("ong.portal.ultimos.titulo")}
          </h2>
          <p className="text-sm text-secundario">{t("ong.portal.ultimos.nota")}</p>
        </div>
        {data.records.length === 0 ? (
          <p className="text-secundario">{t("ong.portal.ultimos.vacio")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left">
              <thead className="rotulo border-b border-arena text-secundario">
                <tr>
                  <th className="py-2 font-bold">{t("ong.portal.col.fecha")}</th>
                  <th className="py-2 font-bold">{t("ong.portal.col.tipo")}</th>
                  <th className="py-2 font-bold">{t("ong.portal.col.caso")}</th>
                  <th className="py-2 font-bold">{t("ong.portal.col.monto")}</th>
                  <th className="py-2 font-bold">{t("ong.portal.col.estado")}</th>
                  <th className="py-2 font-bold">{t("ong.portal.col.comprobantes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena/60">
                {data.records.map((r) => (
                  <tr key={`${r.kind}-${r.txHash}`} className="transition-colors hover:bg-white/60">
                    <td className="cifras py-3 pr-3 whitespace-nowrap">{formatShortDate(r.at)}</td>
                    <td className="py-3 pr-3">
                      <Chip tone={r.kind === "aporte" ? "salvia" : r.kind === "gasto" ? "etapa" : "borde"}>
                        {t(`ong.portal.tipo.${r.kind}`)}
                      </Chip>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="cifras font-semibold">{r.caseCode}</span> · {recordDetail(t, r)}
                    </td>
                    <td className="cifras py-3 pr-3 font-semibold whitespace-nowrap">{r.amount ? formatAmount(r.amount) : "—"}</td>
                    <td className="py-3 pr-3">
                      <Chip tone={r.status === "por_confirmar" ? "borde" : "logro"}>
                        {r.status === "en_la_red"
                          ? t("ong.portal.estado.enLaRed")
                          : r.status === "por_confirmar"
                            ? t("ong.portal.estado.porConfirmar")
                            : validationLabel(t, r.status).short}
                      </Chip>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {r.fileKey ? (
                        <>
                          <a href={evidenceUrl(r.fileKey)} target="_blank" rel="noreferrer" className="enlace">
                            {r.kind === "gasto" ? t("ong.portal.factura") : t("ong.portal.foto")}
                          </a>{" "}
                          ·{" "}
                        </>
                      ) : null}
                      {r.txHash ? <ExplorerLink href={explorerTxUrl(explorer, r.txHash)} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Reveal>

      {registrar === "gasto" || registrar === "hito" ? (
        <RecordDialog
          kind={registrar}
          cases={registrar === "gasto" ? options.filter((o) => !own.find((c) => c.code === o.code)?.recovered) : options}
          providers={data.providers}
          ngoAccount={data.ngo.stellarAccount}
          explorerBaseUrl={explorer}
          initialCase={caso}
        />
      ) : null}
    </main>
  );
}
