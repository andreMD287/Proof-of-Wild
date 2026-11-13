"use client";

import { useEffectEvent, useLayoutEffect, useRef, type ReactNode } from "react";

/** El clic cayó fuera del recuadro de la ventana, es decir, en el fondo oscurecido (no en su barra de desplazamiento). */
function isOutside(dialog: HTMLDialogElement, event: MouseEvent): boolean {
  const r = dialog.getBoundingClientRect();
  return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
}

/**
 * Ventana modal sobre la página (apadrinar, inscribirse, registrar un gasto o un hito). Es un `<dialog>` abierto con
 * `showModal()`, así que el navegador atrapa el foco dentro, deja inerte el resto de la página para el teclado y los
 * lectores de pantalla, y cierra con Escape. El clic en el fondo es un atajo de mouse; con teclado se cierra con
 * Escape o con el botón de cerrar de cada ventana.
 *
 * Quien la usa decide qué es cerrar (normalmente, volver a la ruta sin la ventana): la ventana no se cierra sola,
 * se desmonta. Con `canClose` en falso (una transacción en curso) ni Escape ni el fondo la cierran.
 */
export function Ventana({
  onClose,
  canClose = true,
  labelledBy,
  className = "",
  children,
}: {
  onClose: () => void;
  canClose?: boolean;
  /** `id` del título de la ventana. */
  labelledBy: string;
  /** Clases del contenido (rejilla, relleno). El ancho y el alto máximos los pone la ventana. */
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const requestClose = useEffectEvent(() => {
    if (canClose) onClose();
  });

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let leaving = false;
    // Escape: la página decide si cierra; el diálogo no se cierra por su cuenta.
    const onCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    // Chrome cierra el diálogo sin pasar por «cancel» si se insiste con Escape: mientras siga montado, se reabre.
    const onDialogClose = () => {
      if (!leaving && !dialog.open) dialog.showModal();
    };
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog && isOutside(dialog, event)) requestClose();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onDialogClose);
    dialog.addEventListener("click", onClick);
    if (!dialog.open) dialog.showModal();
    return () => {
      leaving = true;
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onDialogClose);
      dialog.removeEventListener("click", onClick);
      dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className="ventana anim-ventana m-auto max-h-[94vh] w-[calc(100%-2rem)] max-w-5xl overflow-auto rounded-[28px] bg-white text-texto shadow-2xl outline-none"
    >
      <div className={className}>{children}</div>
    </dialog>
  );
}
