"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { IconoCheck, IconoMenu } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import type { PublicVolunteering } from "@/platform/db/repositories/volunteering";
import { submitEnrollment } from "./actions";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

/** Franjas de disponibilidad; su texto es `ong.inscripcion.disponibilidad.<franja>`. */
const AVAILABILITY = ["toda_la_jornada", "manana", "tarde"] as const;

/** Ventana D: inscripción a un voluntariado y su confirmación. */
export function EnrollmentDialog({
  volunteering: v,
  defaults,
  signedIn,
}: {
  volunteering: PublicVolunteering;
  defaults: { fullName: string; email: string; phone: string };
  signedIn: boolean;
}) {
  const { t, tn, rich, ruta, formatDayMonth } = useT();
  const router = useRouter();
  const [availability, setAvailability] = useState<(typeof AVAILABILITY)[number]>("toda_la_jornada");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const home = ruta("/");
  const close = () => router.push(home, { scroll: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(home, { scroll: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, home]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await submitEnrollment({
        volunteeringId: v.id,
        fullName: String(f.get("fullName") ?? ""),
        email: String(f.get("email") ?? ""),
        phone: String(f.get("phone") ?? ""),
        availability,
        consent: f.get("consent") !== null,
      });
      if (!result.ok) return setError(result.message);
      setDone(true);
      router.refresh();
    } catch {
      setError(t("comun.error.conexion"));
    } finally {
      setBusy(false);
    }
  }

  const free = v.capacity - v.occupied;
  const bold = { b: (s: string) => <strong>{s}</strong> };

  return (
    <div className="anim-fondo fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-inscripcion"
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[92vh] w-full max-w-5xl anim-ventana overflow-auto rounded-[28px] bg-white shadow-2xl md:grid-cols-[1fr_1.6fr]"
      >
        <aside className="space-y-4 bg-profundo p-8 text-white">
          <span className="inline-block rounded-full bg-arena px-3 py-1 text-sm font-semibold text-texto">
            {t("ong.inscripcion.etiqueta")}
          </span>
          <h2 className="text-4xl">{v.ngo.name}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            <dt className="text-arena">{t("ong.inscripcion.fecha")}</dt>
            <dd>{formatDayMonth(v.date)}</dd>
            <dt className="text-arena">{t("ong.inscripcion.horario")}</dt>
            <dd>{v.schedule}</dd>
            <dt className="text-arena">{t("ong.inscripcion.lugar")}</dt>
            <dd>{t("ong.inscripcion.lugarValor", { ciudad: v.city })}</dd>
            <dt className="text-arena">{t("ong.inscripcion.cupos")}</dt>
            <dd>{tn("ong.inscripcion.quedan", free)}</dd>
          </dl>
          <p className="rounded-2xl border border-white/25 bg-white/10 p-4 text-sm">{rich("ong.inscripcion.sinContacto", bold)}</p>
        </aside>

        <section className="space-y-5 p-8">
          <div className="flex items-start justify-between gap-4">
            <h3 id="titulo-inscripcion" className="text-4xl">
              {t("ong.inscripcion.titulo")}
            </h3>
            <button
              type="button"
              onClick={close}
              aria-label={t("ong.inscripcion.cerrar")}
              className="mov-hover flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconoMenu abierto className="h-5 w-5" />
            </button>
          </div>

          {done ? (
            <div className="space-y-5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-salvia text-profundo">
                <IconoCheck className="h-7 w-7" />
              </span>
              <h4 className="font-serif text-4xl">{t("ong.inscripcion.listo.titulo")}</h4>
              <p className="text-lg">
                {t("ong.inscripcion.listo.texto", { ong: v.ngo.name })}
                {signedIn ? ` ${t("ong.inscripcion.listo.enPerfil")}` : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <Link href={ruta("/perfil")} className={buttonClass("primario")}>
                    {t("ong.inscripcion.listo.irPerfil")}
                  </Link>
                ) : null}
                <button type="button" onClick={close} className={buttonClass("secundario")}>
                  {t("ong.inscripcion.listo.verMas")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="font-semibold">{t("ong.inscripcion.nombre")}</span>
                <input name="fullName" defaultValue={defaults.fullName} required autoComplete="name" className={field} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-semibold">{t("ong.inscripcion.correo")}</span>
                  <input name="email" type="email" defaultValue={defaults.email} required autoComplete="email" className={field} />
                </label>
                <label className="block">
                  <span className="font-semibold">{t("ong.inscripcion.telefono")}</span>
                  <input name="phone" defaultValue={defaults.phone} required autoComplete="tel" className={field} />
                </label>
              </div>
              <fieldset>
                <legend className="font-semibold">{t("ong.inscripcion.disponibilidad")}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVAILABILITY.map((value) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 ${availability === value ? "border-bosque bg-crema font-semibold" : "border-arena"}`}
                    >
                      <input
                        type="radio"
                        name="availability"
                        value={value}
                        checked={availability === value}
                        onChange={() => setAvailability(value)}
                        className="accent-bosque"
                      />
                      {t(`ong.inscripcion.disponibilidad.${value}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              {signedIn ? null : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gris p-4 text-sm">
                  <p>{rich("ong.inscripcion.tienesCuenta", bold)}</p>
                  <Link
                    href={ruta(`/ingresar?modo=ingresar&volver=${encodeURIComponent(`/?inscribirme=${v.id}`)}`)}
                    className={buttonClass("secundario", "py-2")}
                  >
                    {t("comun.nav.ingresar")}
                  </Link>
                </div>
              )}
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 accent-bosque" />
                <span>{t("ong.inscripcion.consentimiento")}</span>
              </label>
              {error ? (
                <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-arena/60 pt-4">
                <p className="text-sm text-secundario">{t("ong.inscripcion.nota")}</p>
                <button type="submit" disabled={busy || free <= 0} className={buttonClass("primario", "px-7 py-3")}>
                  {busy ? t("ong.inscripcion.enviando") : t("ong.inscripcion.enviar")}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
