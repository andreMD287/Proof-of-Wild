"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { submitNgoApplication, type NgoApplication } from "./actions";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

/** Formulario del registro de ONG, con el aviso de tratamiento de datos (Ley 1581 de 2012). */
export function NgoForm({ contactEmail }: { contactEmail: string }) {
  const { t, ruta } = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (name: string) => String(f.get(name) ?? "");
    const input: NgoApplication = {
      name: text("name"),
      nit: text("nit"),
      kind: text("kind") as NgoApplication["kind"],
      city: text("city"),
      description: text("description"),
      environmentalPermit: text("environmentalPermit"),
      contactName: text("contactName"),
      contactEmail: text("contactEmail"),
      contactPhone: text("contactPhone"),
      stellarAccount: text("stellarAccount"),
      offersVolunteering: text("offersVolunteering") === "si",
      consent: f.get("consent") !== null,
    };
    setBusy(true);
    setError(null);
    try {
      const result = await submitNgoApplication(input);
      if (!result.ok) return setError(result.message);
      router.refresh();
    } catch {
      setError(t("comun.error.conexion"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.nombre")}</span>
        <input name="name" required className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">NIT</span>
        <input name="nit" required placeholder="900.000.000-0" className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.tipo")}</span>
        <select name="kind" defaultValue="centro_atencion" className={field}>
          <option value="centro_atencion">{t("ong.tipo.centro_atencion")}</option>
          <option value="fundacion">{t("ong.tipo.fundacion")}</option>
          <option value="ong">{t("ong.tipo.ong")}</option>
        </select>
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.ciudad")}</span>
        <input name="city" required placeholder="Ibagué, Tolima" className={field} />
      </label>
      <label className="block sm:col-span-2">
        <span className="font-semibold">{t("ong.registro.form.descripcion")}</span>
        <textarea name="description" required rows={2} className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.permiso")}</span>
        <input name="environmentalPermit" className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.contacto")}</span>
        <input name="contactName" required className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.correo")}</span>
        <input name="contactEmail" type="email" defaultValue={contactEmail} required className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.telefono")}</span>
        <input name="contactPhone" required placeholder="+57 …" className={field} />
      </label>
      <label className="block">
        <span className="font-semibold">{t("ong.registro.form.cuenta")}</span>
        <input name="stellarAccount" required placeholder="G…" className={`${field} font-mono`} />
        <Link href={ruta("/#billetera")} className="mt-1 inline-block text-sm font-medium text-bosque underline">
          {t("ong.registro.form.crearCuenta")}
        </Link>
      </label>
      <fieldset>
        <legend className="font-semibold">{t("ong.registro.form.voluntariados")}</legend>
        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2">
            <input type="radio" name="offersVolunteering" value="si" defaultChecked className="h-5 w-5 accent-bosque" />{" "}
            {t("ong.registro.form.si")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="offersVolunteering" value="no" className="h-5 w-5 accent-bosque" />{" "}
            {t("ong.registro.form.no")}
          </label>
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error sm:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-arena/60 pt-5 sm:col-span-2">
        <label className="flex max-w-lg items-start gap-3 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 accent-bosque" />
          <span>{t("ong.registro.form.consentimiento")}</span>
        </label>
        <button type="submit" disabled={busy} className={buttonClass("primario", "px-8 py-3 text-lg")}>
          {busy ? t("ong.registro.form.enviando") : t("ong.registro.form.enviar")}
        </button>
      </div>
    </form>
  );
}
