"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconoCheck, IconoHuella } from "@/components/iconos";
import { buttonClass } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { saveProfile, type ProfileInput } from "./actions";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

const INTERESES = [
  ["aves", "cuenta.perfil.interes.aves"],
  ["mamiferos", "cuenta.perfil.interes.mamiferos"],
  ["reptiles", "cuenta.perfil.interes.reptiles"],
] as const;

type Interest = (typeof INTERESES)[number][0];

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold transition ${on ? "bg-bosque text-white" : "border border-arena bg-white"}`}
    >
      {on ? <IconoCheck /> : null}
      {children}
    </button>
  );
}

/** Cuenta 2: terminar el perfil de una persona, con la vista previa «Así te verán». */
export function ProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const { t, ruta } = useT();
  const router = useRouter();
  const [data, setData] = useState<ProfileInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => setData((d) => ({ ...d, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await saveProfile(data);
      if (!result.ok) return setError(result.message);
      router.push(ruta("/perfil"));
      router.refresh();
    } catch {
      setError(t("comun.error.conexion"));
    } finally {
      setBusy(false);
    }
  }

  // Sin suponer el género de la persona: «Voluntariado» en vez de «Voluntaria» o «Voluntario».
  const roles = [
    data.wantsToDonate ? t("cuenta.perfil.vista.donante") : null,
    data.wantsToVolunteer ? t("cuenta.perfil.vista.voluntariado") : null,
    data.city || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr]">
      <aside className="space-y-6">
        <ol className="space-y-5 rounded-3xl bg-white p-7">
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
              <IconoCheck />
            </span>
            <span>
              <strong className="block">{t("cuenta.perfil.paso.cuentaCreada")}</strong>
              <span className="text-secundario">{email}</span>
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-bosque font-semibold text-bosque">
              2
            </span>
            <span>
              <strong className="block text-bosque">{t("cuenta.perfil.paso.tuPerfil")}</strong>
              <span className="text-secundario">{t("cuenta.perfil.paso.tuPerfilTexto")}</span>
            </span>
          </li>
          <li className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-arena bg-crema font-semibold">
              3
            </span>
            <span>
              <strong className="block">{t("cuenta.perfil.billetera")}</strong>
              <span className="text-secundario">{t("cuenta.perfil.paso.billeteraTexto")}</span>
            </span>
          </li>
        </ol>

        <div className="flex flex-col items-center gap-2 rounded-3xl bg-profundo p-8 text-center text-white">
          <p className="font-semibold text-arena">{t("cuenta.perfil.vista.titulo")}</p>
          <span className="mt-2 flex h-24 w-24 items-center justify-center rounded-full bg-arena font-serif text-4xl text-texto">
            {(data.alias || "?").trim().charAt(0).toUpperCase()}
          </span>
          <p className="font-serif text-3xl">{data.alias || t("cuenta.perfil.vista.alias")}</p>
          <p className="text-white/85">{roles || t("cuenta.perfil.vista.elige")}</p>
          <div className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-dashed border-white/40 p-4 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <IconoHuella className="h-5 w-5" />
            </span>
            <span>
              <strong className="block">{t("cuenta.perfil.vista.huella")}</strong>
              <span className="text-sm text-white/80">{t("cuenta.perfil.vista.huellaTexto")}</span>
            </span>
          </div>
        </div>
      </aside>

      <form onSubmit={onSubmit} className="space-y-6 rounded-3xl bg-white p-8 sm:p-10" noValidate>
        <header>
          <h1 className="text-5xl">{t("cuenta.perfil.titulo")}</h1>
          <p className="mt-2 text-secundario">{t("cuenta.perfil.privacidad")}</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold">{t("cuenta.perfil.nombre")}</span>
            <input value={data.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">{t("cuenta.perfil.alias")}</span>
            <input value={data.alias} onChange={(e) => set("alias", e.target.value)} className={field} />
            <span className="mt-1 block text-sm text-secundario">{t("cuenta.perfil.aliasAyuda")}</span>
          </label>
          <label className="block">
            <span className="font-semibold">{t("cuenta.perfil.ciudad")}</span>
            <input value={data.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">{t("cuenta.perfil.telefono")}</span>
            <input
              value={data.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+57 …"
              autoComplete="tel"
              className={field}
            />
            <span className="mt-1 block text-sm text-secundario">{t("cuenta.perfil.telefonoAyuda")}</span>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 font-semibold">{t("cuenta.perfil.participar")}</legend>
            <div className="flex flex-wrap gap-2">
              <Toggle on={data.wantsToDonate} onClick={() => set("wantsToDonate", !data.wantsToDonate)}>
                {t("cuenta.perfil.donar")}
              </Toggle>
              <Toggle on={data.wantsToVolunteer} onClick={() => set("wantsToVolunteer", !data.wantsToVolunteer)}>
                {t("cuenta.perfil.serVoluntario")}
              </Toggle>
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">{t("cuenta.perfil.intereses")}</legend>
            <div className="flex flex-wrap gap-2">
              {INTERESES.map(([value, label]) => {
                const on = data.interests.includes(value);
                return (
                  <Toggle
                    key={value}
                    on={on}
                    onClick={() =>
                      set("interests", on ? data.interests.filter((i) => i !== value) : [...data.interests, value as Interest])
                    }
                  >
                    {t(label)}
                  </Toggle>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="rounded-2xl bg-gris p-5">
          <p className="font-semibold">{t("cuenta.perfil.billetera")}</p>
          <p className="text-secundario">{t("cuenta.perfil.billeteraTexto")}</p>
        </div>

        <div className="space-y-3">
          {(
            [
              ["showAlias", t("cuenta.perfil.mostrarAlias")],
              ["emailUpdates", t("cuenta.perfil.novedades")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={data[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-bosque"
              />
              <span>{label}</span>
            </label>
          ))}
          <p className="flex items-start gap-3 text-secundario">
            <IconoCheck className="mt-0.5 h-5 w-5 text-bosque" /> {t("cuenta.perfil.autorizaste")}
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-6 border-t border-arena/60 pt-6">
          <Link href={ruta("/#casos")} className="font-medium text-bosque underline">
            {t("cuenta.perfil.despues")}
          </Link>
          <button type="submit" disabled={busy} className={buttonClass("primario", "px-8 py-3 text-lg")}>
            {busy ? t("cuenta.perfil.guardando") : t("cuenta.perfil.guardar")}
          </button>
        </div>
      </form>
    </div>
  );
}
