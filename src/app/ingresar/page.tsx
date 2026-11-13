import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSession, homeFor } from "@/app/_lib/session";
import { IconoCheck } from "@/components/iconos";
import { Logo } from "@/components/sitio/Logo";
import { SelectorIdioma } from "@/components/sitio/SelectorIdioma";
import { TestnetBadge } from "@/components/ui";
import { quitarIdioma } from "@/i18n/config";
import { getIdioma, getT, redirigir } from "@/i18n/servidor";
import { getCatalogService } from "@/platform/container";
import { AccountForms } from "./AccountForms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cuenta.ingresar.meta") };
}

type Props = { searchParams: Promise<{ modo?: string; tipo?: string; volver?: string }> };

const LINEAS = ["cuenta.ingresar.linea.donantes", "cuenta.ingresar.linea.voluntarios", "cuenta.ingresar.linea.ong"] as const;

/** Si la persona llega desde «Apadrinar», el caso que eligió: así la página le muestra a quién va a apadrinar. */
async function sponsoredCase(volver: string | undefined, sinNombre: string) {
  const code = quitarIdioma(volver ?? "").match(/^\/casos\/(POW_\d{3,6})\?(?:.*&)?apadrinar=1/)?.[1];
  if (!code) return null;
  const detail = await getCatalogService().caseDetail(code, await getIdioma());
  return detail ? { name: detail.commonName ?? sinNombre, photoUrl: detail.photoUrl } : null;
}

/** Cuenta 1: crear cuenta (persona u ONG) o ingresar. Todos entran con correo y contraseña. */
export default async function IngresarPage({ searchParams }: Props) {
  const { modo, tipo, volver } = await searchParams;
  const { t, rich, ruta } = await getT();
  const session = await getSession();
  // Con la sesión ya iniciada no hay nada que hacer aquí: vuelve a donde iba (si es una ruta interna) o a su inicio.
  if (session) return redirigir(volver?.startsWith("/") && !volver.startsWith("//") ? volver : homeFor(session));
  const caso = await sponsoredCase(volver, t("cuenta.ingresar.esteCaso"));

  return (
    <main className="grid min-h-screen lg:grid-cols-[3fr_4fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Image
          src={caso?.photoUrl ?? "/fotos/portada-oso-de-anteojos.webp"}
          alt=""
          fill
          priority
          sizes="45vw"
          className={`object-cover ${caso ? "object-center" : "object-[78%_center]"}`}
        />
        <div className="absolute inset-0 bg-profundo/70" />
        <div className="relative">
          <Logo dark />
        </div>
        {caso ? (
          <>
            <div className="relative space-y-4">
              <h2 className="text-5xl leading-tight xl:text-6xl">
                {t("cuenta.ingresar.caso.titulo", { nombre: caso.name })}
              </h2>
              <p className="max-w-md text-lg text-white/90">{t("cuenta.ingresar.caso.texto")}</p>
            </div>
            <ol className="relative space-y-3">
              {[
                t("cuenta.ingresar.caso.paso1", { nombre: caso.name }),
                t("cuenta.ingresar.caso.paso2"),
                t("cuenta.ingresar.caso.paso3"),
              ].map((paso, i) => (
                <li key={paso} className="flex items-center gap-3">
                  <span
                    className={`cifras flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-salvia text-profundo" : i === 1 ? "bg-crema text-profundo ring-4 ring-crema/30" : "border-2 border-dashed border-white/50"}`}
                  >
                    {i === 0 ? <IconoCheck className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={i === 1 ? "font-semibold" : "text-white/85"}>{paso}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <div className="relative space-y-4">
              <h2 className="text-6xl leading-tight">{t("cuenta.ingresar.titulo")}</h2>
              <p className="max-w-md text-lg text-white/90">{t("cuenta.ingresar.texto")}</p>
            </div>
            <ul className="relative space-y-2">
              {LINEAS.map((clave) => (
                <li key={clave} className="flex items-center gap-3">
                  <IconoCheck className="h-5 w-5 text-salvia" />
                  <span>{rich(clave, { b: (s) => <strong>{s}</strong> })}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-3">
          <span className="mr-auto lg:hidden">
            <Logo />
          </span>
          <SelectorIdioma />
          <span className="hidden sm:contents">
            <TestnetBadge />
          </span>
          <Link href={ruta("/")} className="font-medium text-bosque underline">
            {t("cuenta.ingresar.volverInicio")}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
          {caso ? (
            <div className="flex w-full max-w-xl items-center gap-4 rounded-[20px] bg-profundo p-4 text-white lg:hidden">
              {caso.photoUrl ? (
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px]">
                  <Image src={caso.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                </span>
              ) : null}
              <p>
                <strong className="block">{t("cuenta.ingresar.caso.titulo", { nombre: caso.name })}</strong>
                <span className="text-sm text-white/85">{t("cuenta.ingresar.caso.alTerminar")}</span>
              </p>
            </div>
          ) : null}
          <AccountForms
            initialMode={modo === "ingresar" ? "ingresar" : "crear"}
            initialRole={tipo === "ong" ? "ong" : "persona"}
            returnTo={volver}
          />
        </div>
      </section>
    </main>
  );
}
