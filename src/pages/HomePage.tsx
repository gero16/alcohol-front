import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../api/client";
import type { Category } from "../api/types";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sliderRef = useRef<HTMLUListElement | null>(null);

  function scrollSlider(direction: "prev" | "next") {
    const slider = sliderRef.current;
    if (!slider) {
      return;
    }

    const amount = Math.max(280, Math.round(slider.clientWidth * 0.85));
    slider.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextCategories = await getCategories();
        if (active) {
          setCategories(nextCategories);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
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
  }, []);

  return (
    <>
      <header className="hero">
        <p className="hero__eyebrow">Guía informativa</p>
        <h1 className="hero__title">Bebidas alcohólicas</h1>
        <p className="hero__lead">
          Referencia rápida sobre categorías, orígenes y graduaciones habituales. El contenido es
          educativo; no sustituye normativa sanitaria ni consejo médico.
        </p>
      </header>

      <section className="home-slider" aria-labelledby="section-categorias">
        <h2 id="section-categorias" className="section-title">
          Categorías principales
        </h2>
        <p className="home-slider__hint">
          Desliza horizontalmente las categorías. En escritorio, pasa el cursor sobre cada una para
          desplegar más información.
        </p>

        {loading ? <p className="status-message">Cargando categorías...</p> : null}
        {error ? <p className="status-message status-message--error">{error}</p> : null}

        {!loading && !error ? (
          <div className="category-slider-shell">
            <button
              type="button"
              className="category-slider__arrow category-slider__arrow--prev"
              aria-label="Ver categorías anteriores"
              onClick={() => scrollSlider("prev")}
            >
              ←
            </button>
            <ul
              ref={sliderRef}
              className="category-slider"
              aria-label="Categorías de bebidas alcohólicas"
            >
              {categories.map((item) => (
                <li key={item.id} className="category-slider__item">
                  <article className="category-slide">
                    <img
                      className="category-slide__image"
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      loading="lazy"
                    />
                    <div className="category-slide__overlay">
                      <p className="category-slide__eyebrow">Categoría</p>
                      <h3 className="category-slide__title">{item.title}</h3>
                      <div className="category-slide__details">
                        <p className="category-slide__text">{item.summary}</p>
                        <dl className="category-slide__meta">
                          <div>
                            <dt>Graduación típica</dt>
                            <dd>{item.abv}</dd>
                          </div>
                          <div>
                            <dt>Origen / nota</dt>
                            <dd>{item.origin}</dd>
                          </div>
                        </dl>
                        <Link to={`/categoria/${item.slug}`} className="category-slide__link">
                          Ver ficha →
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="category-slider__arrow category-slider__arrow--next"
              aria-label="Ver más categorías"
              onClick={() => scrollSlider("next")}
            >
              →
            </button>
          </div>
        ) : null}
      </section>

      <aside className="notice" role="note">
        <h2 className="notice__title">Consumo responsable</h2>
        <p>
          El alcohol puede causar dependencia y daños a la salud. Las recomendaciones oficiales
          suelen limitar el consumo y desaconsejarlo en embarazo, menores y ciertas condiciones
          médicas. Infórmate en fuentes sanitarias de tu país.
        </p>
        <p className="notice__more">
          <Link to="/consumo-responsable">Más información</Link>
        </p>
      </aside>

      <footer className="footer">
        <small>Amplía con más fichas, búsqueda o API cuando lo necesites.</small>
      </footer>
    </>
  );
}
