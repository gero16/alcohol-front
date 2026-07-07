import type { GuideDetail, GuideSection, GuideTab } from "./api/types";

export type GuideNavItem = {
  slug: string;
  label: string;
};

type GuideNavGuide = Pick<GuideDetail, "category"> & {
  tabs: Array<
    Pick<GuideTab, "slug" | "label"> & {
      showInNav?: boolean | null;
      sections: Array<Pick<GuideSection, "slug" | "title"> & { showInNav?: boolean | null }>;
    }
  >;
};

const LIQUEUR_NON_NAV_TAB_SLUGS = new Set([
  "que-son",
  "elaboracion",
  "familias",
  "servicio",
  "ejemplos",
]);

export function toSpiritSubcategorySlug(tabSlug: string): string {
  return tabSlug.replace(/-guia$/, "");
}

export function toSpiritDisplayLabel(label: string): string {
  return label.replace(/\s+desde\s+cero$/i, "");
}

export function sectionNavLabel(title: string): string {
  return title.replace(/^\d+\.\s*/, "");
}

function beerSectionNavLabel(title: string): string {
  return title.replace(/^Cervezas\s+/i, "");
}

function legacyTabShowInNav(categorySlug: string, tabSlug: string): boolean {
  if (categorySlug === "destilados") {
    return tabSlug.endsWith("-guia");
  }

  if (categorySlug === "licores") {
    return !LIQUEUR_NON_NAV_TAB_SLUGS.has(tabSlug);
  }

  return false;
}

function legacySectionShowInNav(categorySlug: string, tabSlug: string): boolean {
  if (categorySlug === "vino" && tabSlug === "estilos") {
    return true;
  }

  if (categorySlug === "cerveza" && tabSlug === "por-color") {
    return true;
  }

  if (categorySlug === "aperitivos" && (tabSlug === "ejemplos" || tabSlug === "marcas-y-estilos")) {
    return true;
  }

  return false;
}

export function effectiveTabShowInNav(categorySlug: string, tab: GuideNavGuide["tabs"][number]): boolean {
  if (tab.showInNav === true) {
    return true;
  }

  if (tab.showInNav === false) {
    return false;
  }

  return legacyTabShowInNav(categorySlug, tab.slug);
}

export function effectiveSectionShowInNav(
  categorySlug: string,
  tab: GuideNavGuide["tabs"][number],
  section: GuideNavGuide["tabs"][number]["sections"][number],
): boolean {
  if (section.showInNav === true) {
    return true;
  }

  if (section.showInNav === false) {
    return false;
  }

  return legacySectionShowInNav(categorySlug, tab.slug);
}

export function getGuideNavItems(guide: GuideNavGuide): GuideNavItem[] {
  const categorySlug = guide.category.slug;
  const items: GuideNavItem[] = [];
  const usedSlugs = new Set<string>();

  for (const tab of guide.tabs) {
    if (effectiveTabShowInNav(categorySlug, tab)) {
      const slug =
        categorySlug === "destilados" ? toSpiritSubcategorySlug(tab.slug) : tab.slug;
      if (!usedSlugs.has(slug)) {
        usedSlugs.add(slug);
        items.push({
          slug,
          label:
            categorySlug === "destilados" ? toSpiritDisplayLabel(tab.label) : tab.label,
        });
      }
    }

    for (const section of tab.sections) {
      if (!effectiveSectionShowInNav(categorySlug, tab, section)) {
        continue;
      }

      if (usedSlugs.has(section.slug)) {
        continue;
      }

      usedSlugs.add(section.slug);

      const dedicatedTab = guide.tabs.find((candidate) => candidate.slug === section.slug);
      const label =
        categorySlug === "aperitivos"
          ? (dedicatedTab?.label ?? section.title)
          : categorySlug === "cerveza"
            ? beerSectionNavLabel(section.title)
            : sectionNavLabel(section.title);

      items.push({
        slug: section.slug,
        label,
      });
    }
  }

  return items;
}

export function isGuideNavSlug(guide: GuideNavGuide, slug: string): boolean {
  return getGuideNavItems(guide).some((item) => item.slug === slug);
}

export function getGuideNavContainerTabSlugs(guide: GuideNavGuide): Set<string> {
  const categorySlug = guide.category.slug;
  if (categorySlug === "cerveza") {
    return new Set();
  }

  return new Set(
    guide.tabs
      .filter((tab) => tab.sections.some((section) => effectiveSectionShowInNav(categorySlug, tab, section)))
      .map((tab) => tab.slug),
  );
}
