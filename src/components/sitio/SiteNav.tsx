"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { WalletChip } from "@/components/billetera/WalletChip";
import { IconoMenu } from "@/components/iconos";
import { logout } from "@/app/ingresar/actions";
import { buttonClass, Spinner } from "@/components/ui";
import { useT } from "@/i18n/cliente";
import { quitarIdioma } from "@/i18n/config";
import { Logo } from "./Logo";
import { SECCIONES } from "./secciones";
import { SelectorIdioma } from "./SelectorIdioma";

type Account = { label: string; href: string; profileHref: string | null } | null;

/** `decodeURIComponent` lanza con un % suelto (un enlace a /#100%): en ese caso se usa el texto tal cual. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Sección visible en la página principal: la que cruza una franja delgada a media pantalla. Usa un
 * IntersectionObserver, así se actualiza también cuando la página termina de acomodarse (fotos, fuentes) y no solo
 * al hacer scroll. Arriba del todo es «Inicio».
 */
function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string>("inicio");
  useEffect(() => {
    if (!enabled) return;
    let io: IntersectionObserver | null = null;
    let timer = 0;
    let tries = 0;
    const visible = new Set<string>();
    const start = () => {
      const els = SECCIONES.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
      // La página puede llegar después de la pantalla de carga: espera a que estén todas las secciones.
      if (els.length < SECCIONES.length && ++tries < 50) {
        timer = window.setTimeout(start, 100);
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          }
          const current = SECCIONES.find((s) => visible.has(s.id));
          if (current) setActive(current.id);
        },
        { rootMargin: "-40% 0px -55% 0px" },
      );
      els.forEach((el) => io!.observe(el));
    };
    start();
    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [enabled]);
  return enabled ? active : null;
}

/** Enlace de texto del menú: sin subrayado fijo; la línea se dibuja al pasar el mouse. */
const textLink =
  "group/enlace relative inline-flex items-center rounded-md py-2 font-semibold whitespace-nowrap text-texto transition-colors duration-200 hover:text-bosque";
const textLinkLine =
  "absolute inset-x-0 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-bosque transition-transform duration-300 ease-(--ease-out-expo) group-hover/enlace:scale-x-100";

/**
 * Menú superior, igual en todas las páginas públicas. En escritorio son tres columnas: la marca (con la marca de la
 * demo), las secciones en una sola barra con una placa que se desliza hasta la sección visible, y la cuenta.
 * En el celular, la marca y un botón que despliega todo. El selector de idioma va junto a la cuenta.
 */
export function SiteNav({ account }: { account: Account }) {
  const { t, ruta } = useT();
  // Sin el prefijo de idioma: «/en/casos/POW_001» se compara como «/casos/POW_001».
  const pathname = quitarIdioma(usePathname());
  const onHome = pathname === "/";
  const active = useActiveSection(onHome);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // Al llegar desde otra página con /#seccion, la página principal entra después de la pantalla de carga y el
  // navegador ya no encuentra el ancla: se espera a que la sección exista y se baja hasta ella.
  useEffect(() => {
    if (pathname !== "/" || !window.location.hash) return;
    const id = safeDecode(window.location.hash.slice(1));
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (!el && ++tries < 40) return;
      window.clearInterval(timer);
      el?.scrollIntoView();
    }, 75);
    return () => window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentId = onHome ? active : pathname.startsWith("/casos") ? "casos" : null;

  // Placa que se desliza bajo la sección activa.
  const barRef = useRef<HTMLUListElement>(null);
  const [plate, setPlate] = useState<{ left: number; width: number } | null>(null);
  const measure = useCallback(() => {
    const bar = barRef.current;
    const link = currentId ? bar?.querySelector<HTMLElement>(`[data-seccion="${currentId}"]`) : null;
    setPlate(link ? { left: link.offsetLeft, width: link.offsetWidth } : null);
  }, [currentId]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const salir = async () => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setOpen(false);
      router.push(ruta("/"));
      router.refresh();
      setLeaving(false);
    }
  };
  const salirBoton = account ? (
    <button type="button" onClick={salir} disabled={leaving} className={`${textLink} cursor-pointer disabled:opacity-60`}>
      {leaving ? <Spinner className="mr-1.5 h-4 w-4" /> : null}
      {t("comun.nav.cerrarSesion")}
      <span aria-hidden className={textLinkLine} />
    </button>
  ) : null;

  const account_ = account ? (
    <Link href={account.href} className={buttonClass("primario", "shrink-0 py-2.5 whitespace-nowrap")}>
      <span aria-hidden className="h-2 w-2 shrink-0 animate-brillo rounded-full bg-salvia" />
      {account.label}
    </Link>
  ) : (
    <Link href={ruta("/ingresar")} className={buttonClass("primario", "shrink-0 py-2.5 whitespace-nowrap")}>
      {t("comun.nav.crearCuenta")}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-crema transition-[border-color] duration-300 ${scrolled ? "border-arena" : "border-transparent"}`}
    >
      <nav
        aria-label={t("comun.nav.aria")}
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-8 lg:grid lg:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]"
      >
        <Logo testnet />

        <ul ref={barRef} className="relative hidden items-center gap-1 rounded-2xl bg-white/80 p-1.5 ring-1 ring-arena lg:flex">
          <li aria-hidden className="contents">
            <span
              className={`absolute top-1.5 bottom-1.5 rounded-xl bg-bosque transition-[left,width,opacity] duration-500 ease-(--ease-spring) ${plate ? "opacity-100" : "opacity-0"}`}
              style={{ left: plate?.left ?? 0, width: plate?.width ?? 0 }}
            />
          </li>
          {SECCIONES.map(({ id, clave }) => {
            const on = currentId === id;
            return (
              <li key={id}>
                <Link
                  href={ruta(`/#${id}`)}
                  data-seccion={id}
                  aria-current={on ? "location" : undefined}
                  className={`relative block rounded-xl px-3.5 py-2 font-semibold whitespace-nowrap transition-colors duration-300 xl:px-5 ${on ? "text-white" : "text-texto hover:bg-crema hover:text-bosque"}`}
                >
                  {t(clave)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden shrink-0 items-center justify-end gap-3 lg:flex xl:gap-5">
          {/* Entre 1024 y 1279 px no caben las tres placas: el idioma va en un botón que despliega los tres. */}
          <span className="contents xl:hidden">
            <SelectorIdioma variante="menu" />
          </span>
          <span className="hidden xl:contents">
            <SelectorIdioma />
          </span>
          {/* En pantallas de portátil la billetera va en el menú del perfil; se muestra aquí desde 1280 px. */}
          <span className="hidden xl:contents">
            <WalletChip profileHref={account?.profileHref ?? null} />
          </span>
          <Link href={ruta("/ong/registro")} className={`${textLink} max-xl:hidden`}>
            {t("comun.nav.soyOng")}
            <span aria-hidden className={textLinkLine} />
          </Link>
          {account ? null : (
            <>
              <span aria-hidden className="hidden h-5 w-px bg-arena xl:block" />
              <Link href={ruta("/ingresar?modo=ingresar")} className={textLink}>
                {t("comun.nav.ingresar")}
                <span aria-hidden className={textLinkLine} />
              </Link>
            </>
          )}
          {account_}
          {salirBoton}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-movil"
          className="mov-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-bosque text-bosque transition-transform duration-200 ease-(--ease-spring) active:scale-95 lg:hidden"
        >
          <IconoMenu abierto={open} />
          <span className="sr-only">{open ? t("comun.nav.cerrarMenu") : t("comun.nav.abrirMenu")}</span>
        </button>
      </nav>

      {open ? (
        <div id="menu-movil" className="anim-ventana border-y border-arena bg-crema px-4 pt-2 pb-6 lg:hidden">
          <ul className="divide-y divide-arena/70">
            {SECCIONES.map(({ id, clave }) => {
              const on = currentId === id;
              return (
                <li key={id}>
                  <Link
                    href={ruta(`/#${id}`)}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "location" : undefined}
                    className={`flex items-center justify-between py-3.5 text-lg font-semibold transition-colors ${on ? "text-bosque" : "text-texto hover:text-bosque"}`}
                  >
                    {t(clave)}
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full border-2 border-bosque ${on ? "bg-bosque" : "bg-transparent"}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t-2 border-texto/80 pt-4">
            <SelectorIdioma />
            <WalletChip profileHref={account?.profileHref ?? null} />
            <Link href={ruta("/ong/registro")} className={textLink}>
              {t("comun.nav.soyOng")}
              <span aria-hidden className={textLinkLine} />
            </Link>
            {account ? null : (
              <Link href={ruta("/ingresar?modo=ingresar")} className={textLink}>
                {t("comun.nav.ingresar")}
                <span aria-hidden className={textLinkLine} />
              </Link>
            )}
            {salirBoton}
            <span className="ml-auto">{account_}</span>
          </div>
        </div>
      ) : null}
    </header>
  );
}
