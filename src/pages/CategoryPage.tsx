import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ApiError, getCategoryBySlug, getGuideByCategorySlug, getProducts } from "../api/client";
import type {
  BodyDensity,
  Category,
  GuideClassification,
  GuideClassificationBlock,
  GuideDetail,
  GuideTable,
  GuideTableColumn,
  GuideTableRow,
  Product,
  WhiskyType,
  WineSensoryLevel,
  WineType,
} from "../api/types";
import { ZoomableCoverImg, ZoomableImage } from "../components/ImageLightbox";
import { GlossaryText } from "../glossary";
import {
  getGuideSubcategories,
  getTabsWithoutSubcategories,
} from "../guideSubcategories";

const CLASSIFICATIONS_TABLE_LOCATION = "__clasificaciones__";
const SECTION_CONTENT_SUBTITLE_PREFIX = "__subtitle__:";
const PRODUCTS_TAB_SLUG = "__productos__";

type SectionContentBlock = {
  kind: "subtitle" | "paragraph";
  text: string;
};

function parseSectionContentBlock(raw: string): SectionContentBlock | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith(SECTION_CONTENT_SUBTITLE_PREFIX)) {
    const text = value.slice(SECTION_CONTENT_SUBTITLE_PREFIX.length).trim();
    if (!text) {
      return null;
    }
    return { kind: "subtitle", text };
  }

  return { kind: "paragraph", text: value };
}

function classificationHasVisibleBlocks(c: GuideClassification): boolean {
  return (c.blocks ?? []).some((piece) => {
    if (piece.kind === "subtitle" || piece.kind === "paragraph") {
      return piece.text.trim().length > 0;
    }
    return piece.url.trim().length > 0;
  });
}

/** Etiqueta legible a partir del slug (p. ej. single-malt → Single malt). */
function humanizeClassificationSlug(slug: string): string {
  const s = slug.trim();
  if (!s) {
    return "Sin nombre";
  }
  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function GuideClassificationsList({ classifications }: { classifications: GuideClassification[] }) {
  const visible = useMemo(
    () => classifications.filter(classificationHasVisibleBlocks),
    [classifications],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((i) => {
      const max = Math.max(0, visible.length - 1);
      return Math.min(Math.max(0, i), max);
    });
  }, [visible.length]);

  if (visible.length === 0) {
    return null;
  }

  const renderCard = (item: GuideClassification) => (
    <article
      key={item.id}
      className="classification-card classification-card--frame"
      data-classification-semantic-key={item.semanticKey?.trim() || undefined}
    >
      {(item.blocks ?? []).map((piece, pieceIdx) => (
        <ClassificationBlockFragment key={pieceIdx} block={piece} />
      ))}
    </article>
  );

  if (visible.length === 1) {
    return <div className="classification-list guide-classifications">{renderCard(visible[0])}</div>;
  }

  const active = visible[activeIndex];

  return (
    <div className="guide-classifications guide-classifications--multi">
      <p className="guide-classifications__hint">Varias clasificaciones; elige una:</p>
      <div className="guide-classifications__switcher" role="tablist" aria-label="Elegir clasificación">
        {visible.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`classification-tab-${item.id}`}
            aria-selected={i === activeIndex}
            tabIndex={i === activeIndex ? 0 : -1}
            aria-controls={`classification-panel-${item.id}`}
            className={
              i === activeIndex
                ? "guide-classifications__chip guide-classifications__chip--active"
                : "guide-classifications__chip"
            }
            onClick={() => setActiveIndex(i)}
          >
            {humanizeClassificationSlug(item.slug)}
          </button>
        ))}
      </div>
      <div
        id={`classification-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`classification-tab-${active.id}`}
        className="guide-classifications__panel"
      >
        {renderCard(active)}
      </div>
    </div>
  );
}

function ClassificationBlockFragment({ block }: { block: GuideClassificationBlock }) {
  if (block.kind === "subtitle") {
    const text = block.text.trim();
    if (!text) {
      return null;
    }
    return (
      <p className="classification-card__subtitle">
        <GlossaryText text={text} />
      </p>
    );
  }
  if (block.kind === "paragraph") {
    const text = block.text.trim();
    if (!text) {
      return null;
    }
    return (
      <p className="classification-card__text">
        <GlossaryText text={text} />
      </p>
    );
  }
  const url = block.url.trim();
  if (!url) {
    return null;
  }
  return (
    <ZoomableCoverImg
      className="classification-card__image classification-card__image--zoomable"
      src={url}
      alt={block.alt.trim() || "Ilustración"}
      loading="lazy"
    />
  );
}

/**
 * En la ficha de un destilado concreto (ej. whisky): pestañas por sección primero,
 * luego «Clasificaciones» si hay contenido, y al final tablas + nota.
 */
function buildSpiritSubcategoryViewTabs(tab: GuideDetail["tabs"][number]): GuideDetail["tabs"] {
  const { sections, tables, classifications, noteTitle, noteContent, panelTitle, ...rest } = tab;

  if (sections.length <= 1) {
    return [tab];
  }

  const unattachedTables = tables.filter((t) => !(t.sectionSlug && t.sectionSlug.trim().length > 0));
  const classificationScopedTables = tables.filter(
    (t) => t.sectionSlug?.trim() === CLASSIFICATIONS_TABLE_LOCATION,
  );
  const noteBlock = noteContent?.trim();
  const cls = classifications ?? [];
  const hasVisibleClassifications = cls.some(classificationHasVisibleBlocks);
  const hasClassificationTabContent = hasVisibleClassifications || classificationScopedTables.length > 0;

  const classificationTabs: GuideDetail["tabs"] = hasClassificationTabContent
    ? [
        {
          ...rest,
          id: `${tab.id}-clasificaciones`,
          slug: `${tab.slug}__clasificaciones`,
          label: "Clasificaciones",
          panelTitle: "Clasificaciones",
          semanticKey: undefined,
          classifications: cls,
          sections: [],
          tables: classificationScopedTables,
          noteTitle: undefined,
          noteContent: undefined,
        },
      ]
    : [];

  const sectionTabs: GuideDetail["tabs"] = sections.map((section) => ({
    ...rest,
    id: `${tab.id}-sec-${section.id}`,
    slug: `${tab.slug}__sec__${section.slug}`,
    label: section.title.replace(/^\d+\.\s*/, ""),
    panelTitle: section.title,
    semanticKey: section.semanticKey ?? rest.semanticKey,
    classifications: [],
    sections: [section],
    tables: tables.filter((t) => t.sectionSlug?.trim() === section.slug),
    noteTitle: undefined,
    noteContent: undefined,
  }));

  const extraTabs: GuideDetail["tabs"] = [];
  if (unattachedTables.length > 0 || Boolean(noteBlock)) {
    extraTabs.push({
      ...rest,
      id: `${tab.id}-extra`,
      slug: `${tab.slug}__extra`,
      label: "Tablas y notas",
      panelTitle: panelTitle ?? "Tablas y notas",
      semanticKey: undefined,
      classifications: [],
      sections: [],
      tables: [...unattachedTables],
      noteTitle,
      noteContent,
    });
  }

  return [...sectionTabs, ...classificationTabs, ...extraTabs];
}

/** En aperitivos, una subcategoría dedicada (p. ej. Aperol) puede tener varias secciones. */
function buildAperitifSubcategoryViewTabs(tab: GuideDetail["tabs"][number]): GuideDetail["tabs"] {
  const { sections, tables, classifications, noteTitle, noteContent, panelTitle, ...rest } = tab;

  if (sections.length <= 1) {
    return [tab];
  }

  const unattachedTables = tables.filter((t) => !(t.sectionSlug && t.sectionSlug.trim().length > 0));
  const classificationScopedTables = tables.filter(
    (t) => t.sectionSlug?.trim() === CLASSIFICATIONS_TABLE_LOCATION,
  );
  const noteBlock = noteContent?.trim();
  const cls = classifications ?? [];
  const hasVisibleClassifications = cls.some(classificationHasVisibleBlocks);
  const hasClassificationTabContent = hasVisibleClassifications || classificationScopedTables.length > 0;

  const sectionTabs: GuideDetail["tabs"] = sections.map((section) => ({
    ...rest,
    id: `${tab.id}-sec-${section.id}`,
    slug: `${tab.slug}__sec__${section.slug}`,
    label: section.title,
    panelTitle: section.title,
    semanticKey: section.semanticKey ?? rest.semanticKey,
    classifications: [],
    sections: [section],
    tables: tables.filter((t) => t.sectionSlug?.trim() === section.slug),
    noteTitle: undefined,
    noteContent: undefined,
  }));

  const classificationTabs: GuideDetail["tabs"] = hasClassificationTabContent
    ? [
        {
          ...rest,
          id: `${tab.id}-clasificaciones`,
          slug: `${tab.slug}__clasificaciones`,
          label: "Clasificaciones",
          panelTitle: "Clasificaciones",
          semanticKey: undefined,
          classifications: cls,
          sections: [],
          tables: classificationScopedTables,
          noteTitle: undefined,
          noteContent: undefined,
        },
      ]
    : [];

  const extraTabs: GuideDetail["tabs"] = [];
  if (unattachedTables.length > 0 || Boolean(noteBlock)) {
    extraTabs.push({
      ...rest,
      id: `${tab.id}-extra`,
      slug: `${tab.slug}__extra`,
      label: "Tablas y notas",
      panelTitle: panelTitle ?? "Tablas y notas",
      semanticKey: undefined,
      classifications: [],
      sections: [],
      tables: [...unattachedTables],
      noteTitle,
      noteContent,
    });
  }

  return [...sectionTabs, ...classificationTabs, ...extraTabs];
}

function getRowValue(row: GuideTableRow, column: GuideTableColumn): string {
  const value = row[column.key];
  return typeof value === "string" && value.length > 0 ? value : "Sin dato";
}

function DataTable({ table, showTitle = true }: { table: GuideTable; showTitle?: boolean }) {
  const hasRowImages = table.rows.some((row) => Boolean(row.imageUrl?.trim()));

  return (
    <div className="summary-table-wrap">
      {showTitle ? <h3 className="detail__subheading">{table.title}</h3> : null}
      <table className="summary-table">
        <thead>
          <tr>
            {hasRowImages ? <th>Imagen</th> : null}
            {table.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              {hasRowImages ? (
                <td data-label="Imagen">
                  {row.imageUrl ? (
                    <ZoomableImage
                      src={row.imageUrl}
                      alt={row.imageAlt ?? row.term}
                      className="summary-table__thumb"
                      wrapperClassName="summary-table__thumb-button"
                      loading="lazy"
                      zoomLabel={`Ampliar imagen de ${row.term}`}
                    />
                  ) : (
                    "Sin imagen"
                  )}
                </td>
              ) : null}
              {table.columns.map((column) => (
                <td key={`${row.id}-${column.key}`} data-label={column.label}>
                  <GlossaryText text={getRowValue(row, column)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardTable({ table, showTitle = true }: { table: GuideTable; showTitle?: boolean }) {
  const renderField = (label: string, value?: string, tone: "default" | "sage" | "wine" | "slate" | "ref" = "default") =>
    value ? (
      tone === "ref" ? (
        <p className="classification-card__reference">
          <strong>{label}: </strong>
          <GlossaryText text={value} />
        </p>
      ) : (
        <div className={`info-field info-field--${tone}`}>
          <dt>{label}</dt>
          <dd>
            <GlossaryText text={value} />
          </dd>
        </div>
      )
    ) : null;

  return (
    <div className="summary-table-wrap">
      {showTitle ? <h3 className="detail__subheading">{table.title}</h3> : null}
      <div className="classification-list">
        {table.rows.map((row) => (
          <article key={row.id} className="classification-card classification-card--rich">
            {row.imageUrl ? (
              <ZoomableCoverImg
                className="classification-card__image classification-card__image--zoomable"
                src={row.imageUrl}
                alt={row.imageAlt ?? row.term}
                loading="lazy"
              />
            ) : null}
            <h3 className="classification-card__title">{row.term}</h3>
            <dl className="info-field-grid">
              {renderField("Ageing / Maturation", row.ageingMaturation, "sage")}
              {renderField("Distillation Method", row.distillationMethod, "slate")}
              {renderField("Perfil / Caracter", row.profileCharacter, "wine")}
              {renderField("Body", row.body)}
              {renderField("Intensidad", row.intensity, "wine")}
              {renderField("Bitterness (IBU)", row.bitternessIbu, "slate")}
              {renderField("Description", row.description)}
              {renderField("Descripción 2", row.description2)}
              {renderField("Maridaje", row.maridaje, "sage")}
              {renderField("Notas", row.notes, "wine")}
              {renderField("Finish", row.finish, "wine")}
              {renderField("Region / Origin", row.regionOrigin, "sage")}
              {renderField("Visual / Color", row.visualColor)}
              {renderField("Tannins", row.tannins, "wine")}
              {renderField("Acidity", row.acidity, "slate")}
              {renderField("Composicion", row.composition, "sage")}
              {renderField("Objetivo", row.objective)}
              {renderField("Categoria", row.category)}
              {renderField("ABV", row.abv, "slate")}
            </dl>
            {renderField("Reference", row.reference, "ref")}
            {renderField("Ejemplos", row.examples, "ref")}
          </article>
        ))}
      </div>
    </div>
  );
}

function SubcategoryChooser({
  guide,
}: {
  guide: GuideDetail;
}) {
  const subcategories = getGuideSubcategories(guide);

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <> </>
  );
}

function GuidePanel({
  guide,
  activeTabSlug,
  compactSingleSection = false,
}: {
  guide: GuideDetail;
  activeTabSlug: string;
  compactSingleSection?: boolean;
}) {
  const activeTab = guide.tabs.find((tab) => tab.slug === activeTabSlug) ?? guide.tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div
      id={`guide-panel-${activeTab.slug}`}
      role="tabpanel"
      aria-labelledby={`guide-tab-${activeTab.slug}`}
      className="wine-tabs__panel"
      data-tab-semantic-key={activeTab.semanticKey?.trim() || undefined}
    >
      {activeTab.panelTitle ? <h3 className="detail__subheading">{activeTab.panelTitle}</h3> : null}

      <GuideClassificationsList
        key={activeTab.slug}
        classifications={activeTab.classifications ?? []}
      />

      {activeTab.sections.length > 0 ? (
        <div className="classification-list">
          {activeTab.sections.map((section) => {
            const hideSectionHeader = compactSingleSection && activeTab.sections.length === 1;
            const sectionCoverUrl = section.imageUrl?.trim() ?? "";

            return (
            <article
              key={section.id}
              className={hideSectionHeader ? "classification-card classification-card--plain" : "classification-card"}
              data-section-semantic-key={section.semanticKey?.trim() || undefined}
            >
              {!hideSectionHeader ? (
                <ZoomableCoverImg
                  className="classification-card__image classification-card__image--zoomable"
                  src={section.imageUrl}
                  alt={section.imageAlt}
                  loading="lazy"
                />
              ) : sectionCoverUrl ? (
                <ZoomableCoverImg
                  className="guide-section__cover guide-section__cover--zoomable"
                  src={section.imageUrl}
                  alt={section.imageAlt}
                  loading="lazy"
                />
              ) : null}
              {!hideSectionHeader ? <h3 className="classification-card__title">{section.title}</h3> : null}
              {!hideSectionHeader ? (
                <p className="classification-card__subtitle">
                  <GlossaryText text={section.subtitle} />
                </p>
              ) : null}
              {section.paragraphs.map((paragraph, idx) => {
                const block = parseSectionContentBlock(paragraph);
                if (!block) {
                  return null;
                }
                if (block.kind === "subtitle") {
                  return (
                    <p key={`${section.id}-subtitle-${idx}`} className="classification-card__subtitle classification-card__subtitle--inline">
                      <GlossaryText text={block.text} />
                    </p>
                  );
                }
                return (
                  <p key={`${section.id}-paragraph-${idx}`} className="classification-card__text">
                    <GlossaryText text={block.text} />
                  </p>
                );
              })}
            </article>
            );
          })}
        </div>
      ) : null}

      {activeTab.tables.map((table) => {
        const showTitle = table.title !== activeTab.panelTitle;
        const shouldRenderAsTableWithThumbs = table.rows.some((row) => Boolean(row.imageUrl?.trim()));

        return (
          <div
            key={table.id}
            className="guide-table-semantic-wrap"
            data-table-semantic-key={table.semanticKey?.trim() || undefined}
          >
            {table.displayMode === "cards" && !shouldRenderAsTableWithThumbs ? (
              <CardTable table={table} showTitle={showTitle} />
            ) : (
              <DataTable table={table} showTitle={showTitle} />
            )}
          </div>
        );
      })}

      {activeTab.noteContent ? (
        <aside className="detail__note">
          <h3 className="detail__subheading">{activeTab.noteTitle ?? "Nota"}</h3>
          <p>
            <GlossaryText text={activeTab.noteContent} />
          </p>
        </aside>
      ) : null}
    </div>
  );
}

// ─── Helpers de legibilidad para productos ────────────────────────────────────

const WHISKY_TYPE_LABELS: Record<WhiskyType, string> = {
  SINGLE_MALT:       "Single Malt",
  SINGLE_GRAIN:      "Single Grain",
  BLENDED_MALT:      "Blended Malt",
  BLENDED_SCOTCH:    "Blended Scotch",
  BOURBON:           "Bourbon",
  TENNESSEE_WHISKEY: "Tennessee Whiskey",
  RYE:               "Rye",
  IRISH:             "Irish",
  JAPANESE:          "Japanese",
  WORLD:             "World",
};

const WINE_TYPE_LABELS: Record<WineType, string> = {
  TINTO:      "Tinto",
  BLANCO:     "Blanco",
  ROSADO:     "Rosado",
  ESPUMOSO:   "Espumoso",
  DULCE:      "Dulce",
  SEMI_DULCE: "Semi Dulce",
  SEMI_SECO:  "Semi Seco",
  FORTIFICADO: "Fortificado",
};

const BODY_DENSITY_LABELS: Record<BodyDensity, string> = {
  LOW:         "Cuerpo ligero",
  MEDIUM_LOW:  "Ligero-Medio",
  MEDIUM:      "Cuerpo medio",
  MEDIUM_HIGH: "Medio-Pleno",
  HIGH:        "Cuerpo pleno",
};

const TANNIN_LEVEL_LABELS: Record<WineSensoryLevel, string> = {
  LOW:    "bajos",
  MEDIUM: "medios",
  HIGH:   "altos",
};

const ACIDITY_LEVEL_LABELS: Record<WineSensoryLevel, string> = {
  LOW:    "baja",
  MEDIUM: "media",
  HIGH:   "alta",
};

function ProductCard({ product }: { product: Product }) {
  const typeLabel =
    product.whiskyType ? WHISKY_TYPE_LABELS[product.whiskyType] :
    product.wineType   ? WINE_TYPE_LABELS[product.wineType]     :
    product.beerStyle  ? product.beerStyle                       :
    null;

  const grapeList = product.grapes?.map((g) =>
    g.percentage ? `${g.grape} ${g.percentage}%` : g.grape
  ).join(" · ");

  return (
    <article className="product-card">
      {product.imageUrl ? (
        <ZoomableCoverImg
          className="product-card__image product-card__image--zoomable"
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          loading="lazy"
        />
      ) : null}

      <div className="product-card__body">
        <header className="product-card__header">
          <p className="product-card__brand">{product.brand}</p>
          <h3 className="product-card__name">{product.name}</h3>

          <div className="product-card__badges">
            {typeLabel ? (
              <span className="product-badge product-badge--type">{typeLabel}</span>
            ) : null}
            {product.abv ? (
              <span className="product-badge">{product.abv}% ABV</span>
            ) : null}
            {product.ageStatement ? (
              <span className="product-badge">{product.ageStatement} años</span>
            ) : null}
            {product.isPeated ? (
              <span className="product-badge product-badge--peated">Ahumado</span>
            ) : null}
            {product.vintage ? (
              <span className="product-badge">Cosecha {product.vintage}</span>
            ) : null}
            {product.oakAging === true ? (
              <span className="product-badge">Barrica</span>
            ) : null}
            {product.isOrganic === true ? (
              <span className="product-badge product-badge--organic">Orgánico</span>
            ) : null}
            {product.bodyDensity ? (
              <span className="product-badge product-badge--body">{BODY_DENSITY_LABELS[product.bodyDensity]}</span>
            ) : null}
            {product.priceRange ? (
              <span className="product-badge product-badge--price">{product.priceRange}</span>
            ) : null}
          </div>
        </header>

        {product.shortDescription ? (
          <p className="product-card__description product-card__description--short">
            <GlossaryText text={product.shortDescription} />
          </p>
        ) : null}
        {product.longDescription ? (
          <p className="product-card__description">
            <GlossaryText text={product.longDescription} />
          </p>
        ) : null}

        {product.tastingColor || (product.tastingNose?.length ?? 0) > 0 || (product.tastingPalate?.length ?? 0) > 0 ? (
          <dl className="product-card__tasting">
            {product.tastingColor ? (
              <>
                <dt>Color</dt>
                <dd>
                  <GlossaryText text={product.tastingColor} />
                </dd>
              </>
            ) : null}
            {(product.tastingNose?.length ?? 0) > 0 ? (
              <>
                <dt>Nariz</dt>
                <dd>
                  <GlossaryText text={product.tastingNose!.join(" · ")} />
                </dd>
              </>
            ) : null}
            {(product.tastingPalate?.length ?? 0) > 0 ? (
              <>
                <dt>Paladar</dt>
                <dd>
                  <GlossaryText text={product.tastingPalate!.join(" · ")} />
                </dd>
              </>
            ) : null}
            {product.tastingFinish ? (
              <>
                <dt>Final</dt>
                <dd>
                  <GlossaryText text={product.tastingFinish} />
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {grapeList ? (
          <p className="product-card__grapes">
            <strong>Cepas:</strong> <GlossaryText text={grapeList} />
          </p>
        ) : null}

        {product.varietal ? (
          <p className="product-card__grapes">
            <strong>Varietal:</strong> <GlossaryText text={product.varietal} />
          </p>
        ) : null}

        {product.tanninLevel || product.acidityLevel ? (
          <p className="product-card__grapes">
            {product.tanninLevel ? (
              <>
                <strong>Taninos:</strong>{" "}
                <GlossaryText text={TANNIN_LEVEL_LABELS[product.tanninLevel]} />
              </>
            ) : null}
            {product.tanninLevel && product.acidityLevel ? " · " : null}
            {product.acidityLevel ? (
              <>
                <strong>Acidez:</strong>{" "}
                <GlossaryText text={ACIDITY_LEVEL_LABELS[product.acidityLevel]} />
              </>
            ) : null}
          </p>
        ) : null}

        {product.servingSuggestion || product.mixingRatio ? (
          <dl className="product-card__serving">
            {product.servingSuggestion ? (
              <>
                <dt>Servir</dt>
                <dd>
                  <GlossaryText text={product.servingSuggestion} />
                </dd>
              </>
            ) : null}
            {product.mixingRatio ? (
              <>
                <dt>Mezcla</dt>
                <dd>
                  <GlossaryText text={product.mixingRatio} />
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}

        {(product.pairings?.length ?? 0) > 0 ? (
          <p className="product-card__pairings">
            <strong>Maridaje:</strong> <GlossaryText text={product.pairings!.join(", ")} />
          </p>
        ) : null}

        {(product.tags?.length ?? 0) > 0 ? (
          <ul className="product-card__tags">
            {product.tags!.map((tag) => (
              <li key={tag} className="product-tag">
                <GlossaryText text={tag} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function ProductsSection({ products, title }: { products: Product[]; title: string }) {
  if (products.length === 0) return null;

  return (
    <section className="detail__section detail__section--products">
      <h2 className="section-title">{title}</h2>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CategoryPage() {
  const { id, subId } = useParams<{ id: string; subId?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [guide, setGuide] = useState<GuideDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTabSlug, setActiveTabSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }

    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setProducts([]);

      try {
        const [nextCategory, nextGuide] = await Promise.all([
          getCategoryBySlug(id),
          getGuideByCategorySlug(id),
        ]);

        if (!active) {
          return;
        }

        setCategory(nextCategory);
        setGuide(nextGuide);
        setActiveTabSlug(nextGuide?.tabs[0]?.slug ?? "");
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }

        setError(err instanceof Error ? err.message : "No se pudo cargar la ficha.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    void (async () => {
      try {
        const nextProducts = await getProducts({ categorySlug: id });
        if (active) {
          setProducts(nextProducts);
        }
      } catch {
        if (active) {
          setProducts([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const tabs = useMemo(() => guide?.tabs ?? [], [guide]);

  // Productos filtrados por subcategoría activa (subId) o todos los de la categoría
  const visibleProducts = useMemo(
    () => subId ? products.filter((p) => p.subcategorySlug === subId) : products,
    [products, subId],
  );
  const subcategories = useMemo(() => (guide ? getGuideSubcategories(guide) : []), [guide]);
  const tabsWithoutSubcategories = useMemo(() => (guide ? getTabsWithoutSubcategories(guide) : tabs), [guide, tabs]);
  const selectedSubcategory = useMemo(() => {
    if (!subId) {
      return null;
    }

    return subcategories.find((subcategory) => subcategory.slug === subId) ?? null;
  }, [subcategories, subId]);
  const selectedSubcategorySection = selectedSubcategory?.tab.sections[0] ?? null;
  const supportsSubcategories =
    category?.slug === "destilados" ||
    category?.slug === "aperitivos" ||
    category?.slug === "cerveza" ||
    category?.slug === "vino" ||
    category?.slug === "licores";
  const detailImageUrl = selectedSubcategorySection?.imageUrl ?? category?.imageUrl ?? "";
  const detailImageAlt = selectedSubcategorySection?.imageAlt ?? category?.imageAlt ?? "";
  const detailEyebrow = "Ficha";
  const detailTitle = category?.title ?? "";
  const detailSummary = category?.summary ?? "";
  const showDetailImage = Boolean(detailImageUrl) && !(category?.slug === "destilados" && Boolean(subId));
  const tabsToRender = useMemo(() => {
    if (!guide) {
      return [];
    }

    if (supportsSubcategories) {
      if (!subId) {
        return tabsWithoutSubcategories;
      }
      if (!selectedSubcategory) {
        return [];
      }
      if (guide.category.slug === "destilados") {
        return buildSpiritSubcategoryViewTabs(selectedSubcategory.tab);
      }
      if (guide.category.slug === "aperitivos") {
        return buildAperitifSubcategoryViewTabs(selectedSubcategory.tab);
      }
      if (guide.category.slug === "licores") {
        return buildAperitifSubcategoryViewTabs(selectedSubcategory.tab);
      }
      if (guide.category.slug === "vino") {
        return buildAperitifSubcategoryViewTabs(selectedSubcategory.tab);
      }
      return [selectedSubcategory.tab];
    }

    return tabs;
  }, [guide, selectedSubcategory, subId, supportsSubcategories, tabs, tabsWithoutSubcategories]);

  // Si hay productos visibles, agregamos una pestaña sintética "Productos" al final
  const tabsWithProducts = useMemo(() => {
    if (visibleProducts.length === 0) return tabsToRender;
    return [
      ...tabsToRender,
      {
        id: PRODUCTS_TAB_SLUG,
        slug: PRODUCTS_TAB_SLUG,
        label: `Productos (${visibleProducts.length})`,
        panelTitle: undefined,
        noteTitle: undefined,
        noteContent: undefined,
        semanticKey: undefined,
        classifications: [],
        sections: [],
        tables: [],
      } as GuideDetail["tabs"][number],
    ];
  }, [tabsToRender, visibleProducts]);

  const subcategoryDetailUsesTabs = Boolean(selectedSubcategory) && tabsWithProducts.length > 1;

  useEffect(() => {
    if (tabsWithProducts.length > 0 && !tabsWithProducts.some((tab) => tab.slug === activeTabSlug)) {
      setActiveTabSlug(tabsWithProducts[0].slug);
    }
  }, [activeTabSlug, tabsWithProducts]);

  if (notFound) {
    return <Navigate to="/404" replace />;
  }

  if (loading) {
    return (
      <article className="detail">
        <Link to="/" className="detail__back">
          ← Todas las categorías
        </Link>
        <p className="status-message">Cargando ficha...</p>
      </article>
    );
  }

  if (error || !category) {
    return (
      <article className="detail">
        <Link to="/" className="detail__back">
          ← Todas las categorías
        </Link>
        <p className="status-message status-message--error">
          {error ?? "No se pudo cargar la categoría."}
        </p>
      </article>
    );
  }

  /** Tras cambiar de ruta, el primer render puede conservar la categoría anterior hasta que corre el efecto. */
  const categoryMatchesRoute = category.slug === id;
  if (!categoryMatchesRoute) {
    return (
      <article className="detail">
        <Link to="/" className="detail__back">
          ← Todas las categorías
        </Link>
        <p className="status-message">Cargando ficha...</p>
      </article>
    );
  }

  if (!supportsSubcategories && subId) {
    return <Navigate to="/404" replace />;
  }

  if (supportsSubcategories && subId && !selectedSubcategory) {
    return <Navigate to="/404" replace />;
  }

  return (
    <article className="detail">
      <Link to="/" className="detail__back">
        ← Todas las categorías
      </Link>
      {showDetailImage ? (
        <ZoomableCoverImg
          className="detail__image detail__image--zoomable"
          src={detailImageUrl}
          alt={detailImageAlt}
          loading="eager"
          fetchPriority="high"
        />
      ) : null}
      <header className="detail__header">
        <p className="hero__eyebrow">{detailEyebrow}</p>
        <h1 className="hero__title detail__title">{detailTitle}</h1>
      </header>
      <p className="detail__summary">
        <GlossaryText text={detailSummary} />
      </p>
      {!selectedSubcategory ? (
        <dl className="detail__meta">
          <div>
            <dt>Graduación típica</dt>
            <dd>{category.abv}</dd>
          </div>
          <div>
            <dt>Origen / nota</dt>
            <dd>{category.origin}</dd>
          </div>
        </dl>
      ) : null}

      {guide && supportsSubcategories && !subId ? (
        <SubcategoryChooser guide={guide} />
      ) : null}

      {guide && supportsSubcategories && subId ? (
        <section className="detail__section detail__section--compact">
          <Link to={`/categoria/${category.slug}`} className="detail__back detail__back--subtle">
            {category.slug === "aperitivos"
              ? "← Volver a todos los aperitivos"
              : category.slug === "cerveza"
                ? "← Volver a todas las cervezas"
              : category.slug === "vino"
                ? "← Volver a todos los vinos"
              : category.slug === "licores"
                ? "← Volver a todos los licores"
                : "← Volver a todos los destilados"}
          </Link>
        </section>
      ) : null}

      {guide ? (
        <section className="detail__section">
          <h2 className="section-title">
            {supportsSubcategories && selectedSubcategory
              ? selectedSubcategory.label
              : guide.title}
          </h2>

          {tabsWithProducts.length > 1 ? (
            <div className="wine-tabs" role="tablist" aria-label={guide.title}>
              {tabsWithProducts.map((tab) => (
                <button
                  key={tab.id}
                  id={`guide-tab-${tab.slug}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTabSlug === tab.slug}
                  aria-controls={`guide-panel-${tab.slug}`}
                  className={
                    activeTabSlug === tab.slug
                      ? "wine-tabs__button wine-tabs__button--active"
                      : "wine-tabs__button"
                  }
                  onClick={() => setActiveTabSlug(tab.slug)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {activeTabSlug === PRODUCTS_TAB_SLUG ? (
            <ProductsSection
              products={visibleProducts}
              title={
                subId && selectedSubcategory
                  ? `Productos — ${selectedSubcategory.label}`
                  : `Productos — ${category.title}`
              }
            />
          ) : tabsWithProducts.length > 0 ? (
            <GuidePanel
              guide={{
                ...guide,
                tabs: tabsToRender,
              }}
              activeTabSlug={activeTabSlug}
              compactSingleSection={Boolean(selectedSubcategory) && !subcategoryDetailUsesTabs}
            />
          ) : supportsSubcategories ? (
            <p className="status-message status-message--error">
              {category.slug === "aperitivos"
                ? "No se encontró la subcategoría de aperitivo solicitada."
                : category.slug === "cerveza"
                  ? "No se encontró la subcategoría de cerveza solicitada."
                : category.slug === "vino"
                  ? "No se encontró la subcategoría de vino solicitada."
                : category.slug === "licores"
                  ? "No se encontró la subcategoría de licor solicitada."
                : "No se encontró la subcategoría de destilado solicitada."}
            </p>
          ) : null}
        </section>
      ) : (
        <aside className="detail__note detail__section">
          <h2 className="detail__subheading">Guía detallada en preparación</h2>
          <p>
            Esta categoría ya se sirve desde la API, pero todavía no tiene una guía ampliada como las
            de vino, cerveza o aperitivos.
          </p>
        </aside>
      )}

      <footer className="footer">
        <small>
          Ruta:{" "}
          <code className="detail__code">
            {subId ? `/categoria/${category.slug}/${subId}` : `/categoria/${category.slug}`}
          </code>
        </small>
      </footer>
    </article>
  );
}
