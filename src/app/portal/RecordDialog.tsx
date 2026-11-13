"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { categoryLabel, EXPENSE_CATEGORIES } from "@/app/_lib/labels";
import { useWallet, walletErrorMessage } from "@/components/billetera/WalletProvider";
import { IconoCheck, IconoMenu } from "@/components/iconos";
import { buttonClass, Spinner } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import type { Clave } from "@/i18n/traductor";
import { shortAccount } from "@/lib/stellar-account";

export interface PortalCaseOption {
  code: string;
  name: string;
  stages: Array<{ position: number; name: string; available: string }>;
}

type Kind = "gasto" | "hito";
type Step = "idle" | "preparing" | "signing" | "sending" | "confirming";
const STEP_LABELS: Record<Exclude<Step, "idle">, Clave> = {
  preparing: "ong.registrar.paso.preparando",
  signing: "ong.registrar.paso.firmando",
  sending: "ong.registrar.paso.enviando",
  confirming: "ong.registrar.paso.confirmando",
};

const field =
  "mt-1 w-full rounded-xl border-2 border-arena bg-white px-4 py-3 outline-none transition-[border-color,box-shadow] duration-200 hover:border-bosque/50 focus:border-bosque focus:ring-4 focus:ring-salvia/45";
type ApiError = { error?: { message: string } };

/** Ventanas B (registrar hito) y C (registrar gasto) del portal de la ONG. */
export function RecordDialog({
  kind,
  cases,
  providers,
  ngoAccount,
  explorerBaseUrl,
  initialCase,
}: {
  kind: Kind;
  cases: PortalCaseOption[];
  providers: Array<{ id: string; name: string; account: string }>;
  ngoAccount: string;
  explorerBaseUrl: string;
  initialCase?: string;
}) {
  const { t, rich, ruta } = useT();
  const router = useRouter();
  const wallet = useWallet();
  const [caseCode, setCaseCode] = useState(cases.find((c) => c.code === initialCase)?.code ?? cases[0]?.code ?? "");
  const selected = cases.find((c) => c.code === caseCode);
  const [stage, setStage] = useState(() => String(selected?.stages.find((s) => Number(s.available) > 0)?.position ?? selected?.stages[0]?.position ?? 1));
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ txHash: string | null; status: string } | null>(null);

  const stageInfo = selected?.stages.find((s) => String(s.position) === stage);
  const provider = useMemo(() => providers.find((p) => p.id === providerId), [providers, providerId]);
  const today = new Date().toISOString().slice(0, 10);
  const busy = step !== "idle";
  const close = () => {
    router.push(ruta("/portal"), { scroll: false });
    router.refresh();
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("caseCode", caseCode);
    form.set("stage", stage);
    try {
      setStep("preparing");
      const prepared = await fetch(`/api/portal/${kind === "gasto" ? "gastos" : "hitos"}/preparar`, { method: "POST", body: form });
      // Si el cuerpo no es JSON (la página HTML de un 502/504), queda vacío y se usa el mensaje propio.
      const prep = (await prepared.json().catch(() => ({}))) as { id: string; xdr: string; networkPassphrase: string } & ApiError;
      if (!prepared.ok) throw new Error(prep.error?.message ?? t("ong.registrar.error.preparar"));

      setStep("signing");
      let address = wallet.address;
      if (address !== ngoAccount) address = await wallet.connect().catch((e) => Promise.reject(new Error(walletErrorMessage(e, t))));
      if (address !== ngoAccount) throw new Error(t("ong.registrar.error.conectar", { cuenta: shortAccount(ngoAccount) }));
      let signedXdr: string;
      try {
        signedXdr = await wallet.sign(prep.xdr, prep.networkPassphrase);
      } catch (e) {
        throw new Error(walletErrorMessage(e, t));
      }

      setStep("sending");
      const sentResponse = await fetch("/api/portal/registros/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id: prep.id, signedXdr }),
      });
      const sent = (await sentResponse.json().catch(() => ({}))) as { status: string; txHash: string | null } & ApiError;
      if (!sentResponse.ok && sentResponse.status !== 202) throw new Error(sent.error?.message ?? t("ong.registrar.error.enviar"));

      setStep("confirming");
      let result = sent;
      for (let i = 0; result.status === "enviada" && i < 24; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        // Un error pasajero (red caída, 5xx) no cambia el estado ni borra el hash: se vuelve a consultar.
        const check = await fetch(`/api/portal/registros/${kind}/${prep.id}`).catch(() => null);
        if (check?.ok) result = (await check.json()) as typeof sent;
      }
      if (result.status === "fallida") throw new Error(t("ong.registrar.error.fallida"));
      setDone({ txHash: result.txHash, status: result.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ong.registrar.error.inesperado"));
    } finally {
      setStep("idle");
    }
  }

  const title = kind === "gasto" ? t("ong.portal.registrarGasto") : t("ong.portal.registrarHito");
  const bold = { b: (s: string) => <strong>{s}</strong> };

  return (
    <div className="anim-fondo fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={() => !busy && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-registro"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-5xl anim-ventana overflow-auto rounded-[28px] bg-white p-8 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-registro" className="text-4xl">
              {title}
            </h2>
            <p className="text-secundario">
              {kind === "gasto" ? t("ong.registrar.subtitulo.gasto") : t("ong.registrar.subtitulo.hito")}
            </p>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label={t("ong.registrar.cerrar")}className="mov-hover flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40">
            <IconoMenu abierto className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="flex items-center gap-3 text-2xl font-semibold">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bosque text-white">
                <IconoCheck className="h-6 w-6" />
              </span>
              {done.status === "confirmada"
                ? kind === "gasto"
                  ? t("ong.registrar.listo.gasto", { proveedor: provider?.name ?? t("ong.registrar.listo.proveedor") })
                  : t("ong.registrar.listo.hito")
                : t("ong.registrar.listo.enviado")}
            </p>
            <p className="text-secundario">{t("ong.registrar.listo.nota")}</p>
            <div className="flex flex-wrap gap-3">
              {done.txHash ? (
                <a href={`${explorerBaseUrl.replace(/\/+$/, "")}/tx/${done.txHash}`} target="_blank" rel="noreferrer" className={buttonClass("secundario")}>
                  {t("ong.verEnStellarExpert")}
                </a>
              ) : null}
              <Link
                href={ruta(`/casos/${caseCode}?pestana=${kind === "gasto" ? "transparencia" : "linea"}`)}
                className={buttonClass("secundario")}
              >
                {t("ong.registrar.listo.verEnCaso")}
              </Link>
              <button type="button" onClick={close} className={buttonClass("primario")}>
                {t("ong.registrar.listo.cerrar")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2" noValidate>
            <div className="space-y-4">
              <label className="block">
                <span className="font-semibold">{t("ong.registrar.caso")}</span>
                <select
                  value={caseCode}
                  onChange={(e) => {
                    setCaseCode(e.target.value);
                    const next = cases.find((c) => c.code === e.target.value);
                    setStage(String(next?.stages.find((s) => Number(s.available) > 0)?.position ?? next?.stages[0]?.position ?? 1));
                  }}
                  className={field}
                >
                  {cases.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-semibold">{t("ong.registrar.etapa")}</span>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
                  {selected?.stages.map((s) => (
                    <option key={s.position} value={s.position}>
                      {s.position}. {s.name}
                    </option>
                  ))}
                </select>
                {kind === "gasto" && stageInfo ? (
                  <span className="mt-1 block text-sm text-secundario">
                    {rich("ong.registrar.disponible", bold, { monto: Number(stageInfo.available) })}
                  </span>
                ) : null}
              </label>

              {kind === "gasto" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.monto")}</span>
                      <input name="amount" inputMode="decimal" required className={field} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.categoria")}</span>
                      <select name="category" defaultValue="medicamentos" className={field}>
                        {EXPENSE_CATEGORIES.map((value) => (
                          <option key={value} value={value}>
                            {categoryLabel(t, value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.proveedor")}</span>
                      <select name="providerId" value={providerId} onChange={(e) => setProviderId(e.target.value)} className={field}>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.cuentaProveedor")}</span>
                      <input value={provider ? shortAccount(provider.account) : ""} readOnly className={`${field} bg-gris font-mono`} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.fecha")}</span>
                      <input name="occurredOn" type="date" defaultValue={today} max={today} required className={field} />
                    </label>
                    <label className="block">
                      <span className="font-semibold">{t("ong.registrar.numeroFactura")}</span>
                      <input name="invoiceNumber" required placeholder="FV-0412" className={field} />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="font-semibold">{t("ong.registrar.fecha")}</span>
                    <input name="occurredOn" type="date" defaultValue={today} max={today} required className={field} />
                  </label>
                  <label className="block">
                    <span className="font-semibold">{t("ong.registrar.descripcion")}</span>
                    <textarea name="description" rows={3} required maxLength={280} className={field} />
                  </label>
                </>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-salvia bg-gris p-6 text-center">
                <span className="text-lg font-semibold">
                  {kind === "gasto" ? t("ong.registrar.archivo.factura") : t("ong.registrar.archivo.foto")}
                </span>
                <span className="text-sm text-secundario">{t("ong.registrar.archivo.formatos")}</span>
                <input
                  name={kind === "gasto" ? "invoice" : "photo"}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  required={kind === "gasto"}
                  className="text-sm"
                />
              </label>
              <p className="rounded-2xl bg-crema p-4 text-sm">
                {rich(kind === "gasto" ? "ong.registrar.antes.gasto" : "ong.registrar.antes.hito", bold)}
              </p>
              {kind === "gasto" ? (
                <p className="rounded-2xl bg-salvia p-4 text-sm">{rich("ong.registrar.dobleConfirmacion", bold)}</p>
              ) : null}
            </div>

            {error ? (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-error px-5 py-4 text-error lg:col-span-2">
                <span className="font-medium">{error}</span>
                <button type="submit" className="mov-hover cursor-pointer rounded-xl bg-error px-5 py-2 font-semibold text-white transition-transform duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95">
                  {t("comun.error.reintentar")}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-arena/60 pt-5 lg:col-span-2">
              <p className="max-w-xl text-sm text-secundario">
                {t("ong.registrar.pieNota", { cuenta: shortAccount(ngoAccount) })}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={close} disabled={busy} className={buttonClass("secundario")}>
                  {t("ong.registrar.cancelar")}
                </button>
                <button type="submit" disabled={busy || cases.length === 0} className={buttonClass("primario")}>
                  {busy ? <Spinner className="h-5 w-5" /> : null}
                  {busy
                    ? t(STEP_LABELS[step as Exclude<Step, "idle">])
                    : kind === "gasto"
                      ? t("ong.registrar.firmar.gasto")
                      : t("ong.registrar.firmar.hito")}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
