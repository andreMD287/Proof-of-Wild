"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { signIn, signUp } from "./srp-client";

type Mode = "crear" | "ingresar";
type Role = "persona" | "ong";

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";

/** Pantalla «Cuenta 1»: una tarjeta con dos pestañas, Crear cuenta e Ingresar. */
export function AccountForms({ initialMode, initialRole, returnTo }: { initialMode: Mode; initialRole: Role; returnTo?: string }) {
  const { t, ruta } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "crear") {
      if (password.length < 8) return setError(t("cuenta.form.error.corta"));
      if (password !== String(form.get("password2") ?? "")) return setError(t("cuenta.form.error.noCoinciden"));
      if (!form.get("consent")) return setError(t("cuenta.form.error.consentimiento"));
    }

    setBusy(true);
    try {
      const result =
        mode === "crear" ? await signUp(t, email, password, role, returnTo) : await signIn(t, email, password, returnTo);
      if (!result.ok) return setError(result.message);
      // El servidor devuelve la ruta sin prefijo de idioma.
      router.push(ruta(result.data.redirectTo));
      router.refresh();
    } catch {
      setError(t("comun.error.conexion"));
    } finally {
      setBusy(false);
    }
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      className={`flex-1 rounded-full py-3 font-semibold transition ${mode === value ? "bg-bosque text-white" : "text-texto"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-lg sm:p-10">
      <div role="tablist" className="mb-6 flex rounded-full bg-crema p-1.5">
        {tab("crear", t("comun.nav.crearCuenta"))}
        {tab("ingresar", t("comun.nav.ingresar"))}
      </div>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <h1 className="text-4xl">{mode === "crear" ? t("cuenta.form.tituloCrear") : t("cuenta.form.tituloIngresar")}</h1>

        {mode === "crear" ? (
          <fieldset>
            <legend className="mb-2 font-semibold">{t("cuenta.form.participar")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["persona", t("cuenta.form.persona.titulo"), t("cuenta.form.persona.texto")],
                  ["ong", t("cuenta.form.ong.titulo"), t("cuenta.form.ong.texto")],
                ] as const
              ).map(([value, title, text]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition ${role === value ? "border-bosque bg-crema" : "border-arena"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-secundario">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <label className="block">
          <span className="font-semibold">{t("cuenta.form.correo")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("cuenta.form.correoEjemplo")}
            className={field}
          />
        </label>

        <div className={mode === "crear" ? "grid gap-3 sm:grid-cols-2" : ""}>
          <label className="block">
            <span className="font-semibold">{t("cuenta.form.contrasena")}</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "crear" ? 8 : undefined}
              autoComplete={mode === "crear" ? "new-password" : "current-password"}
              className={field}
            />
          </label>
          {mode === "crear" ? (
            <label className="block">
              <span className="font-semibold">{t("cuenta.form.repetir")}</span>
              <input name="password2" type="password" required autoComplete="new-password" className={field} />
            </label>
          ) : null}
        </div>
        {mode === "crear" ? <p className="-mt-3 text-sm text-secundario">{t("cuenta.form.minimo")}</p> : null}

        {mode === "crear" ? (
          <label className="flex gap-3 text-sm">
            <input name="consent" type="checkbox" className="mt-0.5 h-5 w-5 accent-bosque" />
            <span>{t("cuenta.form.consentimiento")}</span>
          </label>
        ) : (
          <p className="text-sm">
            <Link href={ruta("/#cuenta")} className="font-medium text-bosque underline">
              {t("cuenta.form.olvidaste")}
            </Link>
          </p>
        )}

        {error ? (
          <p role="alert" className="rounded-xl border border-error bg-error/5 px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={buttonClass("primario", "w-full py-3.5 text-lg")}>
          {busy ? t("cuenta.form.unMomento") : mode === "crear" ? t("comun.nav.crearCuenta") : t("comun.nav.ingresar")}
        </button>

        <p className="text-sm text-secundario">
          {mode === "crear" ? t("cuenta.form.notaCrear") : t("cuenta.form.notaIngresar")}
        </p>
      </form>
    </div>
  );
}
