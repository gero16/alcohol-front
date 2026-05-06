import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getCategories, getGuideByCategorySlug } from "../api/client";
import { ImageLightboxProvider } from "./ImageLightbox";
import type { Category, GuideDetail, GuideTab } from "../api/types";

function isSpiritGuideTabSlug(slug: string): boolean {
  return slug.endsWith("-guia");
}

function toSpiritSubcategorySlug(tabSlug: string): string {
  return tabSlug.replace(/-guia$/, "");
}

function toSpiritDisplayLabel(label: string): string {
  return label.replace(/\s+desde\s+cero$/i, "");
}

function isAperitifSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "ejemplos" || slug === "marcas-y-estilos";
}

function isWineSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "estilos";
}

function isBeerSubcategorySourceTabSlug(slug: string): boolean {
  return slug === "por-color";
}

function isLiqueurSubcategoryTabSlug(slug: string): boolean {
  return !["que-son", "elaboracion", "familias", "servicio", "ejemplos"].includes(slug);
}

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

function getAperitifSubcategories(guide: GuideDetail | null): NavSubcategory[] {
  if (!guide) {
    return [];
  }

  return guide.tabs
    .filter((tab) => isAperitifSubcategorySourceTabSlug(tab.slug))
    .flatMap((sourceTab) =>
      sourceTab.sections.map((section) => {
        const dedicatedTab = guide.tabs.find((t) => t.slug === section.slug);
        return {
          slug: section.slug,
          label: dedicatedTab?.label ?? section.title,
        };
      }),
    );
}

function getWineSubcategories(guide: GuideDetail | null): NavSubcategory[] {
  if (!guide) {
    return [];
  }

  return guide.tabs
    .filter((tab) => isWineSubcategorySourceTabSlug(tab.slug))
    .flatMap((tab) =>
      tab.sections.map((section) => ({
        slug: section.slug,
        label: section.title.replace(/^\d+\.\s*/, ""),
      })),
    );
}

function getBeerSubcategories(guide: GuideDetail | null): NavSubcategory[] {
  if (!guide) {
    return [];
  }

  return guide.tabs
    .filter((tab) => isBeerSubcategorySourceTabSlug(tab.slug))
    .flatMap((tab) =>
      tab.sections.map((section) => ({
        slug: section.slug,
        label: section.title.replace(/^Cervezas\s+/i, ""),
      })),
    );
}

function getLiqueurSubcategories(guide: GuideDetail | null): NavSubcategory[] {
  if (!guide) {
    return [];
  }

  return guide.tabs
    .filter((tab) => isLiqueurSubcategoryTabSlug(tab.slug))
    .map((tab) => ({
      slug: tab.slug,
      label: tab.label,
    }));
}

export default function Layout() {
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [distillateTabs, setDistillateTabs] = useState<GuideTab[]>([]);
  const [wineSubcategories, setWineSubcategories] = useState<NavSubcategory[]>([]);
  const [beerSubcategories, setBeerSubcategories] = useState<NavSubcategory[]>([]);
  const [aperitifSubcategories, setAperitifSubcategories] = useState<NavSubcategory[]>([]);
  const [liqueurSubcategories, setLiqueurSubcategories] = useState<NavSubcategory[]>([]);
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
          setDistillateTabs(
            (distillateGuide?.tabs ?? []).filter((tab) => isSpiritGuideTabSlug(tab.slug)),
          );
          setWineSubcategories(getWineSubcategories(wineGuide));
          setBeerSubcategories(getBeerSubcategories(beerGuide));
          setAperitifSubcategories(getAperitifSubcategories(aperitifGuide));
          setLiqueurSubcategories(getLiqueurSubcategories(liqueurGuide));
        }
      } catch {
        if (active) {
          setDistillateTabs([]);
          setWineSubcategories([]);
          setBeerSubcategories([]);
          setAperitifSubcategories([]);
          setLiqueurSubcategories([]);
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

  return (
    <div className="layout">
      <nav className="nav" aria-label="Principal">
        <NavLink to="/" className="nav__brand" end onClick={handleNavLinkClick}>
          Alcoholes
        </NavLink>
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
                const isDistillates = category.slug === "destilados";
                const isWines = category.slug === "vino";
                const isBeers = category.slug === "cerveza";
                const isAperitifs = category.slug === "aperitivos";
                const isLiqueurs = category.slug === "licores";
                const submenuItems = isDistillates
                  ? distillateTabs.map((tab) => ({
                      slug: toSpiritSubcategorySlug(tab.slug),
                      label: toSpiritDisplayLabel(tab.label),
                    }))
                  : isWines
                    ? wineSubcategories
                  : isBeers
                    ? beerSubcategories
                  : isAperitifs
                    ? aperitifSubcategories
                    : isLiqueurs
                      ? liqueurSubcategories
                    : [];

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
                        aria-label={
                          isDistillates
                            ? "Subcategorías de destilados"
                            : isWines
                              ? "Subcategorías de vinos"
                            : isBeers
                              ? "Subcategorías de cervezas"
                            : isAperitifs
                              ? "Subcategorías de aperitivos"
                              : "Subcategorías de licores"
                        }
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
