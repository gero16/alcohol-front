import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ApiError, getCategoryBySlug, getGuideByCategorySlug } from "../api/client";
import type {
  Category,
  GuideClassification,
  GuideClassificationBlock,
  GuideDetail,
  GuideTable,
  GuideTableColumn,
  GuideTableRow,
} from "../api/types";
import { ZoomableCoverImg, ZoomableImage } from "../components/ImageLightbox";
import { GlossaryText } from "../glossary";

const CLASSIFICATIONS_TABLE_LOCATION = "__clasificaciones__";
const SECTION_CONTENT_SUBTITLE_PREFIX = "__subtitle__:";

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

function getSectionPreviewText(paragraphs: string[]): string {
  let firstSubtitle = "";
  for (const paragraph of paragraphs) {
    const block = parseSectionContentBlock(paragraph);
    if (!block) {
      continue;
    }
    if (block.kind === "paragraph") {
      return block.text;
    }
    if (!firstSubtitle) {
      firstSubtitle = block.text;
    }
  }
  return firstSubtitle;
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
    <ZoomableImage
      className="classification-card__image"
      src={url}
      alt={block.alt.trim() || "Ilustración"}
      loading="lazy"
    />
  );
}

function isSpiritGuideTabSlug(slug: string): boolean {
  return slug.endsWith("-guia");
}

function toSpiritSubcategorySlug(tabSlug: string): string {
  return tabSlug.replace(/-guia$/, "");
}

function toSpiritDisplayLabel(label: string): string {
  return label.replace(/\s+desde\s+cero$/i, "");
}

function isAperitifSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "ejemplos" || slug === "marcas-y-estilos";
}

/** Secciones índice (tarjetas) bajo ejemplos / marcas-y-estilos; el slug puede enlazar a una pestaña propia. */
function getAperitifSubcategorySourceSections(guide: GuideDetail) {
  return guide.tabs
    .filter((tab) => isAperitifSubcategorySourceTabSlug(tab.slug))
    .flatMap((tab) => tab.sections);
}

function isWineSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "estilos";
}

function getWineSubcategorySourceSections(guide: GuideDetail) {
  return guide.tabs.filter((tab) => isWineSubcategorySourceTabSlug(tab.slug)).flatMap((tab) => tab.sections);
}

function isBeerSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "por-color";
}

function isLiqueurSubcategoryTabSlug(slug: string): boolean {
  return !["que-son", "elaboracion", "familias", "servicio", "ejemplos"].includes(slug);
}

type GuideSubcategory = {
  slug: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  previewText: string;
  tab: GuideDetail["tabs"][number];
};

function getGuideSubcategories(guide: GuideDetail): GuideSubcategory[] {
  if (guide.category.slug === "destilados") {
    return guide.tabs
      .filter((tab) => isSpiritGuideTabSlug(tab.slug))
      .map((tab) => {
        const previewSection = tab.sections[0];

        return {
          slug: toSpiritSubcategorySlug(tab.slug),
          label: toSpiritDisplayLabel(tab.label),
          subtitle: previewSection?.subtitle,
          imageUrl: previewSection?.imageUrl,
          imageAlt: previewSection?.imageAlt,
          previewText: previewSection ? getSectionPreviewText(previewSection.paragraphs) : tab.noteContent ?? "",
          tab,
        };
      });
  }

  if (guide.category.slug === "aperitivos") {
    return guide.tabs
      .filter((tab) => isAperitifSubcategorySourceTabSlug(tab.slug))
      .flatMap((sourceTab) =>
        sourceTab.sections.map((section) => {
          const dedicatedTab = guide.tabs.find((t) => t.slug === section.slug);
          const fallbackTab =
            sourceTab && !dedicatedTab
              ? {
                  ...sourceTab,
                  id: `${sourceTab.id}-${section.id}`,
                  slug: `${sourceTab.slug}-${section.slug}`,
                  label: section.title,
                  panelTitle: section.title,
                  sections: [section],
                  tables: [],
                  classifications: [],
                  noteTitle: undefined,
                  noteContent: undefined,
                }
              : null;

          return {
            slug: section.slug,
            label: dedicatedTab?.label ?? section.title,
            subtitle: section.subtitle,
            imageUrl: section.imageUrl,
            imageAlt: section.imageAlt,
            previewText: getSectionPreviewText(section.paragraphs),
            tab: dedicatedTab ?? fallbackTab ?? guide.tabs[0],
          };
        }),
      );
  }

  if (guide.category.slug === "vino") {
    return getWineSubcategorySourceSections(guide).map((section) => {
      const sourceTab = guide.tabs.find((tab) => isWineSubcategorySourceTabSlug(tab.slug));
      const dedicatedTab = guide.tabs.find((tab) => tab.slug === section.slug);
      const fallbackTab =
        sourceTab && !dedicatedTab
          ? {
              ...sourceTab,
              id: `${sourceTab.id}-${section.id}`,
              slug: `${sourceTab.slug}-${section.slug}`,
              label: section.title.replace(/^\d+\.\s*/, ""),
              panelTitle: section.title.replace(/^\d+\.\s*/, ""),
              sections: [section],
              tables: [],
              classifications: [],
              noteTitle: undefined,
              noteContent: undefined,
            }
          : null;

      return {
        slug: section.slug,
        label: section.title.replace(/^\d+\.\s*/, ""),
        subtitle: section.subtitle,
        imageUrl: section.imageUrl,
        imageAlt: section.imageAlt,
        previewText: getSectionPreviewText(section.paragraphs),
        tab: dedicatedTab ?? fallbackTab ?? guide.tabs[0],
      };
    });
  }

  if (guide.category.slug === "cerveza") {
    return guide.tabs
      .filter((tab) => isBeerSubcategorySourceTabSlug(tab.slug))
      .flatMap((tab) =>
        tab.sections.map((section) => ({
          slug: section.slug,
          label: section.title,
          subtitle: section.subtitle,
          imageUrl: section.imageUrl,
          imageAlt: section.imageAlt,
          previewText: getSectionPreviewText(section.paragraphs),
          tab: {
            ...tab,
            id: `${tab.id}-${section.id}`,
            slug: `${tab.slug}-${section.slug}`,
            label: section.title,
            panelTitle: section.title,
            sections: [section],
            tables: [],
            classifications: [],
            noteTitle: undefined,
            noteContent: undefined,
          },
        })),
      );
  }

  if (guide.category.slug === "licores") {
    return guide.tabs
      .filter((tab) => isLiqueurSubcategoryTabSlug(tab.slug))
      .map((tab) => {
        const previewSection = tab.sections[0];

        return {
          slug: tab.slug,
          label: tab.label,
          subtitle: previewSection?.subtitle,
          imageUrl: previewSection?.imageUrl,
          imageAlt: previewSection?.imageAlt,
          previewText: previewSection ? getSectionPreviewText(previewSection.paragraphs) : tab.noteContent ?? "",
          tab,
        };
      });
  }

  return [];
}

function getTabsWithoutSubcategories(guide: GuideDetail): GuideDetail["tabs"] {
  if (guide.category.slug === "destilados") {
    return guide.tabs.filter((tab) => !isSpiritGuideTabSlug(tab.slug));
  }

  if (guide.category.slug === "aperitivos") {
    const aperitifSubSlugs = new Set(getAperitifSubcategorySourceSections(guide).map((s) => s.slug));
    return guide.tabs.filter(
      (tab) => !isAperitifSubcategorySourceTabSlug(tab.slug) && !aperitifSubSlugs.has(tab.slug),
    );
  }

  if (guide.category.slug === "vino") {
    const wineSubcategorySlugs = new Set(getWineSubcategorySourceSections(guide).map((section) => section.slug));

    return guide.tabs.filter(
      (tab) => !isWineSubcategorySourceTabSlug(tab.slug) && !wineSubcategorySlugs.has(tab.slug),
    );
  }

  if (guide.category.slug === "cerveza") {
    return guide.tabs;
  }

  if (guide.category.slug === "licores") {
    return guide.tabs.filter((tab) => !isLiqueurSubcategoryTabSlug(tab.slug));
  }

  return guide.tabs;
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
  const renderField = (label: string, value?: string, isReference = false) =>
    value ? (
      <p className={isReference ? "classification-card__reference" : "classification-card__text"}>
        <strong>{label}: </strong>
        <GlossaryText text={value} />
      </p>
    ) : null;

  return (
    <div className="summary-table-wrap">
      {showTitle ? <h3 className="detail__subheading">{table.title}</h3> : null}
      <div className="classification-list">
        {table.rows.map((row) => (
          <article key={row.id} className="classification-card">
            {row.imageUrl ? (
              <ZoomableImage
                className="classification-card__image"
                src={row.imageUrl}
                alt={row.imageAlt ?? row.term}
                loading="lazy"
              />
            ) : null}
            <h3 className="classification-card__title">{row.term}</h3>
            {renderField("Ageing / Maturation", row.ageingMaturation)}
            {renderField("Distillation Method", row.distillationMethod)}
            {renderField("Perfil / Caracter", row.profileCharacter)}
            {renderField("Body", row.body)}
            {renderField("Intensidad", row.intensity)}
            {renderField("Bitterness (IBU)", row.bitternessIbu)}
            {renderField("Description", row.description)}
            {renderField("Notas", row.notes)}
            {renderField("Finish", row.finish)}
            {renderField("Region / Origin", row.regionOrigin)}
            {renderField("Visual / Color", row.visualColor)}
            {renderField("Tannins", row.tannins)}
            {renderField("Acidity", row.acidity)}
            {renderField("Composicion", row.composition)}
            {renderField("Objetivo", row.objective)}
            {renderField("ABV", row.abv)}
            {renderField("Reference", row.reference, true)}
            {renderField("Ejemplos", row.examples, true)}
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

            return (
            <article
              key={section.id}
              className={hideSectionHeader ? "classification-card classification-card--plain" : "classification-card"}
              data-section-semantic-key={section.semanticKey?.trim() || undefined}
            >
              {!hideSectionHeader ? (
                <ZoomableImage
                  className="classification-card__image"
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

export default function CategoryPage() {
  const { id, subId } = useParams<{ id: string; subId?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [guide, setGuide] = useState<GuideDetail | null>(null);
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

    return () => {
      active = false;
    };
  }, [id]);

  const tabs = useMemo(() => guide?.tabs ?? [], [guide]);
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
      return [selectedSubcategory.tab];
    }

    return tabs;
  }, [guide, selectedSubcategory, subId, supportsSubcategories, tabs, tabsWithoutSubcategories]);

  const subcategoryDetailUsesTabs = Boolean(selectedSubcategory) && tabsToRender.length > 1;

  useEffect(() => {
    if (tabsToRender.length > 0 && !tabsToRender.some((tab) => tab.slug === activeTabSlug)) {
      setActiveTabSlug(tabsToRender[0].slug);
    }
  }, [activeTabSlug, tabsToRender]);

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
        <ZoomableCoverImg className="detail__image detail__image--zoomable" src={detailImageUrl} alt={detailImageAlt} />
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

          {tabsToRender.length > 1 ? (
            <div className="wine-tabs" role="tablist" aria-label={guide.title}>
              {tabsToRender.map((tab) => (
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

          {tabsToRender.length > 0 ? (
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
