import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCard, DonorHeader, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { getIdioma, getT } from "@/i18n/servidor";
import { isStellarAccount, shortAccount } from "@/lib/stellar-account";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { getDonorView } from "@/platform/db/repositories/donor";
import { isAccountVerified } from "@/platform/db/repositories/identity";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ cuenta: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cuenta } = await params;
  const { t, tn } = await getT();
  if (!isStellarAccount(cuenta)) return { title: t("huella.meta.noEncontrada") };
  const view = await getDonorView(getDb(), cuenta, await getIdioma());
  const who = view.alias ?? shortAccount(cuenta);
  const title = t("huella.meta.titulo", { quien: who });
  const description = tn("huella.meta.descripcion", view.cases.length);
  return { title, description, openGraph: { title, description, type: "profile" } };
}

/**
 * Página pública de la insignia: el alias (si la persona lo permite) o la billetera abreviada, y los aportes que
 * la respaldan con su enlace a Stellar Expert, para que cualquiera compruebe que es real.
 */
export default async function HuellaPage({ params }: Props) {
  const { cuenta } = await params;
  if (!isStellarAccount(cuenta)) notFound();
  const idioma = await getIdioma();
  const [view, cases, verified, { t }] = await Promise.all([
    getDonorView(getDb(), cuenta, idioma),
    getCatalogService().listCases(idioma),
    isAccountVerified(getDb(), cuenta),
    getT(),
  ]);
  const routes = new Map(cases.map((c) => [c.code, c.route]));

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
      <DonorHeader
        name={view.alias ?? t("huella.publica.donante")}
        account={cuenta}
        verified={verified}
        seal={<BadgeCard view={view} sharePath={`/huella/${cuenta}`} />}
      >
        <p>{t("huella.publica.intro")}</p>
      </DonorHeader>
      <DonorTotals view={view} own={false} />
      <DonorSections
        view={view}
        explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL}
        photo={evidenceUrl}
        own={false}
        routes={routes}
      />
    </main>
  );
}
