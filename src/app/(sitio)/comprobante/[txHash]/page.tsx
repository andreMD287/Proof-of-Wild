import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconoCheck } from "@/components/iconos";
import { buttonClass, ExplorerLink } from "@/components/ui";
import { getIdioma, getT } from "@/i18n/servidor";
import { shortAccount } from "@/lib/stellar-account";
import { getCatalogService } from "@/platform/container";
import { Reveal } from "@/components/movimiento/Reveal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ txHash: string }> };

/** Metadatos para compartir en redes (Open Graph): por esto el comprobante se renderiza en el servidor. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ txHash }, { t, formatAmount }] = await Promise.all([params, getT()]);
  const receipt = await getCatalogService().receipt(txHash.toLowerCase(), await getIdioma());
  if (!receipt) return { title: t("casos.comprobante.metaNoEncontrado") };
  const title = t("casos.comprobante.metaTitulo", { nombre: receipt.caseName, codigo: receipt.caseCode });
  const description = t("casos.comprobante.metaDescripcion", { monto: formatAmount(receipt.amount), ong: receipt.ngoName });
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: receipt.photoUrl ? [receipt.photoUrl] : undefined },
  };
}

/** Comprobante público de un aporte (RF-COM-01). Solo muestra lo que ya es público en la red. */
export default async function ComprobantePage({ params }: Props) {
  const [{ txHash }, { t, ruta, formatAmount, formatDate }] = await Promise.all([params, getT()]);
  const receipt = await getCatalogService().receipt(txHash.toLowerCase(), await getIdioma());
  if (!receipt) notFound();

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-8 md:grid-cols-[1fr_1.4fr]">
      <Reveal as="aside" variant="capa" className="space-y-4 rounded-[28px] bg-white p-6 ring-1 ring-arena/70">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-salvia">
          {receipt.photoUrl ? <Image src={receipt.photoUrl} alt={receipt.caseName} fill sizes="400px" className="object-cover" /> : null}
        </div>
        <p className="font-display text-3xl font-bold">{receipt.caseName}</p>
        <p className="text-secundario">
          {receipt.caseCode} · {receipt.ngoName}
        </p>
        <div className="rounded-[20px] bg-salvia p-5">
          <p className="font-semibold">{t("casos.comprobante.reparto")}</p>
          <ul className="mt-2 space-y-1.5">
            {receipt.allocations.map((a) => (
              <li key={a.position} className="flex justify-between gap-3">
                <span>
                  {a.position}. {a.stageName}
                </span>
                <strong className="cifras whitespace-nowrap">{formatAmount(a.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal as="section" variant="pop" delay={1} className="relative space-y-6 overflow-hidden rounded-[28px] bg-white p-8 ring-1 ring-arena/70">
        {/* Sello de registro: cae sobre el comprobante como un timbre. */}
        <span
          aria-hidden
          className="sello rotulo absolute top-6 right-6 hidden -rotate-6 flex-col items-center rounded-xl border-2 border-dashed border-bosque px-3 py-2 text-center text-bosque sm:flex"
        >
          <span>{t("casos.comprobante.selloRegistrado")}</span>
          <span>{t("casos.comprobante.selloEnStellar")}</span>
        </span>
        <h1 className="flex items-center gap-4 text-4xl sm:pr-32">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
            <IconoCheck className="h-7 w-7" />
          </span>
          {t("casos.comprobante.titulo")}
        </h1>
        <dl className="cifras grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 rounded-[20px] bg-crema p-5">
          <dt className="text-secundario">{t("casos.col.monto")}</dt>
          <dd className="font-semibold">{formatAmount(receipt.amount)}</dd>
          <dt className="text-secundario">{t("casos.col.caso")}</dt>
          <dd>
            {receipt.caseName} · {receipt.caseCode}
          </dd>
          <dt className="text-secundario">{t("casos.col.fecha")}</dt>
          <dd>{formatDate(receipt.confirmedAt)}</dd>
          <dt className="text-secundario">{t("casos.col.billetera")}</dt>
          <dd className="font-mono">{shortAccount(receipt.donorAccount)}</dd>
          <dt className="text-secundario">{t("casos.col.transaccion")}</dt>
          <dd className="flex flex-wrap gap-3">
            <span className="font-mono">
              {receipt.txHash.slice(0, 4)}…{receipt.txHash.slice(-4)}
            </span>
            <ExplorerLink href={receipt.txUrl}>{t("casos.verEnStellarExpert")}</ExplorerLink>
          </dd>
        </dl>
        <p className="text-sm text-secundario">{t("casos.comprobante.nota")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={ruta(`/casos/${receipt.caseCode}`)} className={buttonClass("primario")}>
            {t("casos.verEnQueSeUsa")}
          </Link>
          <Link href={ruta(`/huella/${receipt.donorAccount}`)} className={buttonClass("secundario")}>
            {t("casos.comprobante.verHuella")}
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
