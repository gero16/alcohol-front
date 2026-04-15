export type Category = {
  id: string;
  slug: string;
  position: number;
  title: string;
  summary: string;
  abv: string;
  origin: string;
  imageUrl: string;
  imageAlt: string;
  hasGuide: boolean;
};

export type CategoryInput = {
  slug: string;
  position: number;
  title: string;
  summary: string;
  abv: string;
  origin: string;
  imageUrl: string;
  imageAlt: string;
};

export type GuideSummary = {
  id: string;
  categorySlug: string;
  categoryTitle: string;
  title: string;
  type: string;
  tabsCount: number;
};

export type GuideTableColumn = {
  key:
    | "term"
    | "composition"
    | "objective"
    | "description"
    | "notes"
    | "reference"
    | "abv"
    | "ageingMaturation"
    | "distillationMethod"
    | "profileCharacter"
    | "body"
    | "intensity"
    | "bitternessIbu"
    | "finish"
    | "regionOrigin"
    | "visualColor"
    | "tannins"
    | "acidity"
    | "examples";
  label: string;
};

export type GuideTableRow = {
  id: string;
  term: string;
  composition?: string;
  objective?: string;
  description?: string;
  notes?: string;
  reference?: string;
  abv?: string;
  ageingMaturation?: string;
  distillationMethod?: string;
  profileCharacter?: string;
  body?: string;
  intensity?: string;
  bitternessIbu?: string;
  finish?: string;
  regionOrigin?: string;
  visualColor?: string;
  tannins?: string;
  acidity?: string;
  examples?: string;
  imageUrl?: string;
  imageAlt?: string;
};

export type GuideTable = {
  id: string;
  slug: string;
  title: string;
  displayMode: "table" | "cards";
  /** Pestaña de sección en destilados (slug de la sección en la misma pestaña de guía). */
  sectionSlug?: string;
  semanticKey?: string;
  columns: GuideTableColumn[];
  rows: GuideTableRow[];
};

export type GuideTableRowInput = {
  term: string;
  composition?: string;
  objective?: string;
  description?: string;
  notes?: string;
  reference?: string;
  abv?: string;
  ageingMaturation?: string;
  distillationMethod?: string;
  profileCharacter?: string;
  body?: string;
  intensity?: string;
  bitternessIbu?: string;
  finish?: string;
  regionOrigin?: string;
  visualColor?: string;
  tannins?: string;
  acidity?: string;
  examples?: string;
  imageUrl?: string;
  imageAlt?: string;
};

export type GuideTableInput = {
  slug: string;
  title: string;
  /** Vacío = tabla solo en «Tablas y notas» cuando la guía se parte por secciones. */
  sectionSlug?: string;
  semanticKey?: string;
  columns: GuideTableColumn[];
  rows: GuideTableRowInput[];
};

export type GuideSection = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  semanticKey?: string;
  paragraphs: string[];
};

export type GuideSectionInput = {
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  semanticKey?: string;
  paragraphs: string[];
};

/** Pieza de contenido dentro de una clasificación (orden en la tarjeta). */
export type GuideClassificationBlock =
  | { kind: "subtitle"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "image"; url: string; alt: string };

/** Clasificación: slug + secuencia ordenada de subtítulo, párrafo o imagen. */
export type GuideClassification = {
  id: string;
  slug: string;
  blocks: GuideClassificationBlock[];
  semanticKey?: string;
};

export type GuideClassificationInput = {
  slug: string;
  blocks: GuideClassificationBlock[];
  semanticKey?: string;
};

export type GuideTab = {
  id: string;
  slug: string;
  label: string;
  panelTitle?: string;
  noteTitle?: string;
  noteContent?: string;
  semanticKey?: string;
  classifications: GuideClassification[];
  sections: GuideSection[];
  tables: GuideTable[];
};

export type GuideTabInput = {
  slug: string;
  label: string;
  position: number;
  panelTitle?: string;
  noteTitle?: string;
  noteContent?: string;
  semanticKey?: string;
  classifications: GuideClassificationInput[];
  sections: GuideSectionInput[];
  tables: GuideTableInput[];
};

export type GuideDetail = {
  id: string;
  category: Category;
  title: string;
  type: string;
  tabs: GuideTab[];
};

export type GuideInput = {
  title: string;
  type: string;
  tabs: GuideTabInput[];
};

// ─── Productos / marcas específicas ───────────────────────────────────────────

export type WhiskyType =
  | "SINGLE_MALT"
  | "SINGLE_GRAIN"
  | "BLENDED_MALT"
  | "BLENDED_SCOTCH"
  | "BOURBON"
  | "TENNESSEE_WHISKEY"
  | "RYE"
  | "IRISH"
  | "JAPANESE"
  | "WORLD";

export type WineType =
  | "TINTO"
  | "BLANCO"
  | "ROSADO"
  | "ESPUMOSO"
  | "DULCE"
  | "SEMI_DULCE"
  | "SEMI_SECO"
  | "FORTIFICADO";

export type WineStyle =
  | "JOVEN"
  | "ROBLE"
  | "CRIANZA"
  | "RESERVA"
  | "GRAN_RESERVA";

/** Cuerpo/densidad en boca, aplicable a cualquier bebida. */
export type BodyDensity =
  | "LOW"
  | "MEDIUM_LOW"
  | "MEDIUM"
  | "MEDIUM_HIGH"
  | "HIGH";

export type WineGrape = {
  grape: string;
  percentage?: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  subcategorySlug?: string | null;
  abv?: number | null;
  origin?: string | null;
  regionDetail?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  /** Descripción breve para listados y previews */
  shortDescription?: string | null;
  /** Descripción larga y detallada */
  longDescription?: string | null;
  /** "On the rocks", "Highball", "En copa técnica", etc. */
  servingSuggestion?: string | null;
  priceRange?: string | null;
  featured: boolean;
  /** Tags libres para búsqueda: ["ahumado", "mezcla", "picante"] */
  tags?: string[] | null;
  /** Cuerpo/densidad en boca */
  bodyDensity?: BodyDensity | null;
  /** Proporción de mezcla recomendada: "70/30 Cola", "Ginger Ale 1:3" */
  mixingRatio?: string | null;
  // Notas de cata
  tastingColor?: string | null;
  /** Array de aromas para filtrado: ["cítricos", "vainilla", "humo joven"] */
  tastingNose?: string[] | null;
  /** Array de sabores para filtrado: ["especias", "malta", "pimienta"] */
  tastingPalate?: string[] | null;
  tastingFinish?: string | null;
  // Whisky
  whiskyType?: WhiskyType | null;
  distillery?: string | null;
  /** Años de guarda o "NAS" si no hay declaración de edad */
  ageStatement?: string | null;
  caskType?: string | null;
  /** Si el whisky es ahumado con turba */
  isPeated?: boolean | null;
  // Vino
  wineType?: WineType | null;
  wineStyle?: WineStyle | null;
  vintage?: number | null;
  producer?: string | null;
  grapes?: WineGrape[] | null;
  // Cerveza
  beerStyle?: string | null;
  ibu?: number | null;
  beerColor?: string | null;
  // Maridajes
  pairings?: string[] | null;
};

export type ProductInput = Omit<Product, "id" | "featured"> & {
  featured?: boolean;
};

export type GlossaryItem = {
  slug: string;
  term: string;
  shortDefinition: string;
  details: string[];
  relatedCategories: string[];
  featured?: boolean;
};

export type GlossaryInput = {
  slug: string;
  term: string;
  shortDefinition: string;
  details: string[];
  relatedCategories: string[];
  featured?: boolean;
};
