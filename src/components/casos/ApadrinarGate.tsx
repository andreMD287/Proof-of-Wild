"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/ingresar/actions";
import { IconoHuella, IconoMenu } from "@/components/iconos";
import { ContourField } from "@/components/mapa/ContourField";
import { RouteMap } from "@/components/mapa/RouteMap";
import { buttonClass, Spinner } from "@/components/ui";
import { Ventana } from "@/components/ventana";
import { useT } from "@/i18n/cliente";
import type { Clave } from "@/i18n/traductor";
import type { RouteStage } from "@/modules/catalog";

const PASOS = [
  { titulo: "casos.invitacion.paso1.titulo", texto: "casos.invitacion.paso1.texto" },
  { titulo: "casos.invitacion.paso2.titulo", texto: "casos.invitacion.paso2.texto" },
  { titulo: "casos.invitacion.paso3.titulo", texto: "casos.invitacion.paso3.texto" },
] as const satisfies ReadonlyArray<{ titulo: Clave; texto: Clave }>;

/**
 * Antes de apadrinar hace falta una cuenta de persona (ADR-16). En vez de un error, esta ventana muestra lo que la
 * persona va a apadrinar, los tres pasos como un sendero y la insignia que gana, con dos entradas claras: crear
 * cuenta o ingresar. Ambas vuelven a este caso con la ventana de apadrinar abierta.
 * Con una cuenta de ONG o de administrador, ofrece cerrar sesión para entrar con la de persona.
 */
export function ApadrinarGate({
  item,
  returnTo,
  closeHref,
  otherAccount,
}: {
  item: { code: string; name: string; photoUrl: string | null; route: RouteStage[] };
  /** A dónde vuelve después de crear la cuenta o ingresar (el caso con la ventana abierta), sin prefijo de idioma. */
  returnTo: string;
  closeHref: string;
  /** Nombre de la cuenta de ONG o de administrador con la que se entró, si la hay. */
  otherAccount?: string | null;
}) {
  const { t, rich, ruta } = useT();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const volver = encodeURIComponent(returnTo);
  const close = () => router.push(ruta(closeHref), { scroll: false });

  const switchAccount = async () => {
    setLeaving(true);
    await logout().catch(() => {});
    router.push(ruta(`/ingresar?modo=ingresar&volver=${volver}`));
    router.refresh();
  };

  return (
    <Ventana
      onClose={close}
      labelledBy="titulo-cuenta-apadrinar"
      className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
    >
      {/* Lo que va a apadrinar: el animal y su ruta, sobre curvas de nivel. */}
      <aside className="relative isolate flex flex-col gap-5 overflow-hidden bg-profundo p-7 text-white">
        <ContourField variant="noche" seed={31} className="absolute inset-0 -z-10 h-full w-full" />
        <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-salvia ring-4 ring-crema/90">
          {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} fill sizes="420px" className="object-cover" /> : null}
        </div>
        <div>
          <p className="font-display text-3xl font-bold">{item.name}</p>
          <p className="cifras text-sm text-white/80">{item.code}</p>
        </div>
        <RouteMap
          stages={item.route}
          tone="oscuro"
          size="compacto"
          showAmounts={false}
          label={t("casos.rutaDe", { nombre: item.name })}
        />
      </aside>

      <section className="relative space-y-6 p-7 sm:p-9">
        <button
          type="button"
          onClick={close}
          aria-label={t("casos.cerrar")}
          className="mov-hover absolute top-5 right-5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque"
        >
          <IconoMenu abierto className="h-5 w-5" />
        </button>

        {otherAccount ? (
          <>
            <h2 id="titulo-cuenta-apadrinar" className="pr-12 text-4xl">
              {t("casos.invitacion.otraCuenta.titulo")}
            </h2>
            <p className="text-lg text-secundario">
              {rich(
                "casos.invitacion.otraCuenta.texto",
                { b: (s) => <strong className="text-texto">{s}</strong> },
                { cuenta: otherAccount, nombre: item.name },
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={switchAccount} disabled={leaving} className={buttonClass("primario", "py-3.5")}>
                {leaving ? <Spinner /> : null}
                {t("casos.invitacion.otraCuenta.salir")}
              </button>
              <button type="button" onClick={close} className={buttonClass("secundario", "py-3.5")}>
                {t("casos.invitacion.otraCuenta.volver")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 pr-12">
              <h2 id="titulo-cuenta-apadrinar" className="text-4xl">
                {t("casos.invitacion.titulo")}
              </h2>
              <p className="text-lg text-secundario">{t("casos.invitacion.texto", { nombre: item.name })}</p>
            </div>

            {/* Los tres pasos como un sendero: el primero late, es donde va la persona. */}
            <ol className="relative space-y-4">
              <span aria-hidden className="absolute top-5 bottom-5 left-[1.2rem] border-l-2 border-dashed border-bosque/35" />
              {PASOS.map((paso, i) => (
                <li key={paso.titulo} className="relative flex gap-4">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    {i === 0 ? <span aria-hidden className="absolute inset-0 animate-latido rounded-full bg-bosque" /> : null}
                    <span
                      className={`cifras relative flex h-10 w-10 items-center justify-center rounded-full font-bold ${i === 0 ? "bg-bosque text-white" : "border-2 border-dashed border-arena bg-crema text-secundario"}`}
                    >
                      {i + 1}
                    </span>
                  </span>
                  <span className="pt-1.5">
                    <strong className="block leading-snug">{t(paso.titulo)}</strong>
                    <span className="text-secundario">{t(paso.texto)}</span>
                  </span>
                </li>
              ))}
            </ol>

            {/* La insignia que gana con su primer aporte. */}
            <div className="flex items-center gap-4 rounded-[20px] bg-crema p-4">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-arena bg-white text-profundo">
                <IconoHuella className="h-7 w-7" />
              </span>
              <p>
                <strong className="block">{t("casos.invitacion.insignia")}</strong>
                <span className="text-sm text-secundario">{t("casos.invitacion.insigniaTexto")}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={ruta(`/ingresar?volver=${volver}`)} className={buttonClass("primario", "px-7 py-3.5 text-lg")}>
                {t("casos.invitacion.crear")}
              </Link>
              <Link href={ruta(`/ingresar?modo=ingresar&volver=${volver}`)} className={buttonClass("secundario", "py-3.5")}>
                {t("casos.invitacion.yaTengo")}
              </Link>
            </div>
            <p className="text-sm text-secundario">{t("casos.invitacion.pie")}</p>
          </>
        )}
      </section>
    </Ventana>
  );
}
