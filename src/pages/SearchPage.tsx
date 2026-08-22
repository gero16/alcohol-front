import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, searchSite } from "../api/client";
import type { SearchResult, SearchResultKind } from "../api/types";

const KIND_LABELS: Record<SearchResultKind, string> = {
  category: "Categoría",
  guide: "Guía",
  glossary: "Glosario",
  product: "Producto",
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryFromUrl = (searchParams.get("q") ?? "").trim();
  const [inputValue, setInputValue] = useState(queryFromUrl);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    if (!queryFromUrl) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await searchSite(queryFromUrl);
        if (active) {
          setResults(response.results);
        }
      } catch (err) {
        if (active) {
          setResults([]);
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "No se pudo completar la búsqueda.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [queryFromUrl]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = inputValue.trim();
    if (!next) {
      navigate("/buscar");
      return;
    }
    navigate(`/buscar?q=${encodeURIComponent(next)}`);
  }

  return (
    <article className="detail search-page">
      <header className="hero">
        <p className="hero__eyebrow">Búsqueda</p>
        <h1 className="hero__title">Buscar en la guía</h1>
        <p className="hero__lead">
          Encuentra términos, estilos y menciones en categorías, guías, glosario y productos.
        </p>
      </header>

      <form className="search-page__form" onSubmit={handleSubmit} role="search">
        <label className="search-page__label" htmlFor="search-page-input">
          Palabra o frase
        </label>
        <div className="search-page__row">
          <input
            id="search-page-input"
            className="search-page__input"
            type="search"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Ej. demi sec, vermut, IPA…"
            autoComplete="off"
            autoFocus
          />
          <button type="submit" className="search-page__submit">
            Buscar
          </button>
        </div>
      </form>

      {!queryFromUrl ? (
        <p className="status-message">Escribe un término para ver resultados.</p>
      ) : null}

      {loading ? <p className="status-message">Buscando…</p> : null}

      {error ? <p className="status-message status-message--error">{error}</p> : null}

      {!loading && !error && queryFromUrl ? (
        <section className="detail__section" aria-live="polite">
          <h2 className="section-title">
            {results.length === 0
              ? `Sin resultados para “${queryFromUrl}”`
              : `${results.length} resultado${results.length === 1 ? "" : "s"} para “${queryFromUrl}”`}
          </h2>

          {results.length > 0 ? (
            <ul className="search-results">
              {results.map((item) => (
                <li key={item.id} className="search-results__item">
                  <Link to={item.href} className="search-results__link">
                    <span className="search-results__kind">{KIND_LABELS[item.kind]}</span>
                    <span className="search-results__title">{item.title}</span>
                    <span className="search-results__breadcrumb">{item.breadcrumb}</span>
                    {item.snippet ? (
                      <span className="search-results__snippet">{item.snippet}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
