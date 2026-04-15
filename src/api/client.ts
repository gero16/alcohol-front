import type {
  Category,
  CategoryInput,
  GlossaryItem,
  GlossaryInput,
  GuideClassification,
  GuideClassificationBlock,
  GuideDetail,
  GuideInput,
  GuideSummary,
  Product,
  ProductInput,
} from "./types";

const DEFAULT_API_BASE_URL = "https://alcohol-api-qn53.onrender.com";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

/** APIs antiguas: sin `blocks` o con subtítulo/párrafos/imagen sueltos. */
function legacyClassificationToBlocks(
  c: GuideClassification & {
    body?: string;
    subtitle?: string;
    paragraphs?: string[];
    imageUrl?: string;
    imageAlt?: string;
  },
): GuideClassificationBlock[] {
  if (Array.isArray(c.blocks) && c.blocks.length > 0) {
    return c.blocks;
  }
  const blocks: GuideClassificationBlock[] = [];
  if (typeof c.subtitle === "string" && c.subtitle.trim().length > 0) {
    blocks.push({ kind: "subtitle", text: c.subtitle.trim() });
  }
  const pars = Array.isArray(c.paragraphs) ? c.paragraphs.filter((p) => typeof p === "string") : [];
  const fromBody =
    typeof c.body === "string" && c.body.trim().length > 0 ? [c.body.trim()] : [];
  const lines = pars.length > 0 ? pars : fromBody;
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 0) {
      blocks.push({ kind: "paragraph", text: t });
    }
  }
  if (typeof c.imageUrl === "string" && c.imageUrl.trim().length > 0) {
    blocks.push({
      kind: "image",
      url: c.imageUrl.trim(),
      alt: typeof c.imageAlt === "string" ? c.imageAlt.trim() : "",
    });
  }
  return blocks.length > 0 ? blocks : [{ kind: "paragraph", text: "" }];
}

function normalizeGuideDetail(detail: GuideDetail): GuideDetail {
  return {
    ...detail,
    tabs: detail.tabs.map((tab) => ({
      ...tab,
      classifications: (tab.classifications ?? []).map((c) => ({
        ...c,
        blocks: legacyClassificationToBlocks(c),
      })),
    })),
  };
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = "No se pudo completar la solicitud.";

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Si el servidor no devuelve JSON, usamos el mensaje por defecto.
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getCategories(): Promise<Category[]> {
  return requestJson<Category[]>("/categories");
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  return requestJson<Category>(`/categories/${slug}`);
}

export async function getGuideByCategorySlug(slug: string): Promise<GuideDetail | null> {
  try {
    const detail = await requestJson<GuideDetail>(`/guides/${slug}`);
    return normalizeGuideDetail(detail);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getGuides(): Promise<GuideSummary[]> {
  return requestJson<GuideSummary[]>("/guides");
}

export async function getGlossary(): Promise<GlossaryItem[]> {
  return requestJson<GlossaryItem[]>("/glossary");
}

export async function getGlossaryItemBySlug(slug: string): Promise<GlossaryItem> {
  return requestJson<GlossaryItem>(`/glossary/${slug}`);
}

export async function createCategory(payload: CategoryInput): Promise<Category> {
  return requestJson<Category>("/categories", {
    method: "POST",
    body: payload,
  });
}

export async function updateCategory(currentSlug: string, payload: CategoryInput): Promise<Category> {
  return requestJson<Category>(`/categories/${currentSlug}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteCategory(slug: string): Promise<void> {
  await requestJson<void>(`/categories/${slug}`, {
    method: "DELETE",
  });
}

export async function saveGuide(categorySlug: string, payload: GuideInput): Promise<GuideDetail> {
  const detail = await requestJson<GuideDetail>(`/guides/${categorySlug}`, {
    method: "PUT",
    body: payload,
  });
  return normalizeGuideDetail(detail);
}

export async function createGlossaryItem(payload: GlossaryInput): Promise<GlossaryItem> {
  return requestJson<GlossaryItem>("/glossary", {
    method: "POST",
    body: payload,
  });
}

export async function updateGlossaryItem(currentSlug: string, payload: GlossaryInput): Promise<GlossaryItem> {
  return requestJson<GlossaryItem>(`/glossary/${currentSlug}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteGlossaryItem(slug: string): Promise<void> {
  await requestJson<void>(`/glossary/${slug}`, {
    method: "DELETE",
  });
}

// ─── Productos ────────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  categorySlug?: string;
  subcategorySlug?: string;
  featured?: boolean;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.categorySlug)    params.set("categorySlug",    filters.categorySlug);
  if (filters?.subcategorySlug) params.set("subcategorySlug", filters.subcategorySlug);
  if (filters?.featured !== undefined) params.set("featured", String(filters.featured));
  const qs = params.toString();
  return requestJson<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return requestJson<Product>(`/products/${slug}`);
}

export async function createProduct(payload: ProductInput): Promise<Product> {
  return requestJson<Product>("/products", {
    method: "POST",
    body: payload,
  });
}

export async function updateProduct(currentSlug: string, payload: ProductInput): Promise<Product> {
  return requestJson<Product>(`/products/${currentSlug}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteProduct(slug: string): Promise<void> {
  await requestJson<void>(`/products/${slug}`, {
    method: "DELETE",
  });
}
