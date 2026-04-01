import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GlossaryText, useGlossary } from "../glossary";

function toCategoryLabel(slug: string): string {
  if (slug === "champagne") {
    return "Espumoso";
  }

  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export default function GlossaryPage() {
  const { items: terms, loading } = useGlossary();
  const location = useLocation();

  useEffect(() => {
    if (loading || !location.hash) {
      return;
    }

    const id = decodeURIComponent(location.hash.slice(1));

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
  }, [loading, location.hash, terms.length]);

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
          <div className="classification-list">
            {terms.map((item) => (
              <article key={item.slug} id={item.slug} className="classification-card glossary-entry">
                <h3 className="classification-card__title">{item.term}</h3>
                <p className="classification-card__subtitle">
                  <GlossaryText text={item.shortDefinition} excludeSlugs={[item.slug]} />
                </p>
                {item.details.map((detail) => (
                  <p key={detail} className="classification-card__text">
                    <GlossaryText text={detail} excludeSlugs={[item.slug]} />
                  </p>
                ))}
                {item.relatedCategories.length > 0 ? (
                  <p className="classification-card__reference">
                    Aparece mucho en:{" "}
                    {item.relatedCategories.map((slug, index) => (
                      <span key={slug}>
                        {index > 0 ? ", " : ""}
                        <Link to={`/categoria/${slug === "champagne" ? "champagne" : slug}`}>
                          {toCategoryLabel(slug)}
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
