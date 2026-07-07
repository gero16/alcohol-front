import type { GuideDetail } from "./api/types";
import {
  effectiveSectionShowInNav,
  effectiveTabShowInNav,
  getGuideNavContainerTabSlugs,
  getGuideNavItems,
  isGuideNavSlug,
  sectionNavLabel,
  toSpiritSubcategorySlug,
} from "./guideNav";

export type GuideSubcategory = {
  slug: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  previewText: string;
  tab: GuideDetail["tabs"][number];
};

function getSectionPreviewText(paragraphs: string[]): string {
  let firstSubtitle = "";
  for (const paragraph of paragraphs) {
    const value = paragraph.trim();
    if (!value) {
      continue;
    }
    if (!value.startsWith("__subtitle__:")) {
      return value;
    }
    if (!firstSubtitle) {
      firstSubtitle = value.slice("__subtitle__:".length).trim();
    }
  }
  return firstSubtitle;
}

function buildFallbackTab(
  sourceTab: GuideDetail["tabs"][number],
  section: GuideDetail["tabs"][number]["sections"][number],
): GuideDetail["tabs"][number] {
  return {
    ...sourceTab,
    id: `${sourceTab.id}-${section.id}`,
    slug: `${sourceTab.slug}-${section.slug}`,
    label: sectionNavLabel(section.title),
    panelTitle: sectionNavLabel(section.title),
    sections: [section],
    tables: [],
    classifications: [],
    noteTitle: undefined,
    noteContent: undefined,
  };
}

export function getGuideSubcategories(guide: GuideDetail): GuideSubcategory[] {
  return getGuideNavItems(guide).map((item) => {
    const navTab = guide.tabs.find((tab) => {
      if (!effectiveTabShowInNav(guide.category.slug, tab)) {
        return false;
      }

      const navSlug =
        guide.category.slug === "destilados" ? toSpiritSubcategorySlug(tab.slug) : tab.slug;
      return navSlug === item.slug;
    });

    if (navTab) {
      const previewSection = navTab.sections[0];
      return {
        slug: item.slug,
        label: item.label,
        subtitle: previewSection?.subtitle,
        imageUrl: previewSection?.imageUrl,
        imageAlt: previewSection?.imageAlt,
        previewText: previewSection
          ? getSectionPreviewText(previewSection.paragraphs)
          : (navTab.noteContent ?? ""),
        tab: navTab,
      };
    }

    for (const tab of guide.tabs) {
      const section = tab.sections.find((candidate) => candidate.slug === item.slug);
      if (!section || !effectiveSectionShowInNav(guide.category.slug, tab, section)) {
        continue;
      }

      const dedicatedTab = guide.tabs.find((candidate) => candidate.slug === section.slug);
      const fallbackTab = dedicatedTab ? null : buildFallbackTab(tab, section);

      return {
        slug: item.slug,
        label: item.label,
        subtitle: section.subtitle,
        imageUrl: section.imageUrl,
        imageAlt: section.imageAlt,
        previewText: getSectionPreviewText(section.paragraphs),
        tab: dedicatedTab ?? fallbackTab ?? guide.tabs[0],
      };
    }

    return {
      slug: item.slug,
      label: item.label,
      previewText: "",
      tab: guide.tabs[0],
    };
  });
}

export function getTabsWithoutSubcategories(guide: GuideDetail): GuideDetail["tabs"] {
  const navSlugs = new Set(getGuideNavItems(guide).map((item) => item.slug));
  const containerTabSlugs = getGuideNavContainerTabSlugs(guide);

  return guide.tabs.filter((tab) => {
    if (effectiveTabShowInNav(guide.category.slug, tab)) {
      return false;
    }

    if (containerTabSlugs.has(tab.slug)) {
      return false;
    }

    if (navSlugs.has(tab.slug)) {
      return false;
    }

    if (
      guide.category.slug === "destilados" &&
      navSlugs.has(toSpiritSubcategorySlug(tab.slug))
    ) {
      return false;
    }

    return true;
  });
}

export function isGuideSubcategorySlug(guide: GuideDetail, slug: string): boolean {
  return isGuideNavSlug(guide, slug);
}
