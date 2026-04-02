import type {
  Category,
  CategoryInput,
  GlossaryItem,
  GlossaryInput,
  GuideClassification,
  GuideDetail,
  GuideInput,
  GuideSummary,
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

/** Respuestas antiguas: sin `classifications` o con `body` en lugar de `paragraphs`. */
function normalizeGuideDetail(detail: GuideDetail): GuideDetail {
  return {
    ...detail,
    tabs: detail.tabs.map((tab) => ({
      ...tab,
      classifications: (tab.classifications ?? []).map((c) => {
        const raw = c as GuideClassification & { body?: string };
        const fromPars = Array.isArray(raw.paragraphs)
          ? raw.paragraphs.filter((p) => typeof p === "string")
          : [];
        const fromBody =
          typeof raw.body === "string" && raw.body.trim().length > 0 ? [raw.body.trim()] : [];
        const paragraphs = fromPars.length > 0 ? fromPars : fromBody;
        return { ...c, paragraphs };
      }),
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
