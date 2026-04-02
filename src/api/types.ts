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
  key: "term" | "composition" | "objective" | "description" | "reference" | "abv";
  label: string;
};

export type GuideTableRow = {
  id: string;
  term: string;
  composition?: string;
  objective?: string;
  description?: string;
  reference?: string;
  abv?: string;
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
  reference?: string;
  abv?: string;
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

export type GuideTab = {
  id: string;
  slug: string;
  label: string;
  panelTitle?: string;
  noteTitle?: string;
  noteContent?: string;
  semanticKey?: string;
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
