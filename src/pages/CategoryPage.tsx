import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ApiError, getCategoryBySlug, getGuideByCategorySlug } from "../api/client";
import type { Category, GuideDetail, GuideTable, GuideTableColumn, GuideTableRow } from "../api/types";

function isSpiritGuideTabSlug(slug: string): boolean {
  return slug.endsWith("-guia");
}

function toSpiritSubcategorySlug(tabSlug: string): string {
  return tabSlug.replace(/-guia$/, "");
}

function toSpiritDisplayLabel(label: string): string {
  return label.replace(/\s+desde\s+cero$/i, "");
}

function getRowValue(row: GuideTableRow, column: GuideTableColumn): string {
  const value = row[column.key];
  return typeof value === "string" && value.length > 0 ? value : "Sin dato";
}

function DataTable({ table, showTitle = true }: { table: GuideTable; showTitle?: boolean }) {
  return (
    <div className="summary-table-wrap">
      {showTitle ? <h3 className="detail__subheading">{table.title}</h3> : null}
      <table className="summary-table">
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              {table.columns.map((column) => (
                <td key={`${row.id}-${column.key}`} data-label={column.label}>
                  {getRowValue(row, column)}
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
  return (
    <div className="summary-table-wrap">
      {showTitle ? <h3 className="detail__subheading">{table.title}</h3> : null}
      <div className="classification-list">
        {table.rows.map((row) => (
          <article key={row.id} className="classification-card">
            {row.imageUrl ? (
              <img
                className="classification-card__image"
                src={row.imageUrl}
                alt={row.imageAlt ?? row.term}
                loading="lazy"
              />
            ) : null}
            <h3 className="classification-card__title">{row.term}</h3>
            {row.description ? <p className="classification-card__text">{row.description}</p> : null}
            {row.composition ? <p className="classification-card__text">{row.composition}</p> : null}
            {row.objective ? <p className="classification-card__text">{row.objective}</p> : null}
            {row.reference ? (
              <p className="classification-card__reference">{row.reference}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function SpiritSubcategoryChooser({
  guide,
  activeSubcategorySlug,
}: {
  guide: GuideDetail;
  activeSubcategorySlug?: string;
}) {
  const spiritTabs = guide.tabs.filter((tab) => isSpiritGuideTabSlug(tab.slug));

  if (spiritTabs.length === 0) {
    return null;
  }

  return (
    <section className="detail__section">
      <h2 className="section-title">Subcategorías de destilados</h2>
      <div className="subcategory-grid">
        {spiritTabs.map((tab) => {
          const subcategorySlug = toSpiritSubcategorySlug(tab.slug);
          const previewSection = tab.sections[0];
          const previewText = previewSection?.paragraphs[0] ?? tab.noteContent ?? "";
          const isActive = activeSubcategorySlug === subcategorySlug;

          return (
            <Link
              key={tab.id}
              to={`/categoria/${guide.category.slug}/${subcategorySlug}`}
              className={isActive ? "subcategory-card subcategory-card--active" : "subcategory-card"}
            >
              {previewSection ? (
                <img
                  className="subcategory-card__image"
                  src={previewSection.imageUrl}
                  alt={previewSection.imageAlt}
                  loading="lazy"
                />
              ) : null}
              <h3 className="subcategory-card__title">{toSpiritDisplayLabel(tab.label)}</h3>
              {previewSection ? (
                <p className="subcategory-card__subtitle">{previewSection.subtitle}</p>
              ) : null}
              {previewText ? <p className="subcategory-card__text">{previewText}</p> : null}
              <span className="subcategory-card__link">
                {isActive ? "Subcategoría actual" : "Ver subcategoría →"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function GuidePanel({ guide, activeTabSlug }: { guide: GuideDetail; activeTabSlug: string }) {
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
    >
      {activeTab.panelTitle ? <h3 className="detail__subheading">{activeTab.panelTitle}</h3> : null}

      {activeTab.sections.length > 0 ? (
        <div className="classification-list">
          {activeTab.sections.map((section) => (
            <article key={section.id} className="classification-card">
              <img
                className="classification-card__image"
                src={section.imageUrl}
                alt={section.imageAlt}
                loading="lazy"
              />
              <h3 className="classification-card__title">{section.title}</h3>
              <p className="classification-card__subtitle">{section.subtitle}</p>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="classification-card__text">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </div>
      ) : null}

      {activeTab.tables.map((table) => {
        const showTitle = table.title !== activeTab.panelTitle;

        return table.displayMode === "cards" ? (
          <CardTable key={table.id} table={table} showTitle={showTitle} />
        ) : (
          <DataTable key={table.id} table={table} showTitle={showTitle} />
        );
      })}

      {activeTab.noteContent ? (
        <aside className="detail__note">
          <h3 className="detail__subheading">{activeTab.noteTitle ?? "Nota"}</h3>
          <p>{activeTab.noteContent}</p>
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
  const spiritTabs = useMemo(() => tabs.filter((tab) => isSpiritGuideTabSlug(tab.slug)), [tabs]);
  const generalTabs = useMemo(() => tabs.filter((tab) => !isSpiritGuideTabSlug(tab.slug)), [tabs]);
  const selectedSpiritTab = useMemo(() => {
    if (!subId) {
      return null;
    }

    return spiritTabs.find((tab) => toSpiritSubcategorySlug(tab.slug) === subId) ?? null;
  }, [spiritTabs, subId]);
  const selectedSpiritSection = selectedSpiritTab?.sections[0] ?? null;
  const detailImageUrl = selectedSpiritSection?.imageUrl ?? category?.imageUrl ?? "";
  const detailImageAlt = selectedSpiritSection?.imageAlt ?? category?.imageAlt ?? "";
  const detailEyebrow =
    category?.slug === "destilados" && selectedSpiritTab ? category.title : "Ficha";
  const detailTitle =
    category?.slug === "destilados" && selectedSpiritTab
      ? toSpiritDisplayLabel(selectedSpiritTab.label)
      : category?.title ?? "";
  const detailSummary =
    category?.slug === "destilados" && selectedSpiritTab
      ? selectedSpiritSection?.subtitle ?? selectedSpiritTab.noteContent ?? category?.summary ?? ""
      : category?.summary ?? "";
  const tabsToRender = useMemo(() => {
    if (!guide) {
      return [];
    }

    if (category?.slug === "destilados") {
      return subId ? (selectedSpiritTab ? [selectedSpiritTab] : []) : generalTabs;
    }

    return tabs;
  }, [category?.slug, generalTabs, guide, selectedSpiritTab, subId, tabs]);

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

  if (category.slug !== "destilados" && subId) {
    return <Navigate to="/404" replace />;
  }

  if (category.slug === "destilados" && subId && !selectedSpiritTab) {
    return <Navigate to="/404" replace />;
  }

  return (
    <article className="detail">
      <Link to="/" className="detail__back">
        ← Todas las categorías
      </Link>
      <img className="detail__image" src={detailImageUrl} alt={detailImageAlt} />
      <header className="detail__header">
        <p className="hero__eyebrow">{detailEyebrow}</p>
        <h1 className="hero__title detail__title">{detailTitle}</h1>
      </header>
      <p className="detail__summary">{detailSummary}</p>
      {!selectedSpiritTab ? (
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

      {guide && category.slug === "destilados" ? (
        <SpiritSubcategoryChooser guide={guide} activeSubcategorySlug={subId} />
      ) : null}

      {guide && category.slug === "destilados" && subId ? (
        <section className="detail__section detail__section--compact">
          <Link to={`/categoria/${category.slug}`} className="detail__back detail__back--subtle">
            ← Volver a todos los destilados
          </Link>
        </section>
      ) : null}

      {guide ? (
        <section className="detail__section">
          <h2 className="section-title">
            {category.slug === "destilados" && selectedSpiritTab
              ? toSpiritDisplayLabel(selectedSpiritTab.label)
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
            />
          ) : category.slug === "destilados" ? (
            <p className="status-message status-message--error">
              No se encontró la subcategoría de destilado solicitada.
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
