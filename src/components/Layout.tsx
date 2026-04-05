import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getCategories, getGuideByCategorySlug } from "../api/client";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [distillateTabs, setDistillateTabs] = useState<GuideTab[]>([]);
  const [wineSubcategories, setWineSubcategories] = useState<NavSubcategory[]>([]);
  const [beerSubcategories, setBeerSubcategories] = useState<NavSubcategory[]>([]);
  const [aperitifSubcategories, setAperitifSubcategories] = useState<NavSubcategory[]>([]);
  const [liqueurSubcategories, setLiqueurSubcategories] = useState<NavSubcategory[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [nextCategories, distillateGuide, wineGuide, beerGuide, aperitifGuide, liqueurGuide] = await Promise.all([
          getCategories(),
          getGuideByCategorySlug("destilados"),
          getGuideByCategorySlug("vino"),
          getGuideByCategorySlug("cerveza"),
          getGuideByCategorySlug("aperitivos"),
          getGuideByCategorySlug("licores"),
        ]);

        if (active) {
          setCategories(nextCategories);
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
          setCategories([]);
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

  return (
    <div className="layout">
      <nav className="nav" aria-label="Principal">
        <NavLink to="/" className="nav__brand" end>
          Alcoholes
        </NavLink>
        {categories.length > 0 ? (
          <div className="nav__categories" aria-label="Categorías de alcoholes">
            <p className="nav__eyebrow">Navegación</p>
            <ul className="nav__links nav__links--categories">
              <li className="nav__item">
                <NavLink to="/" className="nav__link" end>
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
                    <NavLink to={`/categoria/${category.slug}`} className="nav__link">
                      {category.title}
                    </NavLink>
                    {submenuItems.length > 0 ? (
                      <ul
                        className="nav__submenu"
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
                        {submenuItems.map((item) => (
                          <li key={`${category.slug}-${item.slug}`}>
                            <NavLink
                              to={`/categoria/${category.slug}/${item.slug}`}
                              className="nav__sublink"
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
                <NavLink to="/glosario" className="nav__link">
                  Glosario
                </NavLink>
              </li>
              <li className="nav__item">
                <NavLink to="/consumo-responsable" className="nav__link">
                  Consumo responsable
                </NavLink>
              </li>
            </ul>
          </div>
        ) : null}
      </nav>
      <Outlet />
    </div>
  );
}
