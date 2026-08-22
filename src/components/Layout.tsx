import { Suspense, useEffect, useState, type FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCategories, getGuideByCategorySlug } from "../api/client";
import { getGuideNavItems } from "../guideNav";
import { ImageLightboxProvider } from "./ImageLightbox";
import type { Category, GuideDetail } from "../api/types";

type NavSubcategory = {
  slug: string;
  label: string;
};

/** Ruta «inicio» de categoría: slug corto en la raíz (p. ej. /cerveza). */
function categoryHomeHref(slug: string): string {
  return `/${slug}`;
}

function categorySubHref(categorySlug: string, subSlug: string): string {
  return `/${categorySlug}/${subSlug}`;
}

/** Incluye URLs largas legadas (/categoria/…) para marcar el enlace activo. */
function pathnameIsUnderCategory(pathname: string, categorySlug: string): boolean {
  if (pathname === `/${categorySlug}` || pathname === `/categoria/${categorySlug}`) {
    return true;
  }
  return (
    pathname.startsWith(`/${categorySlug}/`) || pathname.startsWith(`/categoria/${categorySlug}/`)
  );
}

function pathnameIsCategoryHome(pathname: string, categorySlug: string): boolean {
  return pathname === `/${categorySlug}` || pathname === `/categoria/${categorySlug}`;
}

function pathnameIsCategorySub(pathname: string, categorySlug: string, subSlug: string): boolean {
  return (
    pathname === categorySubHref(categorySlug, subSlug) ||
    pathname === `/categoria/${categorySlug}/${subSlug}`
  );
}

function getNavSubcategories(guide: GuideDetail | null): NavSubcategory[] {
  if (!guide) {
    return [];
  }

  return getGuideNavItems(guide);
}

export default function Layout() {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [guideNavByCategory, setGuideNavByCategory] = useState<Record<string, NavSubcategory[]>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategorySlug, setExpandedCategorySlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextCategories = await getCategories();
        if (active) {
          setCategories(nextCategories);
        }
      } catch {
        if (active) {
          setCategories([]);
        }
      }
    })();

    void (async () => {
      try {
        const [distillateGuide, wineGuide, beerGuide, aperitifGuide, liqueurGuide] = await Promise.all([
          getGuideByCategorySlug("destilados"),
          getGuideByCategorySlug("vino"),
          getGuideByCategorySlug("cerveza"),
          getGuideByCategorySlug("aperitivos"),
          getGuideByCategorySlug("licores"),
        ]);

        if (active) {
          setGuideNavByCategory({
            destilados: getNavSubcategories(distillateGuide),
            vino: getNavSubcategories(wineGuide),
            cerveza: getNavSubcategories(beerGuide),
            aperitivos: getNavSubcategories(aperitifGuide),
            licores: getNavSubcategories(liqueurGuide),
          });
        }
      } catch {
        if (active) {
          setGuideNavByCategory({});
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedCategorySlug(null);
  }, [location.pathname]);

  function handleNavLinkClick() {
    setIsMobileMenuOpen(false);
    setExpandedCategorySlug(null);
  }

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = searchQuery.trim();
    if (!next) {
      navigate("/buscar");
      return;
    }
    navigate(`/buscar?q=${encodeURIComponent(next)}`);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="layout">
      <nav className="nav" aria-label="Principal">
        <NavLink to="/" className="nav__brand" end onClick={handleNavLinkClick}>
          Alcoholes
        </NavLink>
        <form className="nav__search" onSubmit={handleSearchSubmit} role="search">
          <label className="visually-hidden" htmlFor="nav-search-input">
            Buscar en la guía
          </label>
          <input
            id="nav-search-input"
            className="nav__search-input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar… (ej. demi sec)"
            autoComplete="off"
          />
          <button type="submit" className="nav__search-submit">
            Buscar
          </button>
        </form>
        <button
          type="button"
          className="nav__menu-button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-navigation-links"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? "Cerrar" : "Menú"}
        </button>
        {categories.length > 0 ? (
          <div
            id="main-navigation-links"
            className={`nav__categories ${isMobileMenuOpen ? "nav__categories--open" : ""}`}
            aria-label="Categorías de alcoholes"
          >
            <p className="nav__eyebrow">Navegación</p>
            <ul className="nav__links nav__links--categories">
              <li className="nav__item">
                <NavLink to="/" className="nav__link" end onClick={handleNavLinkClick}>
                  Inicio
                </NavLink>
              </li>
       
              {categories.map((category) => {
                const submenuItems = guideNavByCategory[category.slug] ?? [];

                return (
                  <li
                    key={category.id}
                    className={submenuItems.length > 0 ? "nav__item nav__item--has-children" : "nav__item"}
                  >
                    <div className="nav__item-row">
                      <NavLink
                        to={categoryHomeHref(category.slug)}
                        className={() =>
                          `nav__link${
                            pathnameIsUnderCategory(location.pathname, category.slug) ? " active" : ""
                          }`
                        }
                        onClick={handleNavLinkClick}
                      >
                        {category.title}
                      </NavLink>
                      {submenuItems.length > 0 ? (
                        <button
                          type="button"
                          className="nav__submenu-toggle"
                          aria-expanded={expandedCategorySlug === category.slug}
                          aria-label={`Mostrar subcategorías de ${category.title}`}
                          onClick={() =>
                            setExpandedCategorySlug((current) =>
                              current === category.slug ? null : category.slug,
                            )
                          }
                        >
                          {expandedCategorySlug === category.slug ? "−" : "+"}
                        </button>
                      ) : null}
                    </div>
                    {submenuItems.length > 0 ? (
                      <ul
                        className={`nav__submenu ${expandedCategorySlug === category.slug ? "nav__submenu--open" : ""}`}
                        aria-label={`Subcategorías de ${category.title}`}
                      >
                        <li key={`${category.slug}-inicio`}>
                          <NavLink
                            to={categoryHomeHref(category.slug)}
                            className={() =>
                              `nav__sublink${
                                pathnameIsCategoryHome(location.pathname, category.slug) ? " active" : ""
                              }`
                            }
                            onClick={handleNavLinkClick}
                          >
                            Inicio
                          </NavLink>
                        </li>
                        {submenuItems.map((item) => (
                          <li key={`${category.slug}-${item.slug}`}>
                            <NavLink
                              to={categorySubHref(category.slug, item.slug)}
                              className={() =>
                                `nav__sublink${
                                  pathnameIsCategorySub(location.pathname, category.slug, item.slug)
                                    ? " active"
                                    : ""
                                }`
                              }
                              onClick={handleNavLinkClick}
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
              <li className="nav__item">
                <NavLink to="/buscar" className="nav__link" onClick={handleNavLinkClick}>
                  Buscar
                </NavLink>
              </li>
              <li className="nav__item">
                <NavLink to="/glosario" className="nav__link" onClick={handleNavLinkClick}>
                  Glosario
                </NavLink>
              </li>
              <li className="nav__item">
                <NavLink to="/consumo-responsable" className="nav__link" onClick={handleNavLinkClick}>
                  Consumo responsable
                </NavLink>
              </li>
            </ul>
          </div>
        ) : null}
      </nav>
      <ImageLightboxProvider>
        <Suspense fallback={<p className="status-message">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </ImageLightboxProvider>
    </div>
  );
}
