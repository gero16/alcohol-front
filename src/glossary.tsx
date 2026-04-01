import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { getGlossary } from "./api/client";
import type { GlossaryItem } from "./api/types";

type GlossaryContextValue = {
  items: GlossaryItem[];
  loading: boolean;
};

const GlossaryContext = createContext<GlossaryContextValue>({
  items: [],
  loading: true,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GlossaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const nextItems = await getGlossary();

        if (active) {
          setItems(nextItems);
        }
      } catch {
        if (active) {
          setItems([]);
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

  const value = useMemo(
    () => ({
      items,
      loading,
    }),
    [items, loading],
  );

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary() {
  return useContext(GlossaryContext);
}

export function GlossaryText({
  text,
  excludeSlugs = [],
}: {
  text: string;
  excludeSlugs?: string[];
}) {
  const { items } = useGlossary();

  const activeItems = useMemo(
    () => items.filter((item) => !excludeSlugs.includes(item.slug)).sort((a, b) => b.term.length - a.term.length),
    [excludeSlugs, items],
  );

  const itemByTerm = useMemo(() => {
    const map = new Map<string, GlossaryItem>();

    for (const item of activeItems) {
      map.set(item.term.toLocaleLowerCase("es"), item);
    }

    return map;
  }, [activeItems]);

  const regex = useMemo(() => {
    if (activeItems.length === 0) {
      return null;
    }

    const alternatives = activeItems.map((item) => escapeRegExp(item.term)).join("|");
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${alternatives})(?=$|[^\\p{L}\\p{N}])`, "giu");
  }, [activeItems]);

  const content = useMemo(() => {
    if (!regex || text.length === 0) {
      return [text];
    }

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let matchIndex = 0;

    for (const match of text.matchAll(regex)) {
      const fullMatch = match[0];
      const prefix = match[1] ?? "";
      const matchedTerm = match[2] ?? "";
      const start = match.index ?? 0;
      const termStart = start + prefix.length;
      const termEnd = start + fullMatch.length;

      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      if (prefix) {
        parts.push(prefix);
      }

      const item = itemByTerm.get(matchedTerm.toLocaleLowerCase("es"));

      if (!item) {
        parts.push(matchedTerm);
      } else {
        parts.push(
          <Link
            key={`${item.slug}-${termStart}-${matchIndex}`}
            to={`/glosario#${item.slug}`}
            className="glossary-link"
            title={item.shortDefinition}
          >
            {matchedTerm}
          </Link>,
        );
      }

      lastIndex = termEnd;
      matchIndex += 1;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [itemByTerm, regex, text]);

  return (
    <>
      {content.map((part, index) => (
        <Fragment key={`glossary-fragment-${index}`}>{part}</Fragment>
      ))}
    </>
  );
}
