"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/components/billetera/WalletProvider";
import { buttonClass, Spinner } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { unlinkWallet } from "./actions";

/** Desconecta la billetera de este navegador y la desvincula del perfil. Va sobre la cabecera oscura. */
export function DisconnectButton() {
  const { t } = useT();
  const router = useRouter();
  const { disconnect } = useWallet();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await Promise.all([unlinkWallet(), disconnect()]);
        } catch (error) {
          // El botón vuelve a quedar disponible; al refrescar, la página muestra si la billetera sigue ligada.
          console.error(error);
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
      className={buttonClass("contorno", "disabled:border-white/30 disabled:bg-transparent disabled:text-white/60")}
    >
      {busy ? <Spinner /> : null}
      {t("cuenta.miPerfil.desconectar")}
    </button>
  );
}
