import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getCategories,
  getGuideByCategorySlug,
  getGuides,
  saveGuide,
} from "../../api/client";
import type {
  Category,
  GuideClassificationBlock,
  GuideClassificationInput,
  GuideDetail,
  GuideInput,
  GuideSectionInput,
  GuideSummary,
  GuideTableColumn,
  GuideTableInput,
  GuideTableRowInput,
  GuideTabInput,
} from "../../api/types";
import { GUIDE_SEMANTIC_SELECT_OPTIONS, isGuideSemanticKey } from "../../guideSemantics";

type GuideEditorBlock = "general" | "note" | "classifications" | "sections" | "tables";

function createClassificationBlock(kind: GuideClassificationBlock["kind"]): GuideClassificationBlock {
  switch (kind) {
    case "subtitle":
      return { kind: "subtitle", text: "" };
    case "paragraph":
      return { kind: "paragraph", text: "" };
    case "image":
      return { kind: "image", url: "", alt: "" };
    default:
      return { kind: "paragraph", text: "" };
  }
}

function classificationBlockHasContent(block: GuideClassificationBlock): boolean {
  if (block.kind === "subtitle" || block.kind === "paragraph") {
    return block.text.trim().length > 0;
  }
  return block.url.trim().length > 0;
}

function sanitizeClassificationBlocks(blocks: GuideClassificationBlock[]): GuideClassificationBlock[] {
  return blocks
    .filter(classificationBlockHasContent)
    .map((b) => {
      if (b.kind === "subtitle") {
        return { kind: "subtitle", text: b.text.trim() };
      }
      if (b.kind === "paragraph") {
        return { kind: "paragraph", text: b.text.trim() };
      }
      return { kind: "image", url: b.url.trim(), alt: b.alt.trim() };
    });
}

const tableColumnOptions: Array<GuideTableColumn["key"]> = [
  "term",
  "composition",
  "objective",
  "description",
  "reference",
  "abv",
];

function createEmptyGuide(category?: Category): GuideInput {
  return {
    title: category ? `Guia de ${category.title}` : "",
    type: "guide",
    tabs: [],
  };
}

function createEmptyTab(position: number): GuideTabInput {
  return {
    slug: "",
    label: "",
    position,
    panelTitle: "",
    noteTitle: "",
    noteContent: "",
    semanticKey: "",
    classifications: [],
    sections: [],
    tables: [],
  };
}

function createEmptyClassification(): GuideClassificationInput {
  return {
    slug: "",
    blocks: [createClassificationBlock("paragraph")],
    semanticKey: "",
  };
}

function createEmptySection(): GuideSectionInput {
  return {
    slug: "",
    title: "",
    subtitle: "",
    imageUrl: "",
    imageAlt: "",
    semanticKey: "",
    paragraphs: [""],
  };
}

function createEmptyTable(): GuideTableInput {
  return {
    slug: "",
    title: "",
    sectionSlug: "",
    semanticKey: "",
    columns: [
      { key: "term", label: "Termino" },
      { key: "description", label: "Descripcion" },
    ],
    rows: [createEmptyRow()],
  };
}

function createEmptyRow(): GuideTableRowInput {
  return {
    term: "",
    composition: "",
    objective: "",
    description: "",
    reference: "",
    abv: "",
    imageUrl: "",
    imageAlt: "",
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function emptyToUndefined(value?: string): string | undefined {
  const nextValue = value?.trim() ?? "";
  return nextValue.length > 0 ? nextValue : undefined;
}

function guideDetailToInput(detail: GuideDetail): GuideInput {
  return {
    title: detail.title,
    type: detail.type,
    tabs: detail.tabs.map((tab, index) => ({
      slug: tab.slug,
      label: tab.label,
      position: index,
      panelTitle: tab.panelTitle ?? "",
      noteTitle: tab.noteTitle ?? "",
      noteContent: tab.noteContent ?? "",
      semanticKey: tab.semanticKey ?? "",
      classifications: (tab.classifications ?? []).map((c) => ({
        slug: c.slug,
        blocks:
          Array.isArray(c.blocks) && c.blocks.length > 0
            ? c.blocks.map((b) => ({ ...b }))
            : [createClassificationBlock("paragraph")],
        semanticKey: c.semanticKey ?? "",
      })),
      sections: tab.sections.map((section) => ({
        slug: section.slug,
        title: section.title,
        subtitle: section.subtitle,
        imageUrl: section.imageUrl,
        imageAlt: section.imageAlt,
        semanticKey: section.semanticKey ?? "",
        paragraphs: [...section.paragraphs],
      })),
      tables: tab.tables.map((table) => ({
        slug: table.slug,
        title: table.title,
        sectionSlug: table.sectionSlug ?? "",
        semanticKey: table.semanticKey ?? "",
        columns: table.columns.map((column) => ({ ...column })),
        rows: table.rows.map((row) => ({
          term: row.term,
          composition: row.composition ?? "",
          objective: row.objective ?? "",
          description: row.description ?? "",
          reference: row.reference ?? "",
          abv: row.abv ?? "",
          imageUrl: row.imageUrl ?? "",
          imageAlt: row.imageAlt ?? "",
        })),
      })),
    })),
  };
}

function normalizeGuideForSave(guide: GuideInput): GuideInput {
  return {
    title: guide.title.trim(),
    type: guide.type.trim(),
    tabs: guide.tabs.map((tab, tabIndex) => ({
      slug: tab.slug.trim(),
      label: tab.label.trim(),
      position: tabIndex,
      panelTitle: emptyToUndefined(tab.panelTitle),
      noteTitle: emptyToUndefined(tab.noteTitle),
      noteContent: emptyToUndefined(tab.noteContent),
      semanticKey: emptyToUndefined(tab.semanticKey),
      classifications: (tab.classifications ?? [])
        .filter((c) => {
          const cleaned = sanitizeClassificationBlocks(c.blocks ?? []);
          return c.slug.trim().length > 0 && cleaned.length > 0;
        })
        .map((c) => ({
          slug: c.slug.trim(),
          blocks: sanitizeClassificationBlocks(c.blocks ?? []),
          semanticKey: emptyToUndefined(c.semanticKey),
        })),
      sections: tab.sections.map((section) => ({
        slug: section.slug.trim(),
        title: section.title.trim(),
        subtitle: section.subtitle.trim(),
        imageUrl: section.imageUrl.trim(),
        imageAlt: section.imageAlt.trim(),
        semanticKey: emptyToUndefined(section.semanticKey),
        paragraphs: section.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
      })),
      tables: tab.tables.map((table) => ({
        slug: table.slug.trim(),
        title: table.title.trim(),
        sectionSlug: emptyToUndefined(table.sectionSlug),
        semanticKey: emptyToUndefined(table.semanticKey),
        columns: table.columns.map((column) => ({
          key: column.key,
          label: column.label.trim(),
        })),
        rows: table.rows.map((row) => ({
          term: row.term.trim(),
          composition: emptyToUndefined(row.composition),
          objective: emptyToUndefined(row.objective),
          description: emptyToUndefined(row.description),
          reference: emptyToUndefined(row.reference),
          abv: emptyToUndefined(row.abv),
          imageUrl: emptyToUndefined(row.imageUrl),
          imageAlt: emptyToUndefined(row.imageAlt),
        })),
      })),
    })),
  };
}

function validateGuide(guide: GuideInput): string | null {
  if (guide.title.trim().length === 0 || guide.type.trim().length === 0) {
    return "La guia necesita titulo y tipo.";
  }

  const tabSlugs = new Set<string>();

  for (const [tabIndex, tab] of guide.tabs.entries()) {
    if (tab.slug.trim().length === 0 || tab.label.trim().length === 0) {
      return `La pestaña ${tabIndex + 1} necesita slug y etiqueta.`;
    }

    if (tabSlugs.has(tab.slug.trim())) {
      return `El slug de pestaña "${tab.slug}" esta repetido.`;
    }
    tabSlugs.add(tab.slug.trim());

    const tabSemantic = tab.semanticKey?.trim();
    if (tabSemantic && !isGuideSemanticKey(tabSemantic)) {
      return `La pestaña "${tab.label || tab.slug}" tiene un tipo semántico no válido.`;
    }

    const classificationSlugs = new Set<string>();
    for (const [cIndex, c] of (tab.classifications ?? []).entries()) {
      const cleaned = sanitizeClassificationBlocks(c.blocks ?? []);
      if (c.slug.trim().length === 0 && cleaned.length === 0) {
        continue;
      }
      if (c.slug.trim().length === 0 || cleaned.length === 0) {
        return `La clasificación ${cIndex + 1} de la pestaña "${tab.label || tab.slug}" necesita slug y al menos un bloque con contenido (subtítulo, párrafo o imagen), o déjala vacía.`;
      }
      if (classificationSlugs.has(c.slug.trim())) {
        return `El slug de clasificación "${c.slug}" está repetido en "${tab.label || tab.slug}".`;
      }
      classificationSlugs.add(c.slug.trim());
      const cSemantic = c.semanticKey?.trim();
      if (cSemantic && !isGuideSemanticKey(cSemantic)) {
        return `La clasificación "${c.slug}" tiene un tipo semántico no válido.`;
      }
    }

    const sectionSlugs = new Set<string>();
    for (const [sectionIndex, section] of tab.sections.entries()) {
      if (
        section.slug.trim().length === 0 ||
        section.title.trim().length === 0 ||
        section.imageUrl.trim().length === 0 ||
        section.imageAlt.trim().length === 0
      ) {
        return `La seccion ${sectionIndex + 1} de la pestaña ${tab.label || tab.slug} esta incompleta.`;
      }

      if (sectionSlugs.has(section.slug.trim())) {
        return `El slug de seccion "${section.slug}" esta repetido dentro de ${tab.label || tab.slug}.`;
      }
      sectionSlugs.add(section.slug.trim());

      const secSemantic = section.semanticKey?.trim();
      if (secSemantic && !isGuideSemanticKey(secSemantic)) {
        return `La seccion "${section.title || section.slug}" tiene un tipo semántico no válido.`;
      }
    }

    const tableSlugs = new Set<string>();
    const sectionSlugSet = new Set(tab.sections.map((s) => s.slug.trim()).filter(Boolean));
    for (const [tableIndex, table] of tab.tables.entries()) {
      if (table.slug.trim().length === 0 || table.title.trim().length === 0) {
        return `La tabla ${tableIndex + 1} de la pestaña ${tab.label || tab.slug} necesita slug y titulo.`;
      }

      const tableSectionHint = table.sectionSlug?.trim();
      if (tableSectionHint && !sectionSlugSet.has(tableSectionHint)) {
        return `La tabla "${table.title || table.slug}" usa la sección "${tableSectionHint}", que no existe en esta pestaña.`;
      }

      const tableSemantic = table.semanticKey?.trim();
      if (tableSemantic && !isGuideSemanticKey(tableSemantic)) {
        return `La tabla "${table.title || table.slug}" tiene un tipo semántico no válido.`;
      }

      if (table.columns.length === 0) {
        return `La tabla ${table.title || table.slug} debe tener al menos una columna.`;
      }

      if (tableSlugs.has(table.slug.trim())) {
        return `El slug de tabla "${table.slug}" esta repetido dentro de ${tab.label || tab.slug}.`;
      }
      tableSlugs.add(table.slug.trim());

      for (const column of table.columns) {
        if (column.label.trim().length === 0) {
          return `Hay columnas sin etiqueta en la tabla ${table.title || table.slug}.`;
        }
      }

      for (const [rowIndex, row] of table.rows.entries()) {
        if (row.term.trim().length === 0) {
          return `La fila ${rowIndex + 1} de la tabla ${table.title || table.slug} necesita el campo termino.`;
        }
      }
    }
  }

  return null;
}

export default function AdminGuidesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [guideSummaries, setGuideSummaries] = useState<GuideSummary[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
  const [guide, setGuide] = useState<GuideInput | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);
  const [activeSectionByTab, setActiveSectionByTab] = useState<Record<number, number>>({});
  const [activeClassificationByTab, setActiveClassificationByTab] = useState<Record<number, number>>({});
  const [activeEditorBlockByTab, setActiveEditorBlockByTab] = useState<
    Record<number, GuideEditorBlock | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === selectedCategorySlug) ?? null,
    [categories, selectedCategorySlug],
  );

  async function loadMetadata(preferredCategorySlug?: string) {
    setLoading(true);
    setError(null);

    try {
      const [nextCategories, nextGuideSummaries] = await Promise.all([getCategories(), getGuides()]);
      setCategories(nextCategories);
      setGuideSummaries(nextGuideSummaries);

      const nextCategorySlug =
        preferredCategorySlug && nextCategories.some((category) => category.slug === preferredCategorySlug)
          ? preferredCategorySlug
          : nextCategories[0]?.slug ?? "";

      setSelectedCategorySlug(nextCategorySlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las guias.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMetadata();
  }, []);

  useEffect(() => {
    if (!selectedCategorySlug) {
      setGuide(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setFeedback(null);

    void (async () => {
      try {
        const nextGuide = await getGuideByCategorySlug(selectedCategorySlug);
        if (!active) {
          return;
        }

        if (nextGuide) {
          setGuide(guideDetailToInput(nextGuide));
        } else {
          const category =
            categories.find((currentCategory) => currentCategory.slug === selectedCategorySlug) ?? undefined;
          setGuide(createEmptyGuide(category));
        }
        setActiveTabIndex(null);
        setActiveSectionByTab({});
        setActiveClassificationByTab({});
        setActiveEditorBlockByTab({});
        setDirty(false);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudo cargar la guia.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [categories, selectedCategorySlug]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  function updateGuide(mutator: (draft: GuideInput) => void) {
    setGuide((current) => {
      if (!current) {
        return current;
      }

      const next = structuredClone(current) as GuideInput;
      mutator(next);
      return next;
    });
    setDirty(true);
    setFeedback(null);
    setError(null);
  }

  async function reloadCurrentGuide() {
    if (!selectedCategorySlug) {
      return;
    }

    if (dirty) {
      const confirmed = window.confirm("Hay cambios sin guardar. Se perderan si recargas la guia.");
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const nextGuide = await getGuideByCategorySlug(selectedCategorySlug);
      if (nextGuide) {
        setGuide(guideDetailToInput(nextGuide));
      } else {
        setGuide(createEmptyGuide(selectedCategory ?? undefined));
      }
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recargar la guia.");
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(nextCategorySlug: string) {
    if (nextCategorySlug === selectedCategorySlug) {
      return;
    }

    if (dirty) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Si cambias de categoria, perderas las modificaciones actuales.",
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedCategorySlug(nextCategorySlug);
  }

  async function handleSaveGuide() {
    if (!selectedCategorySlug || !guide) {
      return;
    }

    const normalizedGuide = normalizeGuideForSave(guide);
    const validationMessage = validateGuide(normalizedGuide);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const savedGuide = await saveGuide(selectedCategorySlug, normalizedGuide);
      setGuide(guideDetailToInput(savedGuide));
      setFeedback("Guia guardada correctamente.");
      setDirty(false);
      await loadMetadata(selectedCategorySlug);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo guardar la guia.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header admin-page__header--compact">
        <p className="hero__eyebrow">Administracion</p>
        <h1 className="hero__title">Guias</h1>
        <p className="hero__lead">
          Edita la estructura completa de cada guia. El modo de tabla tipo cards se infiere cuando
          las filas incluyen imagenes.
        </p>
      </header>

      <div className="admin-two-column">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">Categorias con guia</h2>
          </div>

          {loading && categories.length === 0 ? <p className="status-message">Cargando guias...</p> : null}

          <ul className="admin-list">
            {categories.map((category) => {
              const summary = guideSummaries.find((item) => item.categorySlug === category.slug);

              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={
                      selectedCategorySlug === category.slug
                        ? "admin-list__button admin-list__button--active"
                        : "admin-list__button"
                    }
                    onClick={() => handleCategoryChange(category.slug)}
                  >
                    <span>{category.title}</span>
                    <small>{summary ? `${summary.tabsCount} pestañas` : "Sin guia"}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">
              {selectedCategory ? `Guia de ${selectedCategory.title}` : "Selecciona una categoria"}
            </h2>
            <div className="admin-actions admin-actions--compact">
              <label className="admin-field admin-field--inline">
                <span>Categoria</span>
                <select
                  value={selectedCategorySlug}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => void reloadCurrentGuide()}
                disabled={loading || !selectedCategorySlug}
              >
                Recargar
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() => void handleSaveGuide()}
                disabled={saving || !guide}
              >
                {saving ? "Guardando..." : "Guardar guia"}
              </button>
            </div>
          </div>

          {dirty ? <p className="status-message">Hay cambios sin guardar.</p> : null}
          {feedback ? <p className="status-message">{feedback}</p> : null}
          {error ? <p className="status-message status-message--error">{error}</p> : null}
          {loading && guide ? <p className="status-message">Actualizando datos...</p> : null}

          {guide ? (
            <div className="admin-editor">
              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Titulo de la guia</span>
                  <input
                    value={guide.title}
                    onChange={(event) => updateGuide((draft) => void (draft.title = event.target.value))}
                  />
                </label>
                <label className="admin-field">
                  <span>Tipo</span>
                  <input
                    value={guide.type}
                    onChange={(event) => updateGuide((draft) => void (draft.type = event.target.value))}
                  />
                </label>
              </div>

              <div className="admin-panel__header">
                <h3 className="admin-panel__title">Pestañas</h3>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() =>
                    updateGuide((draft) => {
                      draft.tabs.push(createEmptyTab(draft.tabs.length));
                    })
                  }
                >
                  Agregar pestaña
                </button>
              </div>

              {guide.tabs.length === 0 ? (
                <p className="status-message">Esta guia aun no tiene pestañas. Agrega la primera.</p>
              ) : null}

              <div className="admin-stack">
                {guide.tabs.map((tab, tabIndex) => {
                  const activeSectionIndex = Math.min(
                    activeSectionByTab[tabIndex] ?? 0,
                    Math.max(tab.sections.length - 1, 0),
                  );
                  const activeSection = tab.sections[activeSectionIndex];
                  const activeClassificationIndex = Math.min(
                    activeClassificationByTab[tabIndex] ?? 0,
                    Math.max(tab.classifications.length - 1, 0),
                  );
                  const activeClassification = tab.classifications[activeClassificationIndex];
                  const activeEditorBlock = activeEditorBlockByTab[tabIndex] ?? null;

                  return (
                  <details key={`${tab.slug}-${tabIndex}`} className="admin-block" open={activeTabIndex === tabIndex}>
                    <summary
                      className="admin-block__summary"
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveTabIndex((current) => (current === tabIndex ? null : tabIndex));
                      }}
                    >
                      <span>{tab.label.trim() || `Pestaña ${tabIndex + 1}`}</span>
                      <small>{tab.slug || "sin-slug"}</small>
                    </summary>

                    {activeTabIndex === tabIndex ? (
                    <div className="admin-block__body">
                      <div className="admin-toolbar">
                        <button
                          type="button"
                          className="admin-button admin-button--ghost"
                          onClick={() =>
                            updateGuide((draft) => {
                              draft.tabs = moveItem(draft.tabs, tabIndex, tabIndex - 1);
                            })
                          }
                          disabled={tabIndex === 0}
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button--ghost"
                          onClick={() =>
                            updateGuide((draft) => {
                              draft.tabs = moveItem(draft.tabs, tabIndex, tabIndex + 1);
                            })
                          }
                          disabled={tabIndex === guide.tabs.length - 1}
                        >
                          Bajar
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button--danger"
                          onClick={() =>
                            updateGuide((draft) => {
                              draft.tabs.splice(tabIndex, 1);
                            })
                          }
                        >
                          Eliminar pestaña
                        </button>
                      </div>

                      <div className="admin-editor-selector" role="tablist" aria-label="Bloques editables de la pestaña">
                        {([
                          ["general", "General"],
                          ["note", "Nota"],
                          ["classifications", "Clasificaciones"],
                          ["sections", "Secciones"],
                          ["tables", "Tablas"],
                        ] as Array<[GuideEditorBlock, string]>).map(([blockId, label]) => (
                          <button
                            key={blockId}
                            type="button"
                            role="tab"
                            aria-selected={activeEditorBlock === blockId}
                            className={
                              activeEditorBlock === blockId
                                ? "admin-editor-selector__button admin-editor-selector__button--active"
                                : "admin-editor-selector__button"
                            }
                            onClick={() =>
                              setActiveEditorBlockByTab((current) => ({
                                ...current,
                                [tabIndex]: blockId,
                              }))
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {activeEditorBlock === "classifications" && tab.classifications.length > 0 ? (
                        <div className="admin-subsection admin-subsection--top">
                          <div className="admin-panel__header">
                            <h4 className="admin-subsection__title">Clasificaciones</h4>
                          </div>
                          <div
                            className="admin-section-selector"
                            role="tablist"
                            aria-label="Bloques de clasificación de la pestaña"
                          >
                            {tab.classifications.map((c, cIdx) => (
                              <button
                                key={`top-cl-${c.slug}-${cIdx}`}
                                type="button"
                                role="tab"
                                aria-selected={cIdx === activeClassificationIndex}
                                className={
                                  cIdx === activeClassificationIndex
                                    ? "admin-section-selector__button admin-section-selector__button--active"
                                    : "admin-section-selector__button"
                                }
                                onClick={() =>
                                  setActiveClassificationByTab((current) => ({
                                    ...current,
                                    [tabIndex]: cIdx,
                                  }))
                                }
                              >
                                <span>{c.slug.trim() || `Clasificación ${cIdx + 1}`}</span>
                                <small>{c.slug || "sin-slug"}</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activeEditorBlock === "sections" && tab.sections.length > 0 ? (
                        <div className="admin-subsection admin-subsection--top">
                          <div className="admin-panel__header">
                            <h4 className="admin-subsection__title">Secciones</h4>
                          </div>
                          <div className="admin-section-selector" role="tablist" aria-label="Secciones de la pestaña">
                            {tab.sections.map((section, sectionIndex) => (
                              <button
                                key={`top-${section.slug}-${sectionIndex}`}
                                type="button"
                                role="tab"
                                aria-selected={sectionIndex === activeSectionIndex}
                                className={
                                  sectionIndex === activeSectionIndex
                                    ? "admin-section-selector__button admin-section-selector__button--active"
                                    : "admin-section-selector__button"
                                }
                                onClick={() =>
                                  setActiveSectionByTab((current) => ({
                                    ...current,
                                    [tabIndex]: sectionIndex,
                                  }))
                                }
                              >
                                <span>{section.title.trim() || `Seccion ${sectionIndex + 1}`}</span>
                                <small>{section.slug || "sin-slug"}</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activeEditorBlock === null ? (
                        <p className="status-message">Selecciona un bloque arriba para editar esta pestaña.</p>
                      ) : null}

                      {activeEditorBlock === "general" ? (
                        <>
                          <div className="admin-form__grid">
                            <label className="admin-field">
                              <span>Slug</span>
                              <input
                                value={tab.slug}
                                onChange={(event) =>
                                  updateGuide((draft) => {
                                    draft.tabs[tabIndex].slug = event.target.value;
                                  })
                                }
                              />
                            </label>
                            <label className="admin-field">
                              <span>Etiqueta</span>
                              <input
                                value={tab.label}
                                onChange={(event) =>
                                  updateGuide((draft) => {
                                    draft.tabs[tabIndex].label = event.target.value;
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="admin-form__grid">
                            <label className="admin-field">
                              <span>Titulo de panel</span>
                              <input
                                value={tab.panelTitle ?? ""}
                                onChange={(event) =>
                                  updateGuide((draft) => {
                                    draft.tabs[tabIndex].panelTitle = event.target.value;
                                  })
                                }
                              />
                            </label>
                          </div>

                          <label className="admin-field admin-field--full">
                            <span>Tipo semántico de la pestaña (vino, destilados, licores…)</span>
                            <select
                              value={tab.semanticKey?.trim() ?? ""}
                              onChange={(event) =>
                                updateGuide((draft) => {
                                  draft.tabs[tabIndex].semanticKey = event.target.value;
                                })
                              }
                            >
                              {GUIDE_SEMANTIC_SELECT_OPTIONS.map((opt) => (
                                <option key={opt.value || "__none__"} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <small className="admin-field__hint">
                              Opcional. Misma lista para todas las categorías: sirve para enlazar conceptos (origen, tragos,
                              tipos…) aunque el título visible sea distinto.
                            </small>
                          </label>
                        </>
                      ) : null}

                      {activeEditorBlock === "note" ? (
                        <>
                          <div className="admin-form__grid">
                            <label className="admin-field">
                              <span>Titulo de nota</span>
                              <input
                                value={tab.noteTitle ?? ""}
                                onChange={(event) =>
                                  updateGuide((draft) => {
                                    draft.tabs[tabIndex].noteTitle = event.target.value;
                                  })
                                }
                              />
                            </label>
                          </div>

                          <label className="admin-field">
                            <span>Contenido de nota</span>
                            <textarea
                              rows={5}
                              value={tab.noteContent ?? ""}
                              onChange={(event) =>
                                updateGuide((draft) => {
                                  draft.tabs[tabIndex].noteContent = event.target.value;
                                })
                              }
                            />
                          </label>
                        </>
                      ) : null}

                      {activeEditorBlock === "classifications" ? (
                        <div className="admin-subsection">
                          <div className="admin-panel__header">
                            <h4 className="admin-subsection__title">Clasificaciones (marco introductorio)</h4>
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              onClick={() => {
                                setActiveClassificationByTab((current) => ({
                                  ...current,
                                  [tabIndex]: tab.classifications.length,
                                }));
                                updateGuide((draft) => {
                                  draft.tabs[tabIndex].classifications.push(createEmptyClassification());
                                });
                              }}
                            >
                              Agregar clasificación
                            </button>
                          </div>
                          <p className="admin-field__hint">
                            Bloques con subtítulo, un texto e imagen opcional. En la guía pública se muestran antes de las
                            secciones (tarjetas con título).
                          </p>

                          {tab.classifications.length === 0 ? (
                            <p className="status-message">Esta pestaña aún no tiene bloques de clasificación.</p>
                          ) : (
                            <div className="admin-stack">
                              <div
                                className="admin-section-selector"
                                role="tablist"
                                aria-label="Clasificaciones de la pestaña"
                              >
                                {tab.classifications.map((c, cIdx) => (
                                  <button
                                    key={`cl-${c.slug}-${cIdx}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={cIdx === activeClassificationIndex}
                                    className={
                                      cIdx === activeClassificationIndex
                                        ? "admin-section-selector__button admin-section-selector__button--active"
                                        : "admin-section-selector__button"
                                    }
                                    onClick={() =>
                                      setActiveClassificationByTab((current) => ({
                                        ...current,
                                        [tabIndex]: cIdx,
                                      }))
                                    }
                                  >
                                    <span>{c.slug.trim() || `Clasificación ${cIdx + 1}`}</span>
                                    <small>{c.slug || "sin-slug"}</small>
                                  </button>
                                ))}
                              </div>

                              {activeClassification ? (
                                <div className="admin-nested admin-nested--active" role="tabpanel">
                                  <div className="admin-nested__summary">
                                    <span>{activeClassification.slug.trim() || `Clasificación ${activeClassificationIndex + 1}`}</span>
                                    <small>{activeClassification.slug || "sin-slug"}</small>
                                  </div>
                                  <div className="admin-nested__body">
                                    <div className="admin-toolbar">
                                      <button
                                        type="button"
                                        className="admin-button admin-button--ghost"
                                        onClick={() =>
                                          updateGuide((draft) => {
                                            draft.tabs[tabIndex].classifications = moveItem(
                                              draft.tabs[tabIndex].classifications,
                                              activeClassificationIndex,
                                              activeClassificationIndex - 1,
                                            );
                                          })
                                        }
                                        disabled={activeClassificationIndex === 0}
                                      >
                                        Subir
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-button admin-button--ghost"
                                        onClick={() =>
                                          updateGuide((draft) => {
                                            draft.tabs[tabIndex].classifications = moveItem(
                                              draft.tabs[tabIndex].classifications,
                                              activeClassificationIndex,
                                              activeClassificationIndex + 1,
                                            );
                                          })
                                        }
                                        disabled={activeClassificationIndex === tab.classifications.length - 1}
                                      >
                                        Bajar
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-button admin-button--danger"
                                        onClick={() => {
                                          setActiveClassificationByTab((current) => ({
                                            ...current,
                                            [tabIndex]: Math.max(0, activeClassificationIndex - 1),
                                          }));
                                          updateGuide((draft) => {
                                            draft.tabs[tabIndex].classifications.splice(activeClassificationIndex, 1);
                                          });
                                        }}
                                      >
                                        Eliminar
                                      </button>
                                    </div>

                                    <div className="admin-form__grid">
                                      <label className="admin-field">
                                        <span>Slug</span>
                                        <input
                                          value={activeClassification.slug}
                                          onChange={(event) =>
                                            updateGuide((draft) => {
                                              draft.tabs[tabIndex].classifications[activeClassificationIndex].slug =
                                                event.target.value;
                                            })
                                          }
                                        />
                                      </label>
                                    </div>

                                    <div className="admin-subsection">
                                      <div className="admin-panel__header">
                                        <h5 className="admin-subsection__title">
                                          Contenido (orden en la ficha pública)
                                        </h5>
                                        <div className="admin-toolbar">
                                          <button
                                            type="button"
                                            className="admin-button admin-button--secondary"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].classifications[
                                                  activeClassificationIndex
                                                ].blocks.push(createClassificationBlock("subtitle"));
                                              })
                                            }
                                          >
                                            + Subtítulo
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--secondary"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].classifications[
                                                  activeClassificationIndex
                                                ].blocks.push(createClassificationBlock("paragraph"));
                                              })
                                            }
                                          >
                                            + Párrafo
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--secondary"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].classifications[
                                                  activeClassificationIndex
                                                ].blocks.push(createClassificationBlock("image"));
                                              })
                                            }
                                          >
                                            + Imagen
                                          </button>
                                        </div>
                                      </div>

                                      <div className="admin-stack">
                                        {activeClassification.blocks.map((block, blockIndex) => (
                                          <div key={blockIndex} className="admin-row-card">
                                            <div className="admin-toolbar">
                                              <strong>
                                                {block.kind === "subtitle"
                                                  ? "Subtítulo"
                                                  : block.kind === "paragraph"
                                                    ? "Párrafo"
                                                    : "Imagen"}
                                              </strong>
                                              <div className="admin-toolbar__spacer" />
                                              <button
                                                type="button"
                                                className="admin-button admin-button--ghost"
                                                onClick={() =>
                                                  updateGuide((draft) => {
                                                    draft.tabs[tabIndex].classifications[
                                                      activeClassificationIndex
                                                    ].blocks = moveItem(
                                                      draft.tabs[tabIndex].classifications[
                                                        activeClassificationIndex
                                                      ].blocks,
                                                      blockIndex,
                                                      blockIndex - 1,
                                                    );
                                                  })
                                                }
                                                disabled={blockIndex === 0}
                                              >
                                                Subir
                                              </button>
                                              <button
                                                type="button"
                                                className="admin-button admin-button--ghost"
                                                onClick={() =>
                                                  updateGuide((draft) => {
                                                    draft.tabs[tabIndex].classifications[
                                                      activeClassificationIndex
                                                    ].blocks = moveItem(
                                                      draft.tabs[tabIndex].classifications[
                                                        activeClassificationIndex
                                                      ].blocks,
                                                      blockIndex,
                                                      blockIndex + 1,
                                                    );
                                                  })
                                                }
                                                disabled={
                                                  blockIndex === activeClassification.blocks.length - 1
                                                }
                                              >
                                                Bajar
                                              </button>
                                              <button
                                                type="button"
                                                className="admin-button admin-button--danger"
                                                onClick={() =>
                                                  updateGuide((draft) => {
                                                    draft.tabs[tabIndex].classifications[
                                                      activeClassificationIndex
                                                    ].blocks.splice(blockIndex, 1);
                                                  })
                                                }
                                              >
                                                Quitar
                                              </button>
                                            </div>
                                            {block.kind === "subtitle" ? (
                                              <input
                                                value={block.text}
                                                onChange={(event) =>
                                                  updateGuide((draft) => {
                                                    const b =
                                                      draft.tabs[tabIndex].classifications[
                                                        activeClassificationIndex
                                                      ].blocks[blockIndex];
                                                    if (b.kind === "subtitle") {
                                                      b.text = event.target.value;
                                                    }
                                                  })
                                                }
                                              />
                                            ) : null}
                                            {block.kind === "paragraph" ? (
                                              <textarea
                                                rows={3}
                                                value={block.text}
                                                onChange={(event) =>
                                                  updateGuide((draft) => {
                                                    const b =
                                                      draft.tabs[tabIndex].classifications[
                                                        activeClassificationIndex
                                                      ].blocks[blockIndex];
                                                    if (b.kind === "paragraph") {
                                                      b.text = event.target.value;
                                                    }
                                                  })
                                                }
                                              />
                                            ) : null}
                                            {block.kind === "image" ? (
                                              <div className="admin-form__grid">
                                                <label className="admin-field">
                                                  <span>URL</span>
                                                  <input
                                                    value={block.url}
                                                    onChange={(event) =>
                                                      updateGuide((draft) => {
                                                        const b =
                                                          draft.tabs[tabIndex].classifications[
                                                            activeClassificationIndex
                                                          ].blocks[blockIndex];
                                                        if (b.kind === "image") {
                                                          b.url = event.target.value;
                                                        }
                                                      })
                                                    }
                                                  />
                                                </label>
                                                <label className="admin-field">
                                                  <span>Texto alternativo</span>
                                                  <input
                                                    value={block.alt}
                                                    onChange={(event) =>
                                                      updateGuide((draft) => {
                                                        const b =
                                                          draft.tabs[tabIndex].classifications[
                                                            activeClassificationIndex
                                                          ].blocks[blockIndex];
                                                        if (b.kind === "image") {
                                                          b.alt = event.target.value;
                                                        }
                                                      })
                                                    }
                                                  />
                                                </label>
                                              </div>
                                            ) : null}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <label className="admin-field admin-field--full">
                                      <span>Tipo semántico (opcional)</span>
                                      <select
                                        value={activeClassification.semanticKey?.trim() ?? ""}
                                        onChange={(event) =>
                                          updateGuide((draft) => {
                                            draft.tabs[tabIndex].classifications[activeClassificationIndex].semanticKey =
                                              event.target.value;
                                          })
                                        }
                                      >
                                        {GUIDE_SEMANTIC_SELECT_OPTIONS.map((opt) => (
                                          <option key={opt.value || "__none__"} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {activeEditorBlock === "sections" ? (
                      <div className="admin-subsection">
                        <div className="admin-panel__header">
                          <h4 className="admin-subsection__title">Secciones</h4>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => {
                              setActiveSectionByTab((current) => ({
                                ...current,
                                [tabIndex]: tab.sections.length,
                              }));
                              updateGuide((draft) => {
                                draft.tabs[tabIndex].sections.push(createEmptySection());
                              });
                            }}
                          >
                            Agregar seccion
                          </button>
                        </div>

                        {tab.sections.length === 0 ? (
                          <p className="status-message">Esta pestaña todavía no tiene secciones.</p>
                        ) : (
                          <div className="admin-stack">
                            <div className="admin-section-selector" role="tablist" aria-label="Secciones de la pestaña">
                              {tab.sections.map((section, sectionIndex) => (
                                <button
                                  key={`${section.slug}-${sectionIndex}`}
                                  type="button"
                                  role="tab"
                                  aria-selected={sectionIndex === activeSectionIndex}
                                  className={
                                    sectionIndex === activeSectionIndex
                                      ? "admin-section-selector__button admin-section-selector__button--active"
                                      : "admin-section-selector__button"
                                  }
                                  onClick={() =>
                                    setActiveSectionByTab((current) => ({
                                      ...current,
                                      [tabIndex]: sectionIndex,
                                    }))
                                  }
                                >
                                  <span>{section.title.trim() || `Seccion ${sectionIndex + 1}`}</span>
                                  <small>{section.slug || "sin-slug"}</small>
                                </button>
                              ))}
                            </div>

                            {activeSection ? (
                              <div className="admin-nested admin-nested--active" role="tabpanel">
                                <div className="admin-nested__summary">
                                  <span>{activeSection.title.trim() || `Seccion ${activeSectionIndex + 1}`}</span>
                                  <small>{activeSection.slug || "sin-slug"}</small>
                                </div>
                                <div className="admin-nested__body">
                                <div className="admin-toolbar">
                                  <button
                                    type="button"
                                    className="admin-button admin-button--ghost"
                                    onClick={() =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].sections = moveItem(
                                          draft.tabs[tabIndex].sections,
                                          activeSectionIndex,
                                          activeSectionIndex - 1,
                                        );
                                      })
                                    }
                                    disabled={activeSectionIndex === 0}
                                  >
                                    Subir
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-button admin-button--ghost"
                                    onClick={() =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].sections = moveItem(
                                          draft.tabs[tabIndex].sections,
                                          activeSectionIndex,
                                          activeSectionIndex + 1,
                                        );
                                      })
                                    }
                                    disabled={activeSectionIndex === tab.sections.length - 1}
                                  >
                                    Bajar
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-button admin-button--danger"
                                    onClick={() => {
                                      setActiveSectionByTab((current) => ({
                                        ...current,
                                        [tabIndex]: Math.max(0, activeSectionIndex - 1),
                                      }));
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].sections.splice(activeSectionIndex, 1);
                                      });
                                    }}
                                  >
                                    Eliminar seccion
                                  </button>
                                </div>

                                <div className="admin-form__grid">
                                  <label className="admin-field">
                                    <span>Slug</span>
                                    <input
                                      value={activeSection.slug}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].sections[activeSectionIndex].slug = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="admin-field">
                                    <span>Titulo</span>
                                    <input
                                      value={activeSection.title}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].sections[activeSectionIndex].title = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                </div>

                                <label className="admin-field admin-field--full">
                                  <span>Tipo semántico de la sección</span>
                                  <select
                                    value={activeSection.semanticKey?.trim() ?? ""}
                                    onChange={(event) =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].sections[activeSectionIndex].semanticKey =
                                          event.target.value;
                                      })
                                    }
                                  >
                                    {GUIDE_SEMANTIC_SELECT_OPTIONS.map((opt) => (
                                      <option key={opt.value || "__none__"} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="admin-field">
                                  <span>Subtitulo</span>
                                  <input
                                    value={activeSection.subtitle}
                                    onChange={(event) =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].sections[activeSectionIndex].subtitle = event.target.value;
                                      })
                                    }
                                  />
                                </label>

                                <div className="admin-form__grid">
                                  <label className="admin-field">
                                    <span>URL de imagen</span>
                                    <input
                                      value={activeSection.imageUrl}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].sections[activeSectionIndex].imageUrl = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="admin-field">
                                    <span>Alt de imagen</span>
                                    <input
                                      value={activeSection.imageAlt}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].sections[activeSectionIndex].imageAlt = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                </div>

                                <div className="admin-subsection">
                                  <div className="admin-panel__header">
                                    <h5 className="admin-subsection__title">Parrafos</h5>
                                    <button
                                      type="button"
                                      className="admin-button admin-button--secondary"
                                      onClick={() =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs.push("");
                                        })
                                      }
                                    >
                                      Agregar parrafo
                                    </button>
                                  </div>

                                  <div className="admin-stack">
                                    {activeSection.paragraphs.map((paragraph, paragraphIndex) => (
                                      <div key={paragraphIndex} className="admin-row-card">
                                        <div className="admin-toolbar">
                                          <strong>Parrafo {paragraphIndex + 1}</strong>
                                          <div className="admin-toolbar__spacer" />
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs = moveItem(
                                                  draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs,
                                                  paragraphIndex,
                                                  paragraphIndex - 1,
                                                );
                                              })
                                            }
                                            disabled={paragraphIndex === 0}
                                          >
                                            Subir
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs = moveItem(
                                                  draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs,
                                                  paragraphIndex,
                                                  paragraphIndex + 1,
                                                );
                                              })
                                            }
                                            disabled={paragraphIndex === activeSection.paragraphs.length - 1}
                                          >
                                            Bajar
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--danger"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs.splice(
                                                  paragraphIndex,
                                                  1,
                                                );
                                              })
                                            }
                                          >
                                            Quitar
                                          </button>
                                        </div>
                                        <textarea
                                          rows={3}
                                          value={paragraph}
                                          onChange={(event) =>
                                            updateGuide((draft) => {
                                              draft.tabs[tabIndex].sections[activeSectionIndex].paragraphs[paragraphIndex] =
                                                event.target.value;
                                            })
                                          }
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      ) : null}

                      {activeEditorBlock === "tables" ? (
                      <div className="admin-subsection">
                        <div className="admin-panel__header">
                          <h4 className="admin-subsection__title">Tablas</h4>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() =>
                              updateGuide((draft) => {
                                draft.tabs[tabIndex].tables.push(createEmptyTable());
                              })
                            }
                          >
                            Agregar tabla
                          </button>
                        </div>

                        <div className="admin-stack">
                          {tab.tables.map((table, tableIndex) => (
                            <details key={`${table.slug}-${tableIndex}`} className="admin-nested" open>
                              <summary className="admin-nested__summary">
                                <span>{table.title.trim() || `Tabla ${tableIndex + 1}`}</span>
                                <small>{table.slug || "sin-slug"}</small>
                              </summary>
                              <div className="admin-nested__body">
                                <div className="admin-toolbar">
                                  <button
                                    type="button"
                                    className="admin-button admin-button--ghost"
                                    onClick={() =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].tables = moveItem(
                                          draft.tabs[tabIndex].tables,
                                          tableIndex,
                                          tableIndex - 1,
                                        );
                                      })
                                    }
                                    disabled={tableIndex === 0}
                                  >
                                    Subir
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-button admin-button--ghost"
                                    onClick={() =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].tables = moveItem(
                                          draft.tabs[tabIndex].tables,
                                          tableIndex,
                                          tableIndex + 1,
                                        );
                                      })
                                    }
                                    disabled={tableIndex === tab.tables.length - 1}
                                  >
                                    Bajar
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-button admin-button--danger"
                                    onClick={() =>
                                      updateGuide((draft) => {
                                        draft.tabs[tabIndex].tables.splice(tableIndex, 1);
                                      })
                                    }
                                  >
                                    Eliminar tabla
                                  </button>
                                </div>

                                <div className="admin-form__grid">
                                  <label className="admin-field">
                                    <span>Slug</span>
                                    <input
                                      value={table.slug}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].tables[tableIndex].slug = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="admin-field">
                                    <span>Titulo</span>
                                    <input
                                      value={table.title}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].tables[tableIndex].title = event.target.value;
                                        })
                                      }
                                    />
                                  </label>
                                  {tab.sections.length > 0 ? (
                                    <label className="admin-field admin-field--full">
                                      <span>Ubicación en ficha multipágina (destilados)</span>
                                      <select
                                        value={table.sectionSlug?.trim() ?? ""}
                                        onChange={(event) =>
                                          updateGuide((draft) => {
                                            draft.tabs[tabIndex].tables[tableIndex].sectionSlug =
                                              event.target.value;
                                          })
                                        }
                                      >
                                        <option value="">
                                          Al final: pestaña «Tablas y notas»
                                        </option>
                                        {tab.sections.map((section) => (
                                          <option key={section.slug} value={section.slug.trim()}>
                                            Junto a: {section.title.trim() || section.slug}
                                          </option>
                                        ))}
                                      </select>
                                      <small className="admin-field__hint">
                                        Si eliges una sección, la tabla se verá en esa pestaña (como en vino). Si la
                                        dejas en «Tablas y notas», se agrupa al final.
                                      </small>
                                    </label>
                                  ) : null}
                                  <label className="admin-field admin-field--full">
                                    <span>Tipo semántico de la tabla</span>
                                    <select
                                      value={table.semanticKey?.trim() ?? ""}
                                      onChange={(event) =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].tables[tableIndex].semanticKey = event.target.value;
                                        })
                                      }
                                    >
                                      {GUIDE_SEMANTIC_SELECT_OPTIONS.map((opt) => (
                                        <option key={opt.value || "__none__"} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <small className="admin-field__hint">
                                      Útil para tablas de tipos, tragos o clasificaciones: misma clave en vino, whisky o
                                      fernet.
                                    </small>
                                  </label>
                                </div>

                                <div className="admin-subsection">
                                  <div className="admin-panel__header">
                                    <h5 className="admin-subsection__title">Columnas</h5>
                                    <button
                                      type="button"
                                      className="admin-button admin-button--secondary"
                                      onClick={() =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].tables[tableIndex].columns.push({
                                            key: "description",
                                            label: "Nueva columna",
                                          });
                                        })
                                      }
                                    >
                                      Agregar columna
                                    </button>
                                  </div>
                                  <div className="admin-stack">
                                    {table.columns.map((column, columnIndex) => (
                                      <div key={`${column.key}-${columnIndex}`} className="admin-row-card">
                                        <div className="admin-toolbar">
                                          <strong>Columna {columnIndex + 1}</strong>
                                          <div className="admin-toolbar__spacer" />
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].columns = moveItem(
                                                  draft.tabs[tabIndex].tables[tableIndex].columns,
                                                  columnIndex,
                                                  columnIndex - 1,
                                                );
                                              })
                                            }
                                            disabled={columnIndex === 0}
                                          >
                                            Subir
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].columns = moveItem(
                                                  draft.tabs[tabIndex].tables[tableIndex].columns,
                                                  columnIndex,
                                                  columnIndex + 1,
                                                );
                                              })
                                            }
                                            disabled={columnIndex === table.columns.length - 1}
                                          >
                                            Bajar
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--danger"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].columns.splice(columnIndex, 1);
                                              })
                                            }
                                          >
                                            Quitar
                                          </button>
                                        </div>
                                        <div className="admin-form__grid">
                                          <label className="admin-field">
                                            <span>Clave</span>
                                            <select
                                              value={column.key}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].columns[columnIndex].key =
                                                    event.target.value as GuideTableColumn["key"];
                                                })
                                              }
                                            >
                                              {tableColumnOptions.map((option) => (
                                                <option key={option} value={option}>
                                                  {option}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                          <label className="admin-field">
                                            <span>Etiqueta</span>
                                            <input
                                              value={column.label}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].columns[columnIndex].label =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="admin-subsection">
                                  <div className="admin-panel__header">
                                    <h5 className="admin-subsection__title">Filas</h5>
                                    <button
                                      type="button"
                                      className="admin-button admin-button--secondary"
                                      onClick={() =>
                                        updateGuide((draft) => {
                                          draft.tabs[tabIndex].tables[tableIndex].rows.push(createEmptyRow());
                                        })
                                      }
                                    >
                                      Agregar fila
                                    </button>
                                  </div>

                                  <div className="admin-stack">
                                    {table.rows.map((row, rowIndex) => (
                                      <div key={rowIndex} className="admin-row-card">
                                        <div className="admin-toolbar">
                                          <strong>Fila {rowIndex + 1}</strong>
                                          <div className="admin-toolbar__spacer" />
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].rows = moveItem(
                                                  draft.tabs[tabIndex].tables[tableIndex].rows,
                                                  rowIndex,
                                                  rowIndex - 1,
                                                );
                                              })
                                            }
                                            disabled={rowIndex === 0}
                                          >
                                            Subir
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--ghost"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].rows = moveItem(
                                                  draft.tabs[tabIndex].tables[tableIndex].rows,
                                                  rowIndex,
                                                  rowIndex + 1,
                                                );
                                              })
                                            }
                                            disabled={rowIndex === table.rows.length - 1}
                                          >
                                            Bajar
                                          </button>
                                          <button
                                            type="button"
                                            className="admin-button admin-button--danger"
                                            onClick={() =>
                                              updateGuide((draft) => {
                                                draft.tabs[tabIndex].tables[tableIndex].rows.splice(rowIndex, 1);
                                              })
                                            }
                                          >
                                            Quitar
                                          </button>
                                        </div>

                                        <div className="admin-form__grid admin-form__grid--triple">
                                          <label className="admin-field">
                                            <span>Termino</span>
                                            <input
                                              value={row.term}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].term =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="admin-field">
                                            <span>Composicion</span>
                                            <input
                                              value={row.composition ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].composition =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="admin-field">
                                            <span>Objetivo</span>
                                            <input
                                              value={row.objective ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].objective =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                        </div>

                                        <div className="admin-form__grid admin-form__grid--triple">
                                          <label className="admin-field">
                                            <span>Descripcion</span>
                                            <input
                                              value={row.description ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].description =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="admin-field">
                                            <span>Referencia</span>
                                            <input
                                              value={row.reference ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].reference =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="admin-field">
                                            <span>ABV</span>
                                            <input
                                              value={row.abv ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].abv =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                        </div>

                                        <div className="admin-form__grid">
                                          <label className="admin-field">
                                            <span>URL de imagen</span>
                                            <input
                                              value={row.imageUrl ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].imageUrl =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                          <label className="admin-field">
                                            <span>Alt de imagen</span>
                                            <input
                                              value={row.imageAlt ?? ""}
                                              onChange={(event) =>
                                                updateGuide((draft) => {
                                                  draft.tabs[tabIndex].tables[tableIndex].rows[rowIndex].imageAlt =
                                                    event.target.value;
                                                })
                                              }
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                      ) : null}
                    </div>
                    ) : null}
                  </details>
                );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
