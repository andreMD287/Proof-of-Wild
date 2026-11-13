import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/app/_lib/session";
import { BadgeCard, DonorHeader, DonorSections, DonorTotals } from "@/components/huella/DonorSections";
import { buttonClass } from "@/components/ui";
import { getIdioma, getT } from "@/i18n/servidor";
import { getExplorerEnv } from "@/platform/config/env";
import { evidenceUrl, getCatalogService, getIdentityService } from "@/platform/container";
import { getDb } from "@/platform/db/client";
import { enrollmentsOf, getDonorView, type DonorView } from "@/platform/db/repositories/donor";
import { personProfiles } from "@/platform/db/schema";
import { DisconnectButton } from "./DisconnectButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cuenta.miPerfil.meta") };
}
export const dynamic = "force-dynamic";

/** Pantalla 5: perfil del donante, con su insignia, lo que apoya, en qué se usó su aporte y sus voluntariados. */
export default async function PerfilPage() {
  const session = await requireSession("/perfil", "persona");
  const { t, ruta } = await getT();
  const db = getDb();
  const idioma = await getIdioma();
  const [[profile], cases, identity] = await Promise.all([
    db
      .select({ alias: personProfiles.alias, account: personProfiles.stellarAccount })
      .from(personProfiles)
      .where(eq(personProfiles.userId, session.userId))
      .limit(1),
    getCatalogService().listCases(idioma),
    getIdentityService().status(session.userId),
  ]);

  const account = profile?.account ?? null;
  const view: DonorView = account
    ? await getDonorView(db, account, idioma, session.userId)
    : {
        account: "",
        alias: profile?.alias ?? null,
        contributions: [],
        cases: [],
        totalAmount: "0",
        volunteerings: await enrollmentsOf(db, session.userId, idioma),
      };
  const alias = profile?.alias ?? session.email;
  const routes = new Map(cases.map((c) => [c.code, c.route]));

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-8">
      <DonorHeader
        name={alias}
        account={account}
        verified={!!identity}
        seal={
          <BadgeCard
            view={view}
            sharePath={ruta(account ? `/huella/${account}` : "/#casos")}
            publicLink={account ? ruta(`/huella/${account}`) : undefined}
          />
        }
        actions={
          <>
            <Link href={ruta("/cuenta/verificar")} className={buttonClass(identity ? "contorno" : "arena")}>
              {identity ? t("cuenta.miPerfil.verVerificacion") : t("cuenta.miPerfil.verificar")}
            </Link>
            {account ? <DisconnectButton /> : null}
            {!profile?.alias ? (
              <Link href={ruta("/cuenta/perfil")} className={buttonClass("arena")}>
                {t("cuenta.miPerfil.completar")}
              </Link>
            ) : null}
          </>
        }
      >
        {account ? null : (
          <p>
            {t("cuenta.miPerfil.billetera")}{" "}
            <Link
              href={ruta("/#casos")}
              className="font-semibold text-arena underline decoration-arena/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-arena"
            >
              {t("cuenta.miPerfil.elegirCaso")}
            </Link>
          </p>
        )}
      </DonorHeader>

      <DonorTotals view={view} />
      <DonorSections view={view} explorerBaseUrl={getExplorerEnv().EXPLORER_BASE_URL} photo={evidenceUrl} own routes={routes} />
    </main>
  );
}
