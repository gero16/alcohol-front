/** Debe coincidir con `alcohol-api/src/domain/guideSemantics.ts` (claves API estables). */
export const GUIDE_SEMANTIC_KEYS = [
  "intro",
  "history",
  "origin",
  "making",
  "classifications",
  "types",
  "sensory",
  "serving",
  "drinks",
  "pairing",
  "regulation",
  "culture",
] as const;

export type GuideSemanticKey = (typeof GUIDE_SEMANTIC_KEYS)[number];

export const GUIDE_SEMANTIC_LABELS_ES: Record<GuideSemanticKey, string> = {
  intro: "Introducción / qué es",
  history: "Historia",
  origin: "Origen, denominación o geografía",
  making: "Elaboración o proceso (creación)",
  classifications: "Marco de clasificación",
  types: "Tipos o estilos",
  sensory: "Cata, aromas o perfil sensorial",
  serving: "Cómo tomar o servir",
  drinks: "Cócteles y tragos",
  pairing: "Maridaje o combinaciones",
  regulation: "Normativa, etiqueta o graduación",
  culture: "Cultura, costumbres o mercado",
};

const KEY_SET = new Set<string>(GUIDE_SEMANTIC_KEYS);

export function isGuideSemanticKey(value: string): value is GuideSemanticKey {
  return KEY_SET.has(value.trim());
}

export const GUIDE_SEMANTIC_SELECT_OPTIONS: Array<{ value: ""; label: string } | { value: GuideSemanticKey; label: string }> = [
  { value: "", label: "Sin fijar (opcional)" },
  ...GUIDE_SEMANTIC_KEYS.map((key) => ({ value: key, label: GUIDE_SEMANTIC_LABELS_ES[key] })),
];
