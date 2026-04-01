import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getCategories, getGuideByCategorySlug } from "../api/client";
import type { Category, GuideTab } from "../api/types";

function isSpiritGuideTabSlug(slug: string): boolean {
  return slug.endsWith("-guia");
}

function toSpiritSubcategorySlug(tabSlug: string): string {
  return tabSlug.replace(/-guia$/, "");
}

function toSpiritDisplayLabel(label: string): string {
  return label.replace(/\s+desde\s+cero$/i, "");
}

export default function Layout() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [distillateTabs, setDistillateTabs] = useState<GuideTab[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [nextCategories, distillateGuide] = await Promise.all([
          getCategories(),
          getGuideByCategorySlug("destilados"),
        ]);

        if (active) {
          setCategories(nextCategories);
          setDistillateTabs(
            (distillateGuide?.tabs ?? []).filter((tab) => isSpiritGuideTabSlug(tab.slug)),
          );
        }
      } catch {
        if (active) {
          setCategories([]);
          setDistillateTabs([]);
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

                return (
                  <li
                    key={category.id}
                    className={isDistillates ? "nav__item nav__item--has-children" : "nav__item"}
                  >
                    <NavLink to={`/categoria/${category.slug}`} className="nav__link">
                      {category.title}
                    </NavLink>
                    {isDistillates && distillateTabs.length > 0 ? (
                      <ul className="nav__submenu" aria-label="Subcategorías de destilados">
                        {distillateTabs.map((tab) => (
                          <li key={tab.id}>
                            <NavLink
                              to={`/categoria/destilados/${toSpiritSubcategorySlug(tab.slug)}`}
                              className="nav__sublink"
                            >
                              {toSpiritDisplayLabel(tab.label)}
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
