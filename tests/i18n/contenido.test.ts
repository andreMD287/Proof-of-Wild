import { describe, expect, it } from "vitest";
import { traducir, type TextosCaso, type TextosVoluntariado, type Traducciones } from "@/i18n/contenido";

const caso = { commonName: "Guacamaya roja", shortStory: "Llegó al centro con un ala rota.", story: "La decomisaron…" };
const traducciones: Traducciones<TextosCaso> = {
  en: { commonName: "Scarlet macaw", shortStory: "It arrived with a broken wing." },
  pt: { commonName: "Arara-vermelha" },
};

describe("contenido de las ONG en otros idiomas", () => {
  it("usa la traducción de cada campo que la tiene y deja el original en los demás", () => {
    expect(traducir(caso, traducciones, "en")).toEqual({
      commonName: "Scarlet macaw",
      shortStory: "It arrived with a broken wing.",
      story: "La decomisaron…",
    });
    expect(traducir(caso, traducciones, "pt")).toEqual({ ...caso, commonName: "Arara-vermelha" });
  });

  it("sin traducciones, o en el idioma original, devuelve el texto tal como lo escribió la ONG", () => {
    expect(traducir(caso, traducciones, "es")).toEqual(caso);
    expect(traducir(caso, {}, "en")).toEqual(caso);
    expect(traducir(caso, null, "en")).toEqual(caso);
    expect(traducir(caso, undefined, "pt")).toEqual(caso);
  });

  it("solo devuelve los campos que se le piden: lo demás de la traducción no se cuela", () => {
    expect(traducir({ commonName: caso.commonName }, traducciones, "en")).toEqual({ commonName: "Scarlet macaw" });
  });

  it("traduce listas, como las tareas y los requisitos de un voluntariado", () => {
    const voluntariado = { title: "Mantenimiento de aviarios", tasks: ["Limpiar comederos"], requirements: ["Gorra"] };
    const t: Traducciones<TextosVoluntariado> = { en: { title: "Aviary upkeep", tasks: ["Clean feeders"] } };
    expect(traducir(voluntariado, t, "en")).toEqual({ ...voluntariado, title: "Aviary upkeep", tasks: ["Clean feeders"] });
  });

  it("ignora traducciones vacías o con la forma equivocada, porque vienen de la base", () => {
    const rotas = {
      en: { commonName: "  ", shortStory: ["no es un texto"], story: 42 },
      pt: "no es un objeto",
    } as unknown as Traducciones<TextosCaso>;
    expect(traducir(caso, rotas, "en")).toEqual(caso);
    expect(traducir(caso, rotas, "pt")).toEqual(caso);
    const listas = { en: { tasks: [], requirements: "Gorra" } } as unknown as Traducciones<TextosVoluntariado>;
    expect(traducir({ tasks: ["a"], requirements: ["b"] }, listas, "en")).toEqual({ tasks: ["a"], requirements: ["b"] });
  });

  it("un campo sin texto original (una etapa sin «qué cubre») puede mostrar su traducción", () => {
    expect(traducir({ covers: null as string | null }, { en: { covers: "Bandages" } }, "en")).toEqual({ covers: "Bandages" });
    expect(traducir({ covers: null as string | null }, {}, "en")).toEqual({ covers: null });
  });
});
