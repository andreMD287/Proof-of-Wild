import type { Idioma } from "./config";

/**
 * Traducciones de lo que escribe cada ONG (historias, etapas, hitos, voluntariados). Se guardan junto a la fila, en
 * la columna `translations` (jsonb), con la forma `{ en: { story: "…" }, pt: { story: "…" } }`: el texto de las
 * columnas normales es el original y cada idioma trae solo los campos que alguien tradujo.
 * No depende de React ni de Next: lo usan los módulos de dominio, los repositorios y las semillas.
 */
export type Traducciones<T extends object> = Partial<Record<Idioma, Partial<T>>>;

/** Textos traducibles de cada tabla. Los nombres son los de las propiedades del esquema. */
export interface TextosCaso {
  commonName: string;
  shortStory: string;
  story: string;
}
export interface TextosEtapa {
  name: string;
  shortName: string;
  covers: string;
}
export interface TextosOng {
  description: string;
}
export interface TextosHito {
  description: string;
}
export interface TextosGasto {
  concept: string;
}
export interface TextosVoluntariado {
  title: string;
  schedule: string;
  tasks: string[];
  requirements: string[];
}

/** Cualquier valor de la columna: lo que venga de la base se revisa antes de mostrarlo. */
type TraduccionesDe<T extends object> = Partial<Record<Idioma, { [K in keyof T]?: unknown }>> | null | undefined;

/**
 * Los textos de `original` en el idioma pedido: cada campo con traducción usa la traducción y los demás quedan como
 * los escribió la ONG. Una traducción vacía o de otro tipo (un texto donde va una lista) se ignora.
 *
 *   traducir({ story: fila.story }, fila.translations, "en")  →  { story: "<la historia en inglés o la original>" }
 */
export function traducir<T extends object>(original: T, traducciones: TraduccionesDe<T>, idioma: Idioma): T {
  const propias = traducciones?.[idioma];
  if (!propias || typeof propias !== "object") return original;
  const resultado = { ...original };
  for (const campo of Object.keys(original) as Array<keyof T>) {
    const valor = (propias as Record<keyof T, unknown>)[campo];
    if (Array.isArray(original[campo]) ? esListaDeTextos(valor) : esTexto(valor)) {
      resultado[campo] = valor as T[keyof T];
    }
  }
  return resultado;
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function esListaDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.length > 0 && valor.every(esTexto);
}
