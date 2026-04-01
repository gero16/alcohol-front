import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createGlossaryItem,
  deleteGlossaryItem,
  getGlossary,
  updateGlossaryItem,
} from "../../api/client";
import type { GlossaryInput, GlossaryItem } from "../../api/types";

function getBlankGlossary(): GlossaryInput {
  return {
    slug: "",
    term: "",
    shortDefinition: "",
    details: [""],
    relatedCategories: [],
    featured: false,
  };
}

function toGlossaryInput(item: GlossaryItem): GlossaryInput {
  return {
    slug: item.slug,
    term: item.term,
    shortDefinition: item.shortDefinition,
    details: item.details.length > 0 ? [...item.details] : [""],
    relatedCategories: [...item.relatedCategories],
    featured: item.featured ?? false,
  };
}

function relatedCategoriesToString(slugs: string[]): string {
  return slugs.join(", ");
}

function parseRelatedCategories(value: string): string[] {
  return value
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => slug.length > 0);
}

function validateGlossary(input: GlossaryInput): string | null {
  if (!input.slug.trim()) {
    return "El slug es obligatorio.";
  }
  if (!input.term.trim()) {
    return "El termino es obligatorio.";
  }
  if (!input.shortDefinition.trim()) {
    return "La definicion corta es obligatoria.";
  }
  const details = input.details.map((d) => d.trim()).filter((d) => d.length > 0);
  if (details.length === 0) {
    return "Agrega al menos un parrafo en detalles.";
  }
  return null;
}

export default function AdminGlossaryPage() {
  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<GlossaryInput>(getBlankGlossary());
  const [relatedCategoriesText, setRelatedCategoriesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function loadGlossary(preferredSlug?: string | null) {
    setLoading(true);
    setError(null);

    try {
      const nextItems = await getGlossary();
      setItems(nextItems);

      if (nextItems.length === 0) {
        setSelectedSlug(null);
        setForm(getBlankGlossary());
        setRelatedCategoriesText("");
        return;
      }

      const nextSelectedSlug =
        preferredSlug && nextItems.some((item) => item.slug === preferredSlug)
          ? preferredSlug
          : nextItems[0].slug;

      const selected = nextItems.find((item) => item.slug === nextSelectedSlug) ?? nextItems[0];
      setSelectedSlug(selected.slug);
      setForm(toGlossaryInput(selected));
      setRelatedCategoriesText(relatedCategoriesToString(selected.relatedCategories));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el glosario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGlossary();
  }, []);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const selectedItem = useMemo(
    () => items.find((item) => item.slug === selectedSlug) ?? null,
    [items, selectedSlug],
  );

  function syncForm(next: GlossaryInput) {
    setForm(next);
    setRelatedCategoriesText(relatedCategoriesToString(next.relatedCategories));
  }

  function handleFieldChange<K extends keyof GlossaryInput>(field: K, value: GlossaryInput[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setDirty(true);
  }

  function handleDetailChange(index: number, value: string) {
    setForm((current) => ({
      ...current,
      details: current.details.map((line, i) => (i === index ? value : line)),
    }));
    setDirty(true);
  }

  function handleAddDetail() {
    setForm((current) => ({
      ...current,
      details: [...current.details, ""],
    }));
    setDirty(true);
  }

  function handleRemoveDetail(index: number) {
    setForm((current) => ({
      ...current,
      details: current.details.filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  function handleMoveDetail(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.details];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return current;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, details: next };
    });
    setDirty(true);
  }

  function handleSelectItem(item: GlossaryItem) {
    if (dirty) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Si cambias de termino, perderas esas modificaciones.",
      );
      if (!confirmed) {
        return;
      }
    }
    setSelectedSlug(item.slug);
    syncForm(toGlossaryInput(item));
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  function handleNewTerm() {
    if (dirty) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Si creas un termino nuevo, perderas las modificaciones actuales.",
      );
      if (!confirmed) {
        return;
      }
    }
    setSelectedSlug(null);
    setForm(getBlankGlossary());
    setRelatedCategoriesText("");
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const relatedCategories = parseRelatedCategories(relatedCategoriesText);
    const payload: GlossaryInput = {
      ...form,
      slug: form.slug.trim(),
      term: form.term.trim(),
      shortDefinition: form.shortDefinition.trim(),
      details: form.details.map((d) => d.trim()).filter((d) => d.length > 0),
      relatedCategories,
      featured: form.featured,
    };

    const validationMessage = validateGlossary(payload);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const saved = selectedSlug
        ? await updateGlossaryItem(selectedSlug, payload)
        : await createGlossaryItem(payload);

      setFeedback(selectedSlug ? "Termino actualizado correctamente." : "Termino creado.");
      await loadGlossary(saved.slug);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo guardar el termino.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) {
      return;
    }
    const confirmed = window.confirm(
      `Se eliminara el termino "${selectedItem.term}" (${selectedItem.slug}). Esta accion no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      await deleteGlossaryItem(selectedItem.slug);
      setFeedback("Termino eliminado.");
      await loadGlossary();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo eliminar el termino.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header admin-page__header--compact">
        <p className="hero__eyebrow">Administracion</p>
        <h1 className="hero__title">Glosario</h1>
        <p className="hero__lead">
          Crear, editar o eliminar terminos del glosario. Los detalles son parrafos que se muestran en
          la ficha publica.
        </p>
      </header>

      <div className="admin-two-column">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">Terminos</h2>
            <button type="button" className="admin-button admin-button--secondary" onClick={handleNewTerm}>
              Nuevo termino
            </button>
          </div>

          {loading ? <p className="status-message">Cargando glosario...</p> : null}
          {items.length > 0 ? (
            <ul className="admin-list">
              {items.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    className={
                      selectedSlug === item.slug
                        ? "admin-list__button admin-list__button--active"
                        : "admin-list__button"
                    }
                    onClick={() => handleSelectItem(item)}
                  >
                    <span>{item.term}</span>
                    <small>{item.slug}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="status-message">No hay terminos. Crea el primero con &quot;Nuevo termino&quot;.</p>
          ) : null}
        </aside>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">{selectedSlug ? "Editar termino" : "Crear termino"}</h2>
            {selectedItem ? (
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={() => void handleDelete()}
                disabled={saving}
              >
                Eliminar
              </button>
            ) : null}
          </div>

          {dirty ? <p className="status-message">Hay cambios sin guardar.</p> : null}
          {feedback ? <p className="status-message">{feedback}</p> : null}
          {error ? <p className="status-message status-message--error">{error}</p> : null}

          <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
            <label className="admin-field">
              <span>Slug (URL)</span>
              <input
                value={form.slug}
                onChange={(event) => handleFieldChange("slug", event.target.value)}
                placeholder="mosto"
              />
            </label>

            <label className="admin-field">
              <span>Termino</span>
              <input
                value={form.term}
                onChange={(event) => handleFieldChange("term", event.target.value)}
                placeholder="Mosto"
              />
            </label>

            <label className="admin-field">
              <span>Definicion corta</span>
              <textarea
                rows={3}
                value={form.shortDefinition}
                onChange={(event) => handleFieldChange("shortDefinition", event.target.value)}
              />
            </label>

            <div className="admin-subsection">
              <div className="admin-panel__header">
                <h3 className="admin-subsection__title">Detalles (parrafos)</h3>
                <button type="button" className="admin-button admin-button--secondary" onClick={handleAddDetail}>
                  Anadir parrafo
                </button>
              </div>
              <div className="admin-stack">
                {form.details.map((line, index) => (
                  <div key={index} className="admin-row-card">
                    <div className="admin-toolbar">
                      <div className="admin-toolbar__spacer" />
                      {form.details.length > 1 ? (
                        <>
                          <button
                            type="button"
                            className="admin-button admin-button--ghost"
                            onClick={() => handleMoveDetail(index, -1)}
                            disabled={index === 0}
                            title="Subir parrafo"
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--ghost"
                            onClick={() => handleMoveDetail(index, 1)}
                            disabled={index === form.details.length - 1}
                            title="Bajar parrafo"
                          >
                            Bajar
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--danger"
                            onClick={() => handleRemoveDetail(index)}
                          >
                            Quitar
                          </button>
                        </>
                      ) : null}
                    </div>
                    <label className="admin-field">
                      <span>Parrafo {index + 1}</span>
                      <textarea
                        rows={4}
                        value={line}
                        onChange={(event) => handleDetailChange(index, event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="admin-field">
              <span>Categorias relacionadas (slugs separados por coma)</span>
              <input
                value={relatedCategoriesText}
                onChange={(event) => {
                  setRelatedCategoriesText(event.target.value);
                  setDirty(true);
                }}
                placeholder="vino, cerveza, destilados"
              />
            </label>

            <label className="admin-field admin-field--inline">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => handleFieldChange("featured", event.target.checked)}
              />
              <span>Destacado en el glosario</span>
            </label>

            <div className="admin-actions">
              <button type="submit" className="admin-button" disabled={saving}>
                {saving ? "Guardando..." : selectedSlug ? "Guardar cambios" : "Crear termino"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
