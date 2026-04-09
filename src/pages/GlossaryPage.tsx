import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GlossaryText, useGlossary } from "../glossary";

function toCategoryLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export default function GlossaryPage() {
  const { items: terms, loading } = useGlossary();
  const location = useLocation();
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(() => new Set());

  const toggleSlug = useCallback((slug: string) => {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (loading || !location.hash) {
      return;
    }

    const id = decodeURIComponent(location.hash.slice(1));
    const exists = terms.some((t) => t.slug === id);
    if (exists) {
      setOpenSlugs((prev) => new Set(prev).add(id));
    }

    requestAnimationFrame(() => {
      const target = document.getElementById(id);

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [loading, location.hash, terms]);

  return (
    <article className="detail">
      <header className="hero">
        <p className="hero__eyebrow">Glosario básico</p>
        <h1 className="hero__title">Términos para entender mejor las bebidas</h1>
        <p className="hero__lead">
          Una guía simple para consultar palabras que aparecen seguido en vino, cerveza,
          destilados, sidra, espumosos y licores.
        </p>
      </header>

      {loading ? <p className="status-message">Cargando glosario...</p> : null}

      {!loading ? (
        <section className="detail__section">
          <h2 className="section-title">Conceptos clave</h2>
          <p className="glossary-grid__hint">Pulsa una tarjeta para ver la definición completa y enlaces.</p>
          <div className="glossary-card-grid">
            {terms.map((item) => {
              const isOpen = openSlugs.has(item.slug);
              const panelId = `glossary-panel-${item.slug}`;
              const headId = `glossary-head-${item.slug}`;

              return (
                <article
                  key={item.slug}
                  id={item.slug}
                  className={`glossary-card glossary-entry${isOpen ? " glossary-card--open" : ""}`}
                >
                  <button
                    type="button"
                    id={headId}
                    className="glossary-card__header"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleSlug(item.slug)}
                  >
                    <span className="glossary-card__term">{item.term}</span>
                    <span className="glossary-card__chevron" aria-hidden />
                  </button>
                  <p
                    className={
                      isOpen ? "glossary-card__short" : "glossary-card__short glossary-card__short--clamped"
                    }
                  >
                    <GlossaryText text={item.shortDefinition} excludeSlugs={[item.slug]} />
                  </p>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headId}
                    className={`glossary-card__collapsible${isOpen ? " glossary-card__collapsible--open" : ""}`}
                  >
                    <div className="glossary-card__collapsible-inner" aria-hidden={!isOpen}>
                      {item.details.map((detail) => (
                        <p key={detail} className="glossary-card__detail">
                          <GlossaryText text={detail} excludeSlugs={[item.slug]} />
                        </p>
                      ))}
                      {item.relatedCategories.length > 0 ? (
                        <p className="glossary-card__reference">
                          Aparece mucho en:{" "}
                          {item.relatedCategories.map((slug, index) => (
                            <span key={slug}>
                              {index > 0 ? ", " : ""}
                              <Link to={`/categoria/${slug}`}>{toCategoryLabel(slug)}</Link>
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </article>
  );
}
