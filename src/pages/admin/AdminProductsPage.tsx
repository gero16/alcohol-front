import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from "../../api/client";
import type {
  BodyDensity,
  Category,
  Product,
  ProductInput,
  WhiskyType,
  WineStyle,
  WineType,
} from "../../api/types";

// ─── Helpers para convertir arrays ↔ texto ────────────────────────────────────

function arrayToText(arr: string[] | null | undefined): string {
  return (arr ?? []).join(", ");
}

function textToArray(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── Blank / conversión ───────────────────────────────────────────────────────

type FormState = Omit<ProductInput, "tastingNose" | "tastingPalate" | "tags" | "pairings" | "grapes"> & {
  tastingNoseText: string;
  tastingPalateText: string;
  tagsText: string;
  pairingsText: string;
  grapes: Array<{ grape: string; percentage: string }>;
};

function getBlank(): FormState {
  return {
    slug: "",
    name: "",
    brand: "",
    categorySlug: "",
    subcategorySlug: "",
    abv: undefined,
    origin: "",
    regionDetail: "",
    imageUrl: "",
    imageAlt: "",
    description: "",
    servingSuggestion: "",
    priceRange: "",
    featured: false,
    tagsText: "",
    bodyDensity: null,
    mixingRatio: "",
    tastingColor: "",
    tastingNoseText: "",
    tastingPalateText: "",
    tastingFinish: "",
    whiskyType: null,
    distillery: "",
    ageStatement: "",
    caskType: "",
    isPeated: null,
    wineType: null,
    wineStyle: null,
    vintage: undefined,
    producer: "",
    grapes: [],
    beerStyle: "",
    ibu: undefined,
    beerColor: "",
  };
}

function toFormState(p: Product): FormState {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    categorySlug: p.categorySlug,
    subcategorySlug: p.subcategorySlug ?? "",
    abv: p.abv ?? undefined,
    origin: p.origin ?? "",
    regionDetail: p.regionDetail ?? "",
    imageUrl: p.imageUrl ?? "",
    imageAlt: p.imageAlt ?? "",
    description: p.description ?? "",
    servingSuggestion: p.servingSuggestion ?? "",
    priceRange: p.priceRange ?? "",
    featured: p.featured,
    tagsText: arrayToText(p.tags),
    bodyDensity: p.bodyDensity ?? null,
    mixingRatio: p.mixingRatio ?? "",
    tastingColor: p.tastingColor ?? "",
    tastingNoseText: arrayToText(p.tastingNose),
    tastingPalateText: arrayToText(p.tastingPalate),
    tastingFinish: p.tastingFinish ?? "",
    whiskyType: p.whiskyType ?? null,
    distillery: p.distillery ?? "",
    ageStatement: p.ageStatement ?? "",
    caskType: p.caskType ?? "",
    isPeated: p.isPeated ?? null,
    wineType: p.wineType ?? null,
    wineStyle: p.wineStyle ?? null,
    vintage: p.vintage ?? undefined,
    producer: p.producer ?? "",
    grapes: (p.grapes ?? []).map((g) => ({
      grape: g.grape,
      percentage: g.percentage != null ? String(g.percentage) : "",
    })),
    beerStyle: p.beerStyle ?? "",
    ibu: p.ibu ?? undefined,
    beerColor: p.beerColor ?? "",
  };
}

function toProductInput(f: FormState): ProductInput {
  return {
    slug: f.slug.trim(),
    name: f.name.trim(),
    brand: f.brand.trim(),
    categorySlug: f.categorySlug.trim(),
    subcategorySlug: f.subcategorySlug?.trim() || null,
    abv: f.abv ?? null,
    origin: f.origin?.trim() || null,
    regionDetail: f.regionDetail?.trim() || null,
    imageUrl: f.imageUrl?.trim() || null,
    imageAlt: f.imageAlt?.trim() || null,
    description: f.description?.trim() || null,
    servingSuggestion: f.servingSuggestion?.trim() || null,
    priceRange: f.priceRange?.trim() || null,
    featured: f.featured,
    tags: textToArray(f.tagsText),
    bodyDensity: f.bodyDensity ?? null,
    mixingRatio: f.mixingRatio?.trim() || null,
    tastingColor: f.tastingColor?.trim() || null,
    tastingNose: textToArray(f.tastingNoseText),
    tastingPalate: textToArray(f.tastingPalateText),
    tastingFinish: f.tastingFinish?.trim() || null,
    whiskyType: f.whiskyType ?? null,
    distillery: f.distillery?.trim() || null,
    ageStatement: f.ageStatement?.trim() || null,
    caskType: f.caskType?.trim() || null,
    isPeated: f.isPeated ?? null,
    wineType: f.wineType ?? null,
    wineStyle: f.wineStyle ?? null,
    vintage: f.vintage ?? null,
    producer: f.producer?.trim() || null,
    grapes: f.grapes
      .filter((g) => g.grape.trim().length > 0)
      .map((g) => ({
        grape: g.grape.trim(),
        percentage: g.percentage ? Number(g.percentage) : undefined,
      })),
    beerStyle: f.beerStyle?.trim() || null,
    ibu: f.ibu ?? null,
    beerColor: f.beerColor?.trim() || null,
    pairings: textToArray(f.pairingsText ?? ""),
  };
}

function validate(f: FormState): string | null {
  if (!f.slug.trim()) return "El slug es obligatorio.";
  if (!f.name.trim()) return "El nombre es obligatorio.";
  if (!f.brand.trim()) return "La marca es obligatoria.";
  if (!f.categorySlug.trim()) return "La categoría es obligatoria.";
  return null;
}

// ─── Determinar tipo de categoría para mostrar campos específicos ──────────────

function getCategoryType(categorySlug: string, subcategorySlug: string): "whisky" | "wine" | "beer" | "other" {
  if (categorySlug === "vino") return "wine";
  if (categorySlug === "cerveza") return "beer";
  if (
    categorySlug === "destilados" &&
    (subcategorySlug === "whisky" || subcategorySlug === "")
  )
    return "whisky";
  if (subcategorySlug === "whisky") return "whisky";
  return "other";
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(getBlank());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function loadData(preferredSlug?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const [nextProducts, nextCategories] = await Promise.all([getProducts(), getCategories()]);
      setProducts(nextProducts);
      setCategories(nextCategories);

      if (nextProducts.length === 0) {
        setSelectedSlug(null);
        setForm(getBlank());
        return;
      }

      const target =
        preferredSlug && nextProducts.some((p) => p.slug === preferredSlug)
          ? preferredSlug
          : nextProducts[0].slug;

      const selected = nextProducts.find((p) => p.slug === target) ?? nextProducts[0];
      setSelectedSlug(selected.slug);
      setForm(toFormState(selected));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.slug === selectedSlug) ?? null,
    [products, selectedSlug],
  );

  const categoryType = getCategoryType(form.categorySlug, form.subcategorySlug ?? "");

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSelectProduct(p: Product) {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Continuar?")) return;
    setSelectedSlug(p.slug);
    setForm(toFormState(p));
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  function handleNew() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Continuar?")) return;
    setSelectedSlug(null);
    setForm(getBlank());
    setFeedback(null);
    setError(null);
    setDirty(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setError(null);

    const msg = validate(form);
    if (msg) { setError(msg); return; }

    setSaving(true);
    try {
      const payload = toProductInput(form);
      const saved = selectedSlug
        ? await updateProduct(selectedSlug, payload)
        : await createProduct(payload);

      setFeedback(selectedSlug ? "Producto actualizado." : "Producto creado.");
      await loadData(saved.slug);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Error al guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedProduct) return;
    if (!window.confirm(`¿Eliminar "${selectedProduct.name}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    try {
      await deleteProduct(selectedProduct.slug);
      setFeedback("Producto eliminado.");
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Grapes helpers ──────────────────────────────────────────────────────────

  function addGrape() {
    set("grapes", [...form.grapes, { grape: "", percentage: "" }]);
  }

  function updateGrape(index: number, field: "grape" | "percentage", value: string) {
    const next = form.grapes.map((g, i) => (i === index ? { ...g, [field]: value } : g));
    set("grapes", next);
  }

  function removeGrape(index: number) {
    set("grapes", form.grapes.filter((_, i) => i !== index));
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="admin-page">
      <header className="admin-page__header admin-page__header--compact">
        <p className="hero__eyebrow">Administración</p>
        <h1 className="hero__title">Productos</h1>
        <p className="hero__lead">
          Fichas detalladas de marcas y etiquetas específicas: whiskies, vinos, cervezas y más.
        </p>
      </header>

      <div className="admin-two-column">
        {/* ── Lista ─────────────────────────────────────────────────────────── */}
        <aside className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">Listado</h2>
            <button type="button" className="admin-button admin-button--secondary" onClick={handleNew}>
              Nuevo producto
            </button>
          </div>

          {loading ? <p className="status-message">Cargando productos...</p> : null}

          {products.length > 0 ? (
            <ul className="admin-list">
              {products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={
                      selectedSlug === p.slug
                        ? "admin-list__button admin-list__button--active"
                        : "admin-list__button"
                    }
                    onClick={() => handleSelectProduct(p)}
                  >
                    <span>{p.name}</span>
                    <small>{p.brand} · {p.categorySlug}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!loading && products.length === 0 ? (
            <p className="status-message">No hay productos. Crea el primero.</p>
          ) : null}
        </aside>

        {/* ── Formulario ────────────────────────────────────────────────────── */}
        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2 className="admin-panel__title">
              {selectedSlug ? "Editar producto" : "Crear producto"}
            </h2>
            {selectedProduct ? (
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

          {dirty    ? <p className="status-message">Hay cambios sin guardar.</p>       : null}
          {feedback ? <p className="status-message">{feedback}</p>                     : null}
          {error    ? <p className="status-message status-message--error">{error}</p>  : null}

          <form className="admin-form" onSubmit={(e) => void handleSubmit(e)}>

            {/* ── Identificación ─────────────────────────────────────────── */}
            <div className="admin-subsection">
              <h3 className="admin-subsection__title">Identificación</h3>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Slug (URL)</span>
                  <input
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder="johnnie-walker-red-label"
                  />
                </label>

                <label className="admin-field">
                  <span>Rango de precio</span>
                  <select value={form.priceRange ?? ""} onChange={(e) => set("priceRange", e.target.value)}>
                    <option value="">— Sin especificar —</option>
                    <option value="$">$ (económico)</option>
                    <option value="$$">$$ (medio)</option>
                    <option value="$$$">$$$ (premium)</option>
                    <option value="$$$$">$$$$ (ultra premium)</option>
                  </select>
                </label>
              </div>

              <label className="admin-field">
                <span>Nombre completo</span>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Johnnie Walker Red Label"
                />
              </label>

              <label className="admin-field">
                <span>Marca</span>
                <input
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Johnnie Walker"
                />
              </label>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Categoría</span>
                  <select
                    value={form.categorySlug}
                    onChange={(e) => set("categorySlug", e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.title}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>Subcategoría</span>
                  <input
                    value={form.subcategorySlug ?? ""}
                    onChange={(e) => set("subcategorySlug", e.target.value)}
                    placeholder="whisky, ron, malbec..."
                  />
                </label>
              </div>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>ABV (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={form.abv ?? ""}
                    onChange={(e) => set("abv", e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="40.0"
                  />
                </label>

                <label className="admin-field">
                  <span>País de origen</span>
                  <input
                    value={form.origin ?? ""}
                    onChange={(e) => set("origin", e.target.value)}
                    placeholder="Escocia"
                  />
                </label>

                <label className="admin-field">
                  <span>Región específica</span>
                  <input
                    value={form.regionDetail ?? ""}
                    onChange={(e) => set("regionDetail", e.target.value)}
                    placeholder="Speyside, Mendoza..."
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Descripción general</span>
                <textarea
                  rows={3}
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>URL de imagen</span>
                  <input
                    value={form.imageUrl ?? ""}
                    onChange={(e) => set("imageUrl", e.target.value)}
                  />
                </label>

                <label className="admin-field">
                  <span>Texto alternativo de imagen</span>
                  <input
                    value={form.imageAlt ?? ""}
                    onChange={(e) => set("imageAlt", e.target.value)}
                  />
                </label>
              </div>

              <label className="admin-field admin-field--inline">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                />
                <span>Producto destacado</span>
              </label>
            </div>

            {/* ── Servicio y mezcla ──────────────────────────────────────── */}
            <div className="admin-subsection">
              <h3 className="admin-subsection__title">Servicio y mezcla</h3>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Sugerencia de servicio</span>
                  <input
                    value={form.servingSuggestion ?? ""}
                    onChange={(e) => set("servingSuggestion", e.target.value)}
                    placeholder="On the rocks, Highball..."
                  />
                </label>

                <label className="admin-field">
                  <span>Proporción de mezcla</span>
                  <input
                    value={form.mixingRatio ?? ""}
                    onChange={(e) => set("mixingRatio", e.target.value)}
                    placeholder="70/30 Cola, Ginger Ale 1:3"
                  />
                </label>
              </div>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Cuerpo / densidad en boca</span>
                  <select
                    value={form.bodyDensity ?? ""}
                    onChange={(e) => set("bodyDensity", (e.target.value as BodyDensity) || null)}
                  >
                    <option value="">— Sin especificar —</option>
                    <option value="LOW">Ligero (Low)</option>
                    <option value="MEDIUM_LOW">Ligero-Medio</option>
                    <option value="MEDIUM">Medio</option>
                    <option value="MEDIUM_HIGH">Medio-Pleno</option>
                    <option value="HIGH">Pleno (High)</option>
                  </select>
                </label>

                <label className="admin-field">
                  <span>Tags (separados por coma)</span>
                  <input
                    value={form.tagsText}
                    onChange={(e) => set("tagsText", e.target.value)}
                    placeholder="ahumado, mezcla, picante"
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Maridajes (separados por coma)</span>
                <input
                  value={(form as FormState & { pairingsText?: string }).pairingsText ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pairingsText: e.target.value }))
                  }
                  onInput={() => setDirty(true)}
                  placeholder="Carnes rojas, Quesos azules, Ginger Ale"
                />
              </label>
            </div>

            {/* ── Notas de cata ──────────────────────────────────────────── */}
            <div className="admin-subsection">
              <h3 className="admin-subsection__title">Notas de cata</h3>

              <label className="admin-field">
                <span>Color</span>
                <input
                  value={form.tastingColor ?? ""}
                  onChange={(e) => set("tastingColor", e.target.value)}
                  placeholder="Ámbar dorado con reflejos cobrizos"
                />
              </label>

              <div className="admin-form__grid">
                <label className="admin-field">
                  <span>Aromas / Nariz (separados por coma)</span>
                  <input
                    value={form.tastingNoseText}
                    onChange={(e) => set("tastingNoseText", e.target.value)}
                    placeholder="cítricos, vainilla, humo joven"
                  />
                </label>

                <label className="admin-field">
                  <span>Sabores / Paladar (separados por coma)</span>
                  <input
                    value={form.tastingPalateText}
                    onChange={(e) => set("tastingPalateText", e.target.value)}
                    placeholder="especias, malta, pimienta"
                  />
                </label>
              </div>

              <label className="admin-field">
                <span>Final / Retrogusto</span>
                <input
                  value={form.tastingFinish ?? ""}
                  onChange={(e) => set("tastingFinish", e.target.value)}
                  placeholder="Corto y cálido, persistente con madera"
                />
              </label>
            </div>

            {/* ── Sección Whisky ─────────────────────────────────────────── */}
            {(categoryType === "whisky" || form.whiskyType) ? (
              <div className="admin-subsection">
                <h3 className="admin-subsection__title">Detalle — Whisky</h3>

                <div className="admin-form__grid">
                  <label className="admin-field">
                    <span>Tipo de whisky</span>
                    <select
                      value={form.whiskyType ?? ""}
                      onChange={(e) => set("whiskyType", (e.target.value as WhiskyType) || null)}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="SINGLE_MALT">Single Malt</option>
                      <option value="SINGLE_GRAIN">Single Grain</option>
                      <option value="BLENDED_MALT">Blended Malt</option>
                      <option value="BLENDED_SCOTCH">Blended Scotch</option>
                      <option value="BOURBON">Bourbon</option>
                      <option value="RYE">Rye</option>
                      <option value="IRISH">Irish</option>
                      <option value="JAPANESE">Japanese</option>
                      <option value="WORLD">World / Otros</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Destilería</span>
                    <input
                      value={form.distillery ?? ""}
                      onChange={(e) => set("distillery", e.target.value)}
                      placeholder="Cardhu, Maker's Mark..."
                    />
                  </label>

                  <label className="admin-field">
                    <span>Declaración de edad</span>
                    <input
                      value={form.ageStatement ?? ""}
                      onChange={(e) => set("ageStatement", e.target.value)}
                      placeholder="12, 18, NAS"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Tipo de barrica</span>
                    <input
                      value={form.caskType ?? ""}
                      onChange={(e) => set("caskType", e.target.value)}
                      placeholder="Ex-Bourbon, Jerez, Oporto"
                    />
                  </label>
                </div>

                <label className="admin-field admin-field--inline">
                  <input
                    type="checkbox"
                    checked={form.isPeated === true}
                    onChange={(e) => set("isPeated", e.target.checked ? true : null)}
                  />
                  <span>Ahumado con turba (peated)</span>
                </label>
              </div>
            ) : null}

            {/* ── Sección Vino ───────────────────────────────────────────── */}
            {(categoryType === "wine" || form.wineType) ? (
              <div className="admin-subsection">
                <h3 className="admin-subsection__title">Detalle — Vino</h3>

                <div className="admin-form__grid">
                  <label className="admin-field">
                    <span>Tipo de vino</span>
                    <select
                      value={form.wineType ?? ""}
                      onChange={(e) => set("wineType", (e.target.value as WineType) || null)}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="TINTO">Tinto</option>
                      <option value="BLANCO">Blanco</option>
                      <option value="ROSADO">Rosado</option>
                      <option value="ESPUMOSO">Espumoso</option>
                      <option value="DULCE">Dulce</option>
                      <option value="SEMI_DULCE">Semi Dulce</option>
                      <option value="SEMI_SECO">Semi Seco</option>
                      <option value="FORTIFICADO">Fortificado</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Estilo</span>
                    <select
                      value={form.wineStyle ?? ""}
                      onChange={(e) => set("wineStyle", (e.target.value as WineStyle) || null)}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="JOVEN">Joven</option>
                      <option value="ROBLE">Roble</option>
                      <option value="CRIANZA">Crianza</option>
                      <option value="RESERVA">Reserva</option>
                      <option value="GRAN_RESERVA">Gran Reserva</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>Cosecha (año)</span>
                    <input
                      type="number"
                      value={form.vintage ?? ""}
                      onChange={(e) => set("vintage", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="2021"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Bodega / Productor</span>
                    <input
                      value={form.producer ?? ""}
                      onChange={(e) => set("producer", e.target.value)}
                      placeholder="Catena Zapata"
                    />
                  </label>
                </div>

                <div className="admin-subsection">
                  <div className="admin-panel__header">
                    <h4 className="admin-subsection__title">Cepas / Varietales</h4>
                    <button type="button" className="admin-button admin-button--secondary" onClick={addGrape}>
                      Agregar cepa
                    </button>
                  </div>
                  {form.grapes.length === 0 ? (
                    <p className="status-message">Sin cepas cargadas.</p>
                  ) : null}
                  <div className="admin-stack">
                    {form.grapes.map((g, i) => (
                      <div key={i} className="admin-row-card">
                        <div className="admin-form__grid">
                          <label className="admin-field">
                            <span>Cepa</span>
                            <input
                              value={g.grape}
                              onChange={(e) => updateGrape(i, "grape", e.target.value)}
                              placeholder="Malbec, Cabernet Sauvignon..."
                            />
                          </label>
                          <label className="admin-field">
                            <span>% en blend (opcional)</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={g.percentage}
                              onChange={(e) => updateGrape(i, "percentage", e.target.value)}
                              placeholder="70"
                            />
                          </label>
                        </div>
                        <div className="admin-toolbar">
                          <div className="admin-toolbar__spacer" />
                          <button
                            type="button"
                            className="admin-button admin-button--danger"
                            onClick={() => removeGrape(i)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Sección Cerveza ────────────────────────────────────────── */}
            {(categoryType === "beer" || form.beerStyle) ? (
              <div className="admin-subsection">
                <h3 className="admin-subsection__title">Detalle — Cerveza</h3>

                <div className="admin-form__grid">
                  <label className="admin-field">
                    <span>Estilo</span>
                    <input
                      value={form.beerStyle ?? ""}
                      onChange={(e) => set("beerStyle", e.target.value)}
                      placeholder="IPA, Stout, Lager, Ale..."
                    />
                  </label>

                  <label className="admin-field">
                    <span>IBU (amargor)</span>
                    <input
                      type="number"
                      value={form.ibu ?? ""}
                      onChange={(e) => set("ibu", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="40"
                    />
                  </label>

                  <label className="admin-field">
                    <span>Color</span>
                    <input
                      value={form.beerColor ?? ""}
                      onChange={(e) => set("beerColor", e.target.value)}
                      placeholder="Rubia, Negra, Ámbar..."
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {/* ── Acciones ───────────────────────────────────────────────── */}
            <div className="admin-actions">
              <button type="submit" className="admin-button" disabled={saving}>
                {saving ? "Guardando..." : selectedSlug ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
