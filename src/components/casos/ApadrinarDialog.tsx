"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useWallet, walletErrorMessage } from "@/components/billetera/WalletProvider";
import { IconoCheck, IconoEscudo, IconoMenu } from "@/components/iconos";
import { buttonClass, Spinner } from "@/components/ui";
import { Ventana } from "@/components/ventana";
import { useT } from "@/i18n/cliente";
import { traducirError } from "@/i18n/errores";
import type { Clave } from "@/i18n/traductor";
import { fromStroops, toStroops } from "@/lib/amount";
import { shortAccount } from "@/lib/stellar-account";
import { allocateContribution, type StageAllocation } from "@/modules/cases";
import { requiredLevel, UNVERIFIED_LIMIT } from "@/modules/identity";

export interface ApadrinarCase {
  code: string;
  name: string;
  ngoName: string;
  photoUrl: string | null;
  remaining: string;
  stages: Array<{ position: number; name: string; cost: string; covered: string }>;
}

type Step = "idle" | "preparing" | "signing" | "sending" | "confirming";
const STEP_LABELS = {
  preparing: "casos.apadrinar.paso.preparando",
  signing: "casos.apadrinar.paso.firmando",
  sending: "casos.apadrinar.paso.enviando",
  confirming: "casos.apadrinar.paso.confirmando",
} as const satisfies Record<Exclude<Step, "idle">, Clave>;

interface Receipt {
  txHash: string;
  amount: string;
  allocation: StageAllocation[];
  at: Date;
}

const SUGGESTED = ["10", "25", "50"];
const AMOUNT = /^\d+([.,]\d{1,7})?$/;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // Si el cuerpo no es JSON (la página HTML de un 502/504), queda vacío y quien llama usa su mensaje propio.
  return { ok: response.ok, status: response.status, data: (await response.json().catch(() => ({}))) as T };
}

type ApiError = { error?: { message: string } };

/**
 * Ventana A: apadrinar (tu aporte) y comprobante, sobre el detalle del caso. Las rutas que recibe (`closeHref`,
 * `profileHref`, `returnHref`) van sin prefijo de idioma; aquí se localizan al navegar.
 */
export function ApadrinarDialog({
  item,
  explorerBaseUrl,
  closeHref,
  profileHref,
  welcome,
  identityVerified = false,
  returnHref,
  initialAmount,
}: {
  item: ApadrinarCase;
  explorerBaseUrl: string;
  closeHref: string;
  profileHref: string | null;
  /** Recién creó su cuenta o ingresó para apadrinar: se le da la bienvenida con su nombre. */
  welcome?: string | null;
  /** Identidad verificada (nivel 2): sin límite de monto (ADR-21). */
  identityVerified?: boolean;
  /** Esta ventana: a donde vuelve la persona después de verificarse, con el monto que había elegido. */
  returnHref?: string;
  /** Monto elegido antes de ir a verificarse. */
  initialAmount?: string;
}) {
  const { t, rich, ruta, locale, formatAmount } = useT();
  const router = useRouter();
  const wallet = useWallet();
  const [amount, setAmount] = useState(initialAmount ?? SUGGESTED.find((s) => Number(s) <= Number(item.remaining)) ?? "");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    router.push(ruta(closeHref), { scroll: false });
    router.refresh();
  };


  const preview = useMemo(() => {
    if (!AMOUNT.test(amount)) return { allocation: null, message: null };
    try {
      return { allocation: allocateContribution(item.stages, amount.replace(",", ".")), message: null };
    } catch (e) {
      // Los mensajes del dominio vienen en español: se traducen al idioma de la página.
      return { allocation: null, message: e instanceof Error ? traducirError(e.message, t) : null };
    }
  }, [amount, item.stages, t]);

  const needsVerification = !identityVerified && !!preview.allocation && requiredLevel(amount) === 2;
  // `volver` se guarda sin prefijo de idioma; el enlace a la verificación sí va en el idioma de la página.
  const verifyHref = ruta(
    returnHref ? `/cuenta/verificar?volver=${encodeURIComponent(`${returnHref}&monto=${amount}`)}` : "/cuenta/verificar",
  );

  const stageName = (position: number) =>
    item.stages.find((s) => s.position === position)?.name ?? t("casos.etapaN", { n: position });
  const busy = step !== "idle";

  async function confirm() {
    setError(null);
    if (!preview.allocation) return setError(preview.message ?? t("casos.apadrinar.error.montoCero"));
    try {
      const donor = wallet.address ?? (await wallet.connect());
      setStep("preparing");
      const prepared = await postJson<{ xdr: string; networkPassphrase: string; allocation: StageAllocation[] } & ApiError>(
        "/api/aportes/preparar",
        { caseCode: item.code, donorAccount: donor, amount },
      );
      if (!prepared.ok) throw new Error(prepared.data.error?.message ?? t("casos.apadrinar.error.preparar"));

      setStep("signing");
      let signedXdr: string;
      try {
        signedXdr = await wallet.sign(prepared.data.xdr, prepared.data.networkPassphrase);
      } catch (e) {
        throw new Error(walletErrorMessage(e, t));
      }

      setStep("sending");
      const sent = await postJson<{ txHash: string; status: string; message?: string } & ApiError>("/api/aportes/enviar", {
        signedXdr,
      });
      if (!sent.ok && sent.status !== 202) throw new Error(sent.data.error?.message ?? t("casos.apadrinar.error.enviar"));

      let status = sent.data.status;
      setStep("confirming");
      for (let i = 0; status === "enviada" && i < 24; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        // Un error pasajero (red caída, 5xx) no cambia el estado: se vuelve a consultar.
        const response = await fetch(`/api/aportes/${sent.data.txHash}`).catch(() => null);
        if (!response?.ok) continue;
        const check = (await response.json()) as { status: string; message?: string };
        status = check.status;
        if (status === "fallida") throw new Error(check.message ?? t("casos.apadrinar.error.rechazado"));
      }
      if (status === "fallida") throw new Error(sent.data.message ?? t("casos.apadrinar.error.rechazado"));
      if (status !== "confirmada") {
        throw new Error(t("casos.apadrinar.error.pendiente"));
      }
      setReceipt({ txHash: sent.data.txHash, amount, allocation: prepared.data.allocation, at: new Date() });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("casos.apadrinar.error.inesperado"));
    } finally {
      setStep("idle");
    }
  }

  async function share() {
    const url = `${window.location.origin}${ruta(`/comprobante/${receipt?.txHash}`)}`;
    const text = t("casos.apadrinar.compartirTexto", { nombre: item.name, codigo: item.code });
    if (navigator.share) {
      await navigator.share({ title: "Proof of Wild", text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
    }
  }

  const remainingAfter = receipt
    ? fromStroops(toStroops(item.remaining) - toStroops(receipt.amount.replace(",", ".")))
    : item.remaining;
  const allocation = receipt?.allocation ?? preview.allocation;

  return (
    <Ventana onClose={close} canClose={!busy} labelledBy="titulo-apadrinar" className="grid md:grid-cols-[1fr_1.4fr]">
      <aside className="space-y-4 bg-crema p-7">
        <div className="relative aspect-[4/2.2] overflow-hidden rounded-2xl bg-white">
          {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} fill sizes="400px" className="object-cover" /> : null}
        </div>
        <div>
          <p className="font-serif text-3xl">{item.name}</p>
          <p className="text-secundario">
            {item.code} · {item.ngoName}
          </p>
        </div>
        <p className="flex justify-between border-t border-arena pt-3">
          <span>{receipt ? t("casos.apadrinar.faltaAhora") : t("casos.apadrinar.falta")}</span>
          <strong>{formatAmount(remainingAfter)}</strong>
        </p>
        <div className="rounded-2xl bg-salvia p-5">
          <p className="font-semibold">
            {receipt ? t("casos.apadrinar.repartoHecho") : t("casos.apadrinar.repartoPrevio")}
          </p>
          {allocation ? (
            <ul className="mt-2 space-y-1.5">
              {allocation.map((a) => (
                <li key={a.position} className="flex justify-between gap-3">
                  <span>
                    {a.position}. {stageName(a.position)}
                  </span>
                  <strong className="whitespace-nowrap">{formatAmount(a.amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm">{preview.message ?? t("casos.apadrinar.eligeMonto")}</p>
          )}
          <p className="mt-3 text-sm">{t("casos.apadrinar.orden")}</p>
        </div>
      </aside>

      <section className="space-y-5 p-8">
        <div className="flex items-center justify-between gap-4">
          <ol className="flex items-center gap-3 text-sm font-semibold">
            <li className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${receipt ? "bg-crema" : "bg-bosque text-white"}`}>1</span>
              {t("casos.tuAporte")}
            </li>
            <li aria-hidden className="h-px w-10 bg-arena" />
            <li className="flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${receipt ? "bg-bosque text-white" : "bg-crema"}`}>2</span>
              {t("casos.apadrinar.pasoComprobante")}
            </li>
          </ol>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label={t("casos.cerrar")}
            className="mov-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-arena text-texto transition-[transform,border-color,color] duration-200 ease-(--ease-spring) hover:rotate-90 hover:border-bosque hover:text-bosque disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconoMenu abierto className="h-5 w-5" />
          </button>
        </div>

        {receipt ? (
          <div className="space-y-5">
            <h2 id="titulo-apadrinar" className="flex items-center gap-4 text-4xl">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
                <IconoCheck className="h-7 w-7" />
              </span>
              {t("casos.apadrinar.gracias")}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 rounded-2xl bg-gris p-5">
              <dt className="text-secundario">{t("casos.col.monto")}</dt>
              <dd className="font-semibold">{formatAmount(receipt.amount.replace(",", "."))}</dd>
              <dt className="text-secundario">{t("casos.col.caso")}</dt>
              <dd>
                {item.name} · {item.code}
              </dd>
              <dt className="text-secundario">{t("casos.col.fecha")}</dt>
              <dd>
                {receipt.at.toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </dd>
              <dt className="text-secundario">{t("casos.col.transaccion")}</dt>
              <dd className="flex flex-wrap gap-3">
                <span className="font-mono">
                  {receipt.txHash.slice(0, 4)}…{receipt.txHash.slice(-4)}
                </span>
                <a
                  href={`${explorerBaseUrl.replace(/\/+$/, "")}/tx/${receipt.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-bosque underline"
                >
                  {t("casos.verEnStellarExpert")}
                </a>
              </dd>
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={close} className={buttonClass("primario")}>
                {t("casos.verEnQueSeUsa")}
              </button>
              <Link href={ruta(profileHref ?? `/huella/${wallet.address ?? ""}`)} className={buttonClass("secundario")}>
                {t("casos.apadrinar.irPerfil")}
              </Link>
              <button type="button" onClick={share} className="font-semibold text-bosque underline">
                {copied ? t("casos.apadrinar.enlaceCopiado") : t("casos.apadrinar.compartir")}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                router.refresh();
              }}
              className="text-sm font-medium text-bosque underline"
            >
              {t("casos.apadrinar.otroAporte")}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {welcome != null ? (
              <p className="anim-ventana flex items-center gap-3 rounded-[18px] bg-salvia px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bosque text-white">
                  <IconoCheck className="h-4 w-4" />
                </span>
                <span>
                  {welcome
                    ? rich("casos.apadrinar.bienvenidaNombre", { b: (s) => <strong>{s}</strong> }, { nombre: welcome })
                    : rich("casos.apadrinar.bienvenida", { b: (s) => <strong>{s}</strong> })}
                </span>
              </p>
            ) : null}
            <div className="space-y-2">
              <h2 id="titulo-apadrinar" className="text-4xl">
                {t("casos.apadrinar.titulo")}
              </h2>
              {identityVerified ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-bosque">
                  <IconoEscudo className="h-4 w-4" /> {t("casos.apadrinar.identidadVerificada")}
                </p>
              ) : null}
            </div>
            <fieldset>
              <legend className="mb-2 font-semibold">{t("casos.apadrinar.leyendaMonto")}</legend>
              <div className="grid grid-cols-3 gap-3">
                {SUGGESTED.map((s) => {
                  const fits = Number(s) <= Number(item.remaining);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!fits || busy}
                      aria-pressed={amount === s}
                      onClick={() => setAmount(s)}
                      className={`mov-hover cifras cursor-pointer rounded-xl border-2 py-3 text-lg font-semibold transition-[transform,background-color,border-color,color] duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${amount === s ? "border-bosque bg-bosque text-white" : "border-arena hover:border-bosque hover:text-bosque"}`}
                    >
                      {s} USDC
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex items-center gap-3">
                <span className="shrink-0">{t("casos.apadrinar.otroValor")}</span>
                <input
                  inputMode="decimal"
                  value={SUGGESTED.includes(amount) ? "" : amount}
                  onChange={(e) => setAmount(e.target.value.trim())}
                  disabled={busy}
                  placeholder={t("casos.apadrinar.placeholderMonto")}
                  className="w-full rounded-xl border border-arena px-4 py-3 outline-none focus:border-bosque"
                />
              </label>
              <p className="mt-2 text-sm text-secundario">{t("casos.apadrinar.aporteUnico")}</p>
            </fieldset>

            {needsVerification ? (
              <div className="anim-ventana flex flex-wrap items-center gap-4 rounded-[18px] bg-crema p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-profundo text-crema">
                  <IconoEscudo className="h-5 w-5" />
                </span>
                <p className="min-w-0 flex-1">
                  <strong className="block">{t("casos.apadrinar.limiteTitulo", { limite: UNVERIFIED_LIMIT })}</strong>
                  <span className="text-sm text-secundario">{t("casos.apadrinar.limiteTexto")}</span>
                </p>
                <Link href={verifyHref} className={buttonClass("primario", "py-2.5")}>
                  {t("casos.apadrinar.verificar")}
                </Link>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gris px-5 py-4">
              {wallet.address ? (
                <>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-bosque" />
                    {rich(
                      "casos.apadrinar.billeteraConectada",
                      { b: (s) => <strong className="font-mono">{s}</strong> },
                      { cuenta: shortAccount(wallet.address) },
                    )}
                  </span>
                  <button type="button" disabled={busy} onClick={() => wallet.connect().catch(() => {})} className="font-medium text-bosque underline">
                    {t("casos.apadrinar.cambiar")}
                  </button>
                </>
              ) : (
                <>
                  <span>{t("casos.apadrinar.conectaTexto")}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => wallet.connect().catch((e) => setError(walletErrorMessage(e, t)))}
                    className={buttonClass("secundario", "py-2")}
                  >
                    {t("casos.apadrinar.conectar")}
                  </button>
                </>
              )}
            </div>

            {error ? (
              <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-error px-5 py-4 text-error">
                <span className="font-medium">{error}</span>
                <button type="button" onClick={confirm} className="mov-hover cursor-pointer rounded-xl bg-error px-5 py-2 font-semibold text-white transition-transform duration-200 ease-(--ease-spring) hover:-translate-y-0.5 active:scale-95">
                  {t("comun.error.reintentar")}
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={confirm}
              disabled={busy || !preview.allocation || needsVerification}
              className={buttonClass("primario", "w-full py-4 text-lg")}
            >
              {busy ? <Spinner className="h-5 w-5" /> : null}
              {busy
                ? t(STEP_LABELS[step as Exclude<Step, "idle">])
                : t("casos.apadrinar.confirmar", {
                    monto: preview.allocation ? formatAmount(amount.replace(",", ".")) : "…",
                  })}
            </button>
            <p className="text-center text-sm text-secundario">{t("casos.apadrinar.pie")}</p>
          </div>
        )}
      </section>
    </Ventana>
  );
}
