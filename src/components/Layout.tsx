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
    .flatMap((tab) =>
      tab.sections.map((section) => ({
        slug: section.slug,
        label: section.title,
      })),
    );
}

export default function Layout() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [distillateTabs, setDistillateTabs] = useState<GuideTab[]>([]);
  const [aperitifSubcategories, setAperitifSubcategories] = useState<NavSubcategory[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [nextCategories, distillateGuide, aperitifGuide] = await Promise.all([
          getCategories(),
          getGuideByCategorySlug("destilados"),
          getGuideByCategorySlug("aperitivos"),
        ]);

        if (active) {
          setCategories(nextCategories);
          setDistillateTabs(
            (distillateGuide?.tabs ?? []).filter((tab) => isSpiritGuideTabSlug(tab.slug)),
          );
          setAperitifSubcategories(getAperitifSubcategories(aperitifGuide));
        }
      } catch {
        if (active) {
          setCategories([]);
          setDistillateTabs([]);
          setAperitifSubcategories([]);
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
              <li className="nav__item">
                <NavLink to="/consumo-responsable" className="nav__link">
                  Consumo responsable
                </NavLink>
              </li>
              {categories.map((category) => {
                const isDistillates = category.slug === "destilados";
                const isAperitifs = category.slug === "aperitivos";
                const submenuItems = isDistillates
                  ? distillateTabs.map((tab) => ({
                      slug: toSpiritSubcategorySlug(tab.slug),
                      label: toSpiritDisplayLabel(tab.label),
                    }))
                  : isAperitifs
                    ? aperitifSubcategories
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
                          isAperitifs ? "Subcategorías de aperitivos" : "Subcategorías de destilados"
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
            </ul>
          </div>
        ) : null}
      </nav>
      <Outlet />
    </div>
  );
}
