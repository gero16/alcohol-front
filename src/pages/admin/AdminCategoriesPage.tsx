import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../api/client";
import type { Category, CategoryInput } from "../../api/types";

function getBlankCategory(): CategoryInput {
  return {
    slug: "",
    position: 0,
    title: "",
    summary: "",
    abv: "",
    origin: "",
    imageUrl: "",
    imageAlt: "",
  };
}

function toCategoryInput(category: Category): CategoryInput {
  return {
    slug: category.slug,
    position: category.position,
    title: category.title,
    summary: category.summary,
    abv: category.abv,
    origin: category.origin,
    imageUrl: category.imageUrl,
    imageAlt: category.imageAlt,
  };
}

function validateCategory(input: CategoryInput): string | null {
  const requiredFields: Array<keyof CategoryInput> = [
    "slug",
    "title",
    "summary",
    "abv",
    "origin",
    "imageUrl",
    "imageAlt",
  ];

  for (const field of requiredFields) {
    if (String(input[field]).trim().length === 0) {
      return "Completa todos los campos obligatorios antes de guardar.";
    }
  }

  if (!Number.isFinite(input.position)) {
    return "La posicion debe ser un numero valido.";
  }

  return null;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryInput>(getBlankCategory());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function loadCategories(preferredSlug?: string | null) {
    setLoading(true);
    setError(null);

    try {
      const nextCategories = await getCategories();
      setCategories(nextCategories);

      if (nextCategories.length === 0) {
        setSelectedSlug(null);
        setForm(getBlankCategory());
        return;
      }

      const nextSelectedSlug =
        preferredSlug && nextCategories.some((category) => category.slug === preferredSlug)
          ? preferredSlug
          : nextCategories[0].slug;

      const selectedCategory =
        nextCategories.find((category) => category.slug === nextSelectedSlug) ?? nextCategories[0];

      setSelectedSlug(selectedCategory.slug);
      setForm(toCategoryInput(selectedCategory));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las categorias.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
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
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === selectedSlug) ?? null,
    [categories, selectedSlug],
  );

  function handleFieldChange<K extends keyof CategoryInput>(field: K, value: CategoryInput[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setDirty(true);
  }

  function handleSelectCategory(category: Category) {
    if (dirty) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Si cambias de categoria, perderas esas modificaciones.",
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedSlug(category.slug);
    setForm(toCategoryInput(category));
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  function handleNewCategory() {
    if (dirty) {
      const confirmed = window.confirm(
        "Hay cambios sin guardar. Si creas una nueva categoria, perderas las modificaciones actuales.",
      );
      if (!confirmed) {
        return;
      }
    }

    const suggestedPosition =
      categories.length > 0 ? Math.max(...categories.map((category) => category.position)) + 1 : 0;

    setSelectedSlug(null);
    setForm({
      ...getBlankCategory(),
      position: suggestedPosition,
    });
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const validationMessage = validateCategory(form);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const payload: CategoryInput = {
        ...form,
        slug: form.slug.trim(),
        title: form.title.trim(),
        summary: form.summary.trim(),
        abv: form.abv.trim(),
        origin: form.origin.trim(),
        imageUrl: form.imageUrl.trim(),
        imageAlt: form.imageAlt.trim(),
      };

      const savedCategory = selectedSlug
        ? await updateCategory(selectedSlug, payload)
        : await createCategory(payload);

      setFeedback(selectedSlug ? "Categoria actualizada correctamente." : "Categoria creada.");
      await loadCategories(savedCategory.slug);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo guardar la categoria.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCategory) {
      return;
    }

    const confirmed = window.confirm(
      `Se eliminara la categoria "${selectedCategory.title}". Esta accion no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      await deleteCategory(selectedCategory.slug);
      setFeedback("Categoria eliminada.");
      await loadCategories();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "No se pudo eliminar la categoria.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header admin-page__header--compact">
        <p className="hero__eyebrow">Administracion</p>
        <h1 className="hero__title">Categorias</h1>
        <p className="hero__lead">
          Crea nuevas categorias o actualiza los datos que alimentan el inicio, el nav y las fichas.
        </p>
      </header>

      <div className="admin-two-column">
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">Listado</h2>
            <button type="button" className="admin-button admin-button--secondary" onClick={handleNewCategory}>
              Nueva categoria
            </button>
          </div>

          {loading ? <p className="status-message">Cargando categorias...</p> : null}
          {categories.length > 0 ? (
            <ul className="admin-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className={
                      selectedSlug === category.slug
                        ? "admin-list__button admin-list__button--active"
                        : "admin-list__button"
                    }
                    onClick={() => handleSelectCategory(category)}
                  >
                    <span>{category.title}</span>
                    <small>{category.slug}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">{selectedSlug ? "Editar categoria" : "Crear categoria"}</h2>
            {selectedCategory ? (
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
              <span>Slug</span>
              <input
                value={form.slug}
                onChange={(event) => handleFieldChange("slug", event.target.value)}
                placeholder="vino"
              />
            </label>

            <label className="admin-field">
              <span>Posicion</span>
              <input
                type="number"
                value={form.position}
                onChange={(event) => handleFieldChange("position", Number(event.target.value))}
              />
            </label>

            <label className="admin-field">
              <span>Titulo</span>
              <input
                value={form.title}
                onChange={(event) => handleFieldChange("title", event.target.value)}
                placeholder="Vino"
              />
            </label>

            <label className="admin-field">
              <span>Resumen</span>
              <textarea
                rows={4}
                value={form.summary}
                onChange={(event) => handleFieldChange("summary", event.target.value)}
              />
            </label>

            <div className="admin-form__grid">
              <label className="admin-field">
                <span>Graduacion tipica</span>
                <input
                  value={form.abv}
                  onChange={(event) => handleFieldChange("abv", event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span>Origen / nota</span>
                <input
                  value={form.origin}
                  onChange={(event) => handleFieldChange("origin", event.target.value)}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>URL de imagen</span>
              <input
                value={form.imageUrl}
                onChange={(event) => handleFieldChange("imageUrl", event.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Texto alternativo de imagen</span>
              <input
                value={form.imageAlt}
                onChange={(event) => handleFieldChange("imageAlt", event.target.value)}
              />
            </label>

            <div className="admin-actions">
              <button type="submit" className="admin-button" disabled={saving}>
                {saving ? "Guardando..." : selectedSlug ? "Guardar cambios" : "Crear categoria"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
