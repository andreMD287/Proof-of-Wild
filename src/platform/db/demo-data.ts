/**
 * Datos de la demo del 13 de noviembre, tal como vienen en «Proof of Wild — Datos de prueba».
 * Es la única fuente: la usan las semillas de la base de datos y el script que prepara la red.
 * Todo es ficticio. Las cuentas de Stellar se nombran con una clave corta (ONG_ALAS, PROV_ARRAYAN, DON_ANA…)
 * y las genera el script de preparación.
 *
 * Lo que el documento no trae y aquí se completa (se puede reemplazar sin tocar el código):
 * - Las fechas de gastos e hitos de los casos cerrados y los textos de esos hitos.
 * - El nombre corto de cada etapa para el chip y la categoría de los gastos de los casos cerrados.
 * - Las traducciones al inglés y al portugués de Brasil de lo que escriben las ONG (`translations`, ADR-23). El
 *   español es el original: va en las columnas de siempre.
 */

import type {
  TextosCaso,
  TextosEtapa,
  TextosGasto,
  TextosHito,
  TextosOng,
  TextosVoluntariado,
  Traducciones,
} from "@/i18n/contenido";

export type AccountKey = string;

/** Un texto corto en inglés y en portugués de Brasil (el español es el original). */
type EnPt = { en: string; pt: string };

export interface DemoNgo {
  key: AccountKey;
  slug: string;
  loginEmail: string;
  name: string;
  nit: string;
  kind: "centro_atencion" | "fundacion" | "ong";
  kindDetail: string;
  city: string;
  foundedYear: number;
  description: string;
  translations: Traducciones<TextosOng>;
  environmentalPermit: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  offersVolunteering: boolean;
  photoPath: string;
}

export interface DemoProvider {
  key: AccountKey;
  name: string;
  sells: string;
  city: string;
  ngos: AccountKey[];
}

export type ExpenseCategory =
  | "alimentacion"
  | "atencion_veterinaria"
  | "medicamentos"
  | "rehabilitacion"
  | "traslado_liberacion";

export interface DemoExpense {
  provider: AccountKey;
  amount: string;
  category: ExpenseCategory;
  invoiceNumber: string;
  concept?: string;
  /** Traducciones del concepto; un gasto sin concepto muestra el nombre de la etapa (ya traducido). */
  translations?: Traducciones<TextosGasto>;
  validationLevel: "presentado" | "revisado";
  /** Fecha de la factura. Nula = la fecha en que corre el script. */
  occurredOn: string | null;
}

export interface DemoMilestone {
  description: string;
  translations: Traducciones<TextosHito>;
  validationLevel: "presentado" | "revisado";
  occurredOn: string | null;
  photoPath: string | null;
}

export interface DemoStage {
  name: string;
  shortName: string;
  covers: string;
  translations: Traducciones<TextosEtapa>;
  cost: string;
  status: "pendiente" | "en_curso" | "completada";
  /** Foto que muestra el avance del animal en esta etapa (se ve cuando la etapa ya empezó). */
  photoPath?: string;
  expense?: DemoExpense;
  milestone?: DemoMilestone;
}

export interface DemoCase {
  code: string;
  ngo: AccountKey;
  commonName: string;
  scientificName: string;
  group: "ave" | "mamifero" | "reptil";
  shortStory: string;
  story: string;
  translations: Traducciones<TextosCaso>;
  photoPath: string;
  intakeDate: string;
  outcome: null | { kind: "liberado" | "en_reserva"; label: string; date: string };
  stages: DemoStage[];
}

export interface DemoContribution {
  caseCode: string;
  donor: AccountKey;
  amount: string;
  /** Reparto esperado según el documento, para comprobar que el contrato (y la página) lo calculan igual. */
  expected: Array<[stage: number, amount: string]>;
}

export interface DemoVolunteering {
  ngo: AccountKey;
  title: string;
  date: string;
  schedule: string;
  city: string;
  tasks: string[];
  requirements: string[];
  translations: Traducciones<TextosVoluntariado>;
  capacity: number;
  preOccupied: number;
  photoPath: string;
}

export const DEMO_ADMIN_EMAIL = "admin@proofofwild.example";

export const DEMO_NGOS: DemoNgo[] = [
  {
    key: "ONG_ALAS",
    slug: "refugio-alas-libres",
    loginEmail: "contacto@alaslibres.example",
    name: "Refugio Alas Libres",
    nit: "900.000.101-1",
    kind: "fundacion",
    kindDetail: "centro de rehabilitación de aves",
    city: "Villavicencio, Meta",
    foundedYear: 2017,
    description: "Rehabilitamos aves rescatadas del tráfico ilegal en los Llanos hasta que pueden volver a volar.",
    translations: {
      en: { description: "We rehabilitate birds rescued from illegal wildlife trafficking in the Llanos until they can fly again." },
      pt: { description: "Reabilitamos aves resgatadas do tráfico ilegal nos Llanos até que possam voltar a voar." },
    },
    environmentalPermit: "Permiso PA-0101 (ficticio)",
    contactName: "Laura Méndez, directora",
    contactEmail: "contacto@alaslibres.example",
    contactPhone: "+57 300 000 0101",
    offersVolunteering: true,
    photoPath: "/fotos/ong/refugio-alas-libres.webp",
  },
  {
    key: "ONG_BOSQUE",
    slug: "fundacion-bosque-vivo",
    loginEmail: "hola@bosquevivo.example",
    name: "Fundación Bosque Vivo",
    nit: "900.000.202-2",
    kind: "fundacion",
    kindDetail: "hogar de paso de fauna silvestre",
    city: "Fusagasugá, Cundinamarca",
    foundedYear: 2014,
    description:
      "Recibimos mamíferos y reptiles rescatados en Cundinamarca y los acompañamos hasta su liberación.",
    translations: {
      en: { description: "We take in mammals and reptiles rescued in Cundinamarca and care for them until they are released." },
      pt: { description: "Recebemos mamíferos e répteis resgatados em Cundinamarca e cuidamos deles até a soltura." },
    },
    environmentalPermit: "Permiso PA-0202 (ficticio)",
    contactName: "Andrés Rojas, coordinador",
    contactEmail: "hola@bosquevivo.example",
    contactPhone: "+57 300 000 0202",
    offersVolunteering: true,
    photoPath: "/fotos/ong/fundacion-bosque-vivo.webp",
  },
];

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    key: "PROV_ARRAYAN",
    name: "Droguería Veterinaria El Arrayán",
    sells: "Medicamentos y vitaminas",
    city: "Villavicencio",
    ngos: ["ONG_ALAS"],
  },
  {
    key: "PROV_LLANOVERDE",
    name: "Clínica Veterinaria Llano Verde",
    sells: "Atención veterinaria",
    city: "Villavicencio",
    ngos: ["ONG_ALAS"],
  },
  {
    key: "PROV_SABANA",
    name: "Clínica Veterinaria Sabana",
    sells: "Atención veterinaria",
    city: "Fusagasugá",
    ngos: ["ONG_BOSQUE"],
  },
  {
    key: "PROV_COSECHA",
    name: "Agropecuaria La Cosecha",
    sells: "Alimentos",
    city: "Fusagasugá",
    ngos: ["ONG_BOSQUE"],
  },
  {
    key: "PROV_MALLAS",
    name: "Mallas y Recintos del Sumapaz",
    sells: "Mallas, perchas y materiales para recintos",
    city: "Fusagasugá",
    ngos: ["ONG_ALAS", "ONG_BOSQUE"],
  },
];

const revisado = (
  provider: AccountKey,
  amount: string,
  category: ExpenseCategory,
  invoiceNumber: string,
  occurredOn: string,
  concept?: { es: string } & EnPt,
): DemoExpense => ({
  provider,
  amount,
  category,
  invoiceNumber,
  concept: concept?.es,
  translations: concept ? { en: { concept: concept.en }, pt: { concept: concept.pt } } : undefined,
  validationLevel: "revisado",
  occurredOn,
});

const hitoCerrado = (description: string, occurredOn: string, traduccion: EnPt): DemoMilestone => ({
  description,
  translations: { en: { description: traduccion.en }, pt: { description: traduccion.pt } },
  validationLevel: "revisado",
  occurredOn,
  photoPath: null,
});

export const DEMO_CASES: DemoCase[] = [
  {
    code: "POW_001",
    ngo: "ONG_ALAS",
    commonName: "Guacamaya roja",
    scientificName: "Ara macao",
    group: "ave",
    shortStory: "Llegó al centro con un ala rota.",
    story:
      "La decomisaron en un control de carretera, dentro de una caja de cartón, junto con otras aves que iban a ser vendidas. Llegó deshidratada y con el ala izquierda fracturada. El equipo veterinario le inmovilizó el ala y empezó el tratamiento.",
    translations: {
      en: {
        commonName: "Scarlet macaw",
        shortStory: "It arrived at the center with a broken wing.",
        story:
          "It was seized at a roadside checkpoint, inside a cardboard box, along with other birds that were going to be sold. It arrived dehydrated and with a fractured left wing. The veterinary team immobilized the wing and started treatment.",
      },
      pt: {
        commonName: "Arara-canga",
        shortStory: "Chegou ao centro com uma asa quebrada.",
        story:
          "Foi apreendida em uma blitz na estrada, dentro de uma caixa de papelão, junto com outras aves que seriam vendidas. Chegou desidratada e com a asa esquerda fraturada. A equipe veterinária imobilizou a asa e começou o tratamento.",
      },
    },
    photoPath: "/fotos/casos/pow_001-guacamaya-roja.webp",
    intakeDate: "2026-10-20",
    outcome: null,
    // Arranca en 0: el gasto de la etapa 1 y el hito se registran en vivo durante la demo.
    stages: [
      {
        name: "Medicamento para el ala",
        shortName: "Medicamento",
        covers: "Antiinflamatorio, antibiótico y vendajes",
        translations: {
          en: { name: "Medication for the wing", shortName: "Medication", covers: "Anti-inflammatory, antibiotic and bandages" },
          pt: { name: "Medicamento para a asa", shortName: "Medicamento", covers: "Anti-inflamatório, antibiótico e ataduras" },
        },
        cost: "40",
        status: "completada",
        photoPath: "/fotos/etapas/pow_001-etapa-1.webp",
      },
      {
        name: "Cuidados especiales y recinto adaptado",
        shortName: "Cuidados especiales",
        covers: "Dieta blanda y percha baja mientras sana el ala",
        translations: {
          en: { name: "Special care and adapted enclosure", shortName: "Special care", covers: "Soft diet and a low perch while the wing heals" },
          pt: { name: "Cuidados especiais e recinto adaptado", shortName: "Cuidados especiais", covers: "Dieta macia e poleiro baixo enquanto a asa cicatriza" },
        },
        cost: "30",
        status: "en_curso",
        photoPath: "/fotos/etapas/pow_001-etapa-2.webp",
      },
      {
        name: "Rehabilitación de vuelo",
        shortName: "Rehabilitación de vuelo",
        covers: "Entrenamiento en un aviario grande",
        translations: {
          en: { name: "Flight rehabilitation", shortName: "Flight rehabilitation", covers: "Training in a large aviary" },
          pt: { name: "Reabilitação de voo", shortName: "Reabilitação de voo", covers: "Treinamento em um viveiro grande" },
        },
        cost: "50",
        status: "pendiente",
      },
      {
        name: "Liberación y seguimiento",
        shortName: "Liberación",
        covers: "Traslado, liberación y monitoreo",
        translations: {
          en: { name: "Release and follow-up", shortName: "Release", covers: "Transport, release and monitoring" },
          pt: { name: "Soltura e acompanhamento", shortName: "Soltura", covers: "Transporte, soltura e monitoramento" },
        },
        cost: "30",
        status: "pendiente",
      },
    ],
  },
  {
    code: "POW_002",
    ngo: "ONG_BOSQUE",
    commonName: "Tortuga hicotea",
    scientificName: "Trachemys callirostris",
    group: "reptil",
    shortStory: "La tenían de mascota en un balde y llegó con el caparazón blando.",
    story:
      "Una familia la entregó después de tenerla dos años en un balde en el patio. Llegó con el caparazón blando por falta de sol y de una dieta adecuada. Ya le hicieron la valoración y ahora empieza la dieta con calcio y luz UV.",
    translations: {
      en: {
        commonName: "Colombian slider",
        shortStory: "It was kept as a pet in a bucket and arrived with a soft shell.",
        story:
          "A family handed it over after keeping it for two years in a bucket in the backyard. It arrived with a soft shell from lack of sunlight and a proper diet. It has already had its assessment and is now starting a diet with calcium and UV light.",
      },
      pt: {
        commonName: "Tartaruga-hicotea",
        shortStory: "Era mantida como animal de estimação em um balde e chegou com o casco mole.",
        story:
          "Uma família a entregou depois de mantê-la por dois anos em um balde no quintal. Chegou com o casco mole por falta de sol e de uma dieta adequada. Já passou pela avaliação e agora começa a dieta com cálcio e luz UV.",
      },
    },
    photoPath: "/fotos/casos/pow_002-tortuga-hicotea.webp",
    intakeDate: "2026-11-02",
    outcome: null,
    stages: [
      {
        name: "Valoración y exámenes",
        shortName: "Valoración",
        covers: "Revisión, radiografía y desparasitación",
        translations: {
          en: { name: "Assessment and tests", shortName: "Assessment", covers: "Check-up, X-ray and deworming" },
          pt: { name: "Avaliação e exames", shortName: "Avaliação", covers: "Consulta, radiografia e vermifugação" },
        },
        cost: "25",
        status: "completada",
        photoPath: "/fotos/etapas/pow_002-etapa-1.webp",
        expense: {
          provider: "PROV_SABANA",
          amount: "25",
          category: "atencion_veterinaria",
          invoiceNumber: "FV-0388",
          validationLevel: "revisado",
          occurredOn: null,
        },
        milestone: {
          description: "Radiografía lista: no tiene fracturas, pero el caparazón está blando.",
          translations: {
            en: { description: "X-ray done: no fractures, but the shell is soft." },
            pt: { description: "Radiografia pronta: não tem fraturas, mas o casco está mole." },
          },
          validationLevel: "presentado",
          occurredOn: null,
          photoPath: null,
        },
      },
      {
        name: "Dieta, calcio y luz UV",
        shortName: "Dieta y luz UV",
        covers: "Dieta con calcio y lámpara UV durante 6 semanas",
        translations: {
          en: { name: "Diet, calcium and UV light", shortName: "Diet and UV light", covers: "Calcium-rich diet and a UV lamp for 6 weeks" },
          pt: { name: "Dieta, cálcio e luz UV", shortName: "Dieta e luz UV", covers: "Dieta com cálcio e lâmpada UV durante 6 semanas" },
        },
        cost: "35",
        status: "en_curso",
        photoPath: "/fotos/etapas/pow_002-etapa-2.webp",
      },
      {
        name: "Recuperación en estanque",
        shortName: "Estanque",
        covers: "Estanque con agua limpia y asoleadero",
        translations: {
          en: { name: "Recovery in a pond", shortName: "Pond", covers: "Pond with clean water and a basking spot" },
          pt: { name: "Recuperação no tanque", shortName: "Tanque", covers: "Tanque com água limpa e área para tomar sol" },
        },
        cost: "20",
        status: "pendiente",
      },
      {
        name: "Liberación en humedal",
        shortName: "Liberación",
        covers: "Traslado y liberación",
        translations: {
          en: { name: "Release in a wetland", shortName: "Release", covers: "Transport and release" },
          pt: { name: "Soltura em área úmida", shortName: "Soltura", covers: "Transporte e soltura" },
        },
        cost: "10",
        status: "pendiente",
      },
    ],
  },
  {
    code: "POW_003",
    ngo: "ONG_BOSQUE",
    commonName: "Zarigüeya común",
    scientificName: "Didelphis marsupialis",
    group: "mamifero",
    shortStory: "Llegó huérfana con dos meses, después de que atropellaran a su mamá.",
    story:
      "Unos vecinos la encontraron junto a su mamá, que había muerto atropellada en una vía rural. Tenía unos dos meses y todavía tomaba leche. Creció en el hogar de paso con poco contacto humano y, cuando aprendió a buscar comida sola, la liberaron en un bosque de la región.",
    translations: {
      en: {
        commonName: "Common opossum",
        shortStory: "It arrived orphaned at two months old, after its mother was hit by a car.",
        story:
          "Some neighbors found it next to its mother, who had been killed by a car on a rural road. It was about two months old and still drinking milk. It grew up at the shelter with little human contact and, once it learned to find food on its own, it was released in a forest in the region.",
      },
      pt: {
        commonName: "Gambá-comum",
        shortStory: "Chegou órfã com dois meses, depois que a mãe foi atropelada.",
        story:
          "Alguns vizinhos a encontraram ao lado da mãe, que tinha morrido atropelada em uma estrada rural. Tinha uns dois meses e ainda tomava leite. Cresceu no lar temporário com pouco contato humano e, quando aprendeu a buscar comida sozinha, foi solta em uma floresta da região.",
      },
    },
    photoPath: "/fotos/casos/pow_003-zarigueya-comun.webp",
    intakeDate: "2026-08-03",
    outcome: { kind: "liberado", label: "Liberada", date: "2026-10-25" },
    stages: [
      {
        name: "Leche especial y calor",
        shortName: "Leche y calor",
        covers: "Leche especial para crías y fuente de calor",
        translations: {
          en: { name: "Special milk and warmth", shortName: "Milk and warmth", covers: "Special milk for young animals and a heat source" },
          pt: { name: "Leite especial e calor", shortName: "Leite e calor", covers: "Leite especial para filhotes e fonte de calor" },
        },
        cost: "20",
        status: "completada",
        photoPath: "/fotos/etapas/pow_003-etapa-1.webp",
        expense: revisado("PROV_COSECHA", "20", "alimentacion", "FV-0201", "2026-08-05"),
        milestone: hitoCerrado("Recibe leche especial cada tres horas y gana peso.", "2026-08-10", {
          en: "It gets special milk every three hours and is gaining weight.",
          pt: "Recebe leite especial a cada três horas e está ganhando peso.",
        }),
      },
      {
        name: "Alimentación y crecimiento",
        shortName: "Alimentación",
        covers: "Paso a alimento sólido mientras crece",
        translations: {
          en: { name: "Feeding and growth", shortName: "Feeding", covers: "Switch to solid food as it grows" },
          pt: { name: "Alimentação e crescimento", shortName: "Alimentação", covers: "Transição para alimento sólido enquanto cresce" },
        },
        cost: "25",
        status: "completada",
        photoPath: "/fotos/etapas/pow_003-etapa-2.webp",
        expense: revisado("PROV_COSECHA", "25", "alimentacion", "FV-0233", "2026-09-01"),
        milestone: hitoCerrado("Ya come alimento sólido y duplicó su peso.", "2026-09-05", {
          en: "It now eats solid food and has doubled its weight.",
          pt: "Já come alimento sólido e dobrou de peso.",
        }),
      },
      {
        name: "Entrenamiento en recinto exterior",
        shortName: "Recinto exterior",
        covers: "Recinto exterior para aprender a buscar comida",
        translations: {
          en: { name: "Training in an outdoor enclosure", shortName: "Outdoor enclosure", covers: "Outdoor enclosure to learn to find food" },
          pt: { name: "Treinamento em recinto externo", shortName: "Recinto externo", covers: "Recinto externo para aprender a buscar comida" },
        },
        cost: "20",
        status: "completada",
        photoPath: "/fotos/etapas/pow_003-etapa-3.webp",
        expense: revisado("PROV_MALLAS", "20", "rehabilitacion", "FV-0270", "2026-09-28"),
        milestone: hitoCerrado("Busca comida sola en el recinto exterior.", "2026-10-10", {
          en: "It finds food on its own in the outdoor enclosure.",
          pt: "Busca comida sozinha no recinto externo.",
        }),
      },
      {
        name: "Liberación",
        shortName: "Liberación",
        covers: "Revisión final y liberación en un bosque de la región",
        translations: {
          en: { name: "Release", shortName: "Release", covers: "Final check-up and release in a forest in the region" },
          pt: { name: "Soltura", shortName: "Soltura", covers: "Revisão final e soltura em uma floresta da região" },
        },
        cost: "15",
        status: "completada",
        photoPath: "/fotos/etapas/pow_003-etapa-4.webp",
        expense: revisado("PROV_SABANA", "15", "atencion_veterinaria", "FV-0305", "2026-10-22", {
          es: "Revisión final",
          en: "Final check-up",
          pt: "Revisão final",
        }),
        milestone: hitoCerrado("Liberada en un bosque de la región.", "2026-10-25", {
          en: "Released in a forest in the region.",
          pt: "Solta em uma floresta da região.",
        }),
      },
    ],
  },
  {
    code: "POW_004",
    ngo: "ONG_ALAS",
    commonName: "Loro real",
    scientificName: "Amazona ochrocephala",
    group: "ave",
    shortStory: "Vivía en una jaula pequeña y no sabía volar.",
    story:
      "Lo entregaron a la autoridad ambiental después de años en una jaula donde no podía abrir las alas. Llegó con las plumas cortadas y los músculos del vuelo débiles. Cuando le crecieron las plumas, entrenó en el aviario y voló junto a otros loros.",
    translations: {
      en: {
        commonName: "Yellow-crowned amazon",
        shortStory: "It lived in a small cage and could not fly.",
        story:
          "It was handed over to the environmental authority after years in a cage where it could not spread its wings. It arrived with clipped feathers and weak flight muscles. Once its feathers grew back, it trained in the aviary and flew alongside other parrots.",
      },
      pt: {
        commonName: "Papagaio-campeiro",
        shortStory: "Vivia em uma gaiola pequena e não sabia voar.",
        story:
          "Foi entregue à autoridade ambiental depois de anos em uma gaiola onde não conseguia abrir as asas. Chegou com as penas cortadas e os músculos de voo fracos. Quando as penas cresceram, treinou no viveiro e voou junto com outros papagaios.",
      },
    },
    photoPath: "/fotos/casos/pow_004-loro-real.webp",
    intakeDate: "2026-06-12",
    outcome: { kind: "liberado", label: "Liberado", date: "2026-09-30" },
    stages: [
      {
        name: "Valoración y desparasitación",
        shortName: "Valoración",
        covers: "Revisión veterinaria y desparasitación",
        translations: {
          en: { name: "Assessment and deworming", shortName: "Assessment", covers: "Veterinary check-up and deworming" },
          pt: { name: "Avaliação e vermifugação", shortName: "Avaliação", covers: "Consulta veterinária e vermifugação" },
        },
        cost: "20",
        status: "completada",
        photoPath: "/fotos/etapas/pow_004-etapa-1.webp",
        expense: revisado("PROV_LLANOVERDE", "20", "atencion_veterinaria", "FV-0150", "2026-06-14"),
        milestone: hitoCerrado("Valoración completa y desparasitado.", "2026-06-15", {
          en: "Assessment complete and dewormed.",
          pt: "Avaliação completa e vermifugado.",
        }),
      },
      {
        name: "Dieta con vitaminas y recinto",
        shortName: "Dieta y recinto",
        covers: "Vitaminas para el plumaje y recinto de recuperación",
        translations: {
          en: { name: "Vitamin-rich diet and enclosure", shortName: "Diet and enclosure", covers: "Vitamins for the plumage and a recovery enclosure" },
          pt: { name: "Dieta com vitaminas e recinto", shortName: "Dieta e recinto", covers: "Vitaminas para a plumagem e recinto de recuperação" },
        },
        cost: "35",
        status: "completada",
        photoPath: "/fotos/etapas/pow_004-etapa-2.webp",
        expense: revisado("PROV_ARRAYAN", "35", "medicamentos", "FV-0177", "2026-07-10"),
        milestone: hitoCerrado("Le están creciendo las plumas de vuelo.", "2026-07-25", {
          en: "Its flight feathers are growing back.",
          pt: "As penas de voo estão crescendo.",
        }),
      },
      {
        name: "Entrenamiento de vuelo",
        shortName: "Entrenamiento de vuelo",
        covers: "Malla y perchas del aviario",
        translations: {
          en: { name: "Flight training", shortName: "Flight training", covers: "Netting and perches for the aviary" },
          pt: { name: "Treinamento de voo", shortName: "Treinamento de voo", covers: "Tela e poleiros do viveiro" },
        },
        cost: "45",
        status: "completada",
        photoPath: "/fotos/etapas/pow_004-etapa-3.webp",
        expense: revisado("PROV_MALLAS", "45", "rehabilitacion", "FV-0196", "2026-08-12", {
          es: "Malla y perchas del aviario",
          en: "Netting and perches for the aviary",
          pt: "Tela e poleiros do viveiro",
        }),
        milestone: hitoCerrado("Vuela de lado a lado del aviario con otros loros.", "2026-09-05", {
          en: "It flies from one end of the aviary to the other with other parrots.",
          pt: "Voa de um lado ao outro do viveiro com outros papagaios.",
        }),
      },
      {
        name: "Liberación y seguimiento",
        shortName: "Liberación",
        covers: "Revisión antes de liberar, liberación y monitoreo",
        translations: {
          en: { name: "Release and follow-up", shortName: "Release", covers: "Check-up before release, release and monitoring" },
          pt: { name: "Soltura e acompanhamento", shortName: "Soltura", covers: "Revisão antes da soltura, soltura e monitoramento" },
        },
        cost: "20",
        status: "completada",
        photoPath: "/fotos/etapas/pow_004-etapa-4.webp",
        expense: revisado(
          "PROV_LLANOVERDE",
          "20",
          "atencion_veterinaria",
          "FV-0219",
          "2026-09-25",
          { es: "Revisión antes de liberar", en: "Check-up before release", pt: "Revisão antes da soltura" },
        ),
        milestone: hitoCerrado("Liberado junto a otros loros.", "2026-09-30", {
          en: "Released alongside other parrots.",
          pt: "Solto junto com outros papagaios.",
        }),
      },
    ],
  },
  {
    code: "POW_005",
    ngo: "ONG_BOSQUE",
    commonName: "Perezoso de dos dedos",
    scientificName: "Choloepus hoffmanni",
    group: "mamifero",
    shortStory: "Lo rescataron de un vendedor en la carretera y hoy vive en una reserva.",
    story:
      "Lo ofrecían a turistas en una carretera, amarrado a un palo. Lo decomisaron y llegó con desnutrición y deshidratación. Recuperó peso, pero pasó tanto tiempo en manos de personas que no aprendió a valerse solo en el bosque. Por eso no pudo ser liberado y ahora vive en la reserva de la fundación, en un bosque cercado.",
    translations: {
      en: {
        commonName: "Two-toed sloth",
        shortStory: "It was rescued from a roadside seller and now lives in a sanctuary.",
        story:
          "It was being offered to tourists on a road, tied to a stick. It was seized and arrived malnourished and dehydrated. It regained weight, but it had spent so long in human hands that it never learned to fend for itself in the forest. That is why it could not be released, and it now lives in the foundation's sanctuary, in a fenced forest.",
      },
      pt: {
        commonName: "Preguiça-de-dois-dedos",
        shortStory: "Foi resgatada de um vendedor na estrada e hoje vive em um santuário.",
        story:
          "Era oferecida a turistas em uma estrada, amarrada a um pedaço de pau. Foi apreendida e chegou desnutrida e desidratada. Recuperou peso, mas passou tanto tempo nas mãos de pessoas que não aprendeu a se virar sozinha na floresta. Por isso não pôde ser solta e agora vive no santuário da fundação, em uma floresta cercada.",
      },
    },
    photoPath: "/fotos/casos/pow_005-perezoso-de-dos-dedos.webp",
    intakeDate: "2026-05-15",
    outcome: { kind: "en_reserva", label: "En reserva", date: "2026-10-10" },
    stages: [
      {
        name: "Tratamiento de la desnutrición",
        shortName: "Desnutrición",
        covers: "Hidratación, dieta de recuperación y controles",
        translations: {
          en: { name: "Treatment for malnutrition", shortName: "Malnutrition", covers: "Hydration, a recovery diet and check-ups" },
          pt: { name: "Tratamento da desnutrição", shortName: "Desnutrição", covers: "Hidratação, dieta de recuperação e consultas" },
        },
        cost: "60",
        status: "completada",
        photoPath: "/fotos/etapas/pow_005-etapa-1.webp",
        expense: revisado("PROV_SABANA", "60", "atencion_veterinaria", "FV-0122", "2026-05-18"),
        milestone: hitoCerrado("Está hidratado y empezó a recuperar peso.", "2026-06-01", {
          en: "It is hydrated and has started to regain weight.",
          pt: "Está hidratada e começou a recuperar peso.",
        }),
      },
      {
        name: "Recinto con árboles",
        shortName: "Recinto con árboles",
        covers: "Recinto con árboles para trepar",
        translations: {
          en: { name: "Enclosure with trees", shortName: "Enclosure with trees", covers: "Enclosure with trees to climb" },
          pt: { name: "Recinto com árvores", shortName: "Recinto com árvores", covers: "Recinto com árvores para escalar" },
        },
        cost: "70",
        status: "completada",
        photoPath: "/fotos/etapas/pow_005-etapa-2.webp",
        expense: revisado("PROV_MALLAS", "70", "rehabilitacion", "FV-0160", "2026-06-20"),
        milestone: hitoCerrado("Ya trepa y descansa en los árboles del recinto.", "2026-07-10", {
          en: "It now climbs and rests in the trees of the enclosure.",
          pt: "Já escala e descansa nas árvores do recinto.",
        }),
      },
      {
        name: "Adaptación y alimentación",
        shortName: "Adaptación",
        covers: "Hojas y frutas de su dieta silvestre",
        translations: {
          en: { name: "Adaptation and feeding", shortName: "Adaptation", covers: "Leaves and fruit from its wild diet" },
          pt: { name: "Adaptação e alimentação", shortName: "Adaptação", covers: "Folhas e frutas da sua dieta silvestre" },
        },
        cost: "40",
        status: "completada",
        photoPath: "/fotos/etapas/pow_005-etapa-3.webp",
        expense: revisado("PROV_COSECHA", "40", "alimentacion", "FV-0241", "2026-08-20"),
        milestone: hitoCerrado("Come hojas de su dieta silvestre, pero no se vale solo en el bosque.", "2026-09-15", {
          en: "It eats leaves from its wild diet, but cannot fend for itself in the forest.",
          pt: "Come folhas da sua dieta silvestre, mas não se vira sozinha na floresta.",
        }),
      },
      {
        name: "Traslado a la reserva",
        shortName: "Traslado a la reserva",
        covers: "Revisión antes del traslado y traslado a la reserva",
        translations: {
          en: { name: "Move to the sanctuary", shortName: "Move to the sanctuary", covers: "Check-up before the move and transport to the sanctuary" },
          pt: { name: "Transferência para o santuário", shortName: "Transferência para o santuário", covers: "Revisão antes da transferência e transporte para o santuário" },
        },
        cost: "30",
        status: "completada",
        photoPath: "/fotos/etapas/pow_005-etapa-4.webp",
        expense: revisado(
          "PROV_SABANA",
          "30",
          "atencion_veterinaria",
          "FV-0290",
          "2026-10-05",
          { es: "Revisión antes del traslado", en: "Check-up before the move", pt: "Revisão antes da transferência" },
        ),
        milestone: hitoCerrado("Vive en la reserva de la fundación, en un bosque cercado.", "2026-10-10", {
          en: "It lives in the foundation's sanctuary, in a fenced forest.",
          pt: "Vive no santuário da fundação, em uma floresta cercada.",
        }),
      },
    ],
  },
];

/** Alias públicos de los donantes. Sin alias se muestra la dirección abreviada (G…). */
export const DEMO_DONORS: Record<AccountKey, string | null> = {
  DON_ANA: "Ana M.",
  DON_VALENTINA: "Valentina C.",
  DON_LAURA: "Laura G.",
  DON_MATEO: "Mateo V.",
  DON_ANONIMO: null,
  DON_DANIEL: "Daniel P.",
  DON_SOFIA: "Sofía T.",
  DON_CAMILA: "Camila R.",
};

/** USDC de prueba con que el script fondea la billetera de Ana para su aporte en vivo. */
export const DEMO_ANA_BALANCE = "100";

/** Aportes que carga el script, en este orden (el orden cambia el reparto). El de Ana se hace en vivo. */
export const DEMO_CONTRIBUTIONS: DemoContribution[] = [
  { caseCode: "POW_005", donor: "DON_VALENTINA", amount: "80", expected: [[1, "60"], [2, "20"]] },
  { caseCode: "POW_005", donor: "DON_LAURA", amount: "60", expected: [[2, "50"], [3, "10"]] },
  { caseCode: "POW_005", donor: "DON_MATEO", amount: "40", expected: [[3, "30"], [4, "10"]] },
  { caseCode: "POW_005", donor: "DON_ANONIMO", amount: "20", expected: [[4, "20"]] },
  { caseCode: "POW_004", donor: "DON_MATEO", amount: "50", expected: [[1, "20"], [2, "30"]] },
  { caseCode: "POW_004", donor: "DON_DANIEL", amount: "40", expected: [[2, "5"], [3, "35"]] },
  { caseCode: "POW_004", donor: "DON_ANONIMO", amount: "30", expected: [[3, "10"], [4, "20"]] },
  { caseCode: "POW_003", donor: "DON_DANIEL", amount: "30", expected: [[1, "20"], [2, "10"]] },
  { caseCode: "POW_003", donor: "DON_LAURA", amount: "25", expected: [[2, "15"], [3, "10"]] },
  { caseCode: "POW_003", donor: "DON_ANONIMO", amount: "15", expected: [[3, "10"], [4, "5"]] },
  { caseCode: "POW_003", donor: "DON_SOFIA", amount: "10", expected: [[4, "10"]] },
  { caseCode: "POW_002", donor: "DON_CAMILA", amount: "20", expected: [[1, "20"]] },
  { caseCode: "POW_002", donor: "DON_ANONIMO", amount: "15", expected: [[1, "5"], [2, "10"]] },
];

/** El aporte que Ana hace en vivo durante la demo (no lo carga el script). */
export const DEMO_LIVE_CONTRIBUTION: DemoContribution = {
  caseCode: "POW_001",
  donor: "DON_ANA",
  amount: "50",
  expected: [[1, "40"], [2, "10"]],
};

export const DEMO_VOLUNTEERINGS: DemoVolunteering[] = [
  {
    ngo: "ONG_BOSQUE",
    title: "Jornada de cuidado del refugio",
    date: "2026-12-13",
    schedule: "8:00 a. m. a 1:00 p. m.",
    city: "Fusagasugá",
    tasks: [
      "Limpiar las áreas de descanso de los animales",
      "Organizar los medicamentos",
      "Preparar los alimentos",
      "Reacomodar los hábitats temporales",
    ],
    requirements: ["Mayor de edad", "Ropa cómoda", "Zapatos cerrados"],
    translations: {
      en: {
        title: "Shelter care day",
        schedule: "8:00 a.m. to 1:00 p.m.",
        tasks: [
          "Clean the animals' resting areas",
          "Organize the medicines",
          "Prepare the food",
          "Rearrange the temporary habitats",
        ],
        requirements: ["18 or older", "Comfortable clothes", "Closed-toe shoes"],
      },
      pt: {
        title: "Dia de cuidados no abrigo",
        schedule: "Das 8h às 13h",
        tasks: [
          "Limpar as áreas de descanso dos animais",
          "Organizar os medicamentos",
          "Preparar os alimentos",
          "Reorganizar os habitats temporários",
        ],
        requirements: ["Ser maior de idade", "Roupas confortáveis", "Sapatos fechados"],
      },
    },
    capacity: 12,
    preOccupied: 8,
    photoPath: "/fotos/ong/fundacion-bosque-vivo.webp",
  },
  {
    ngo: "ONG_ALAS",
    title: "Mantenimiento de aviarios",
    date: "2027-01-17",
    schedule: "8:00 a. m. a 12:00 m.",
    city: "Villavicencio",
    tasks: [
      "Limpiar y desinfectar comederos",
      "Cortar fruta para la dieta de las aves",
      "Arreglar perchas en aviarios vacíos",
    ],
    requirements: ["Mayor de edad", "Zapatos cerrados", "Gorra"],
    translations: {
      en: {
        title: "Aviary maintenance",
        schedule: "8:00 a.m. to 12:00 p.m.",
        tasks: ["Clean and disinfect feeders", "Cut fruit for the birds' diet", "Repair perches in empty aviaries"],
        requirements: ["18 or older", "Closed-toe shoes", "Cap"],
      },
      pt: {
        title: "Manutenção dos viveiros",
        schedule: "Das 8h às 12h",
        tasks: [
          "Limpar e desinfetar comedouros",
          "Cortar frutas para a dieta das aves",
          "Consertar poleiros em viveiros vazios",
        ],
        requirements: ["Ser maior de idade", "Sapatos fechados", "Boné"],
      },
    },
    capacity: 10,
    preOccupied: 3,
    photoPath: "/fotos/ong/refugio-alas-libres.webp",
  },
];
