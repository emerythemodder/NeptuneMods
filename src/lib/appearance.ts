import { settingsStore, type Settings } from "./store";

export const ACCENTS = [
  { name: "Neptune", value: "#8152d4" },
  { name: "Lavender", value: "#a58fd0" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Slate", value: "#64748b" },
];

export const BANNER_GRADIENTS: Record<string, { name: string; css: string }> = {
  neptune: { name: "Neptune", css: "linear-gradient(135deg, #1e1237 0%, #4b2a8c 50%, #a58fd0 100%)" },
  ocean: { name: "Ocean", css: "linear-gradient(135deg, #0b2a4a 0%, #134e6f 55%, #1c7c8c 100%)" },
  dusk: { name: "Dusk", css: "linear-gradient(135deg, #1e1b3a 0%, #4a2c5e 60%, #8c4a5c 100%)" },
  forest: { name: "Forest", css: "linear-gradient(135deg, #0f2a1d 0%, #1f4d33 60%, #4d7a3a 100%)" },
  ember: { name: "Ember", css: "linear-gradient(135deg, #2a1208 0%, #6b2a12 60%, #b8561e 100%)" },
  nether: { name: "Nether", css: "linear-gradient(160deg, #2b0a0a 0%, #5c1414 50%, #8a2a1a 100%)" },
  end: { name: "The End", css: "linear-gradient(160deg, #0d0d14 0%, #23213a 55%, #4b4673 100%)" },
  sand: { name: "Desert", css: "linear-gradient(135deg, #a8875a 0%, #cfae7c 55%, #e7d3a6 100%)" },
  mono: { name: "Graphite", css: "linear-gradient(135deg, #18191c 0%, #2b2d31 100%)" },
};

function resolveTheme(t: Settings["theme"]): "dark" | "light" {
  if (t === "system") return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  return t;
}

/** Readable text color for a given background hex. */
export function contrastText(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "#fff";
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#111" : "#fff";
}

export function applyAppearance(s: Settings) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(s.theme);
  root.style.setProperty("--accent", s.accent);
  root.style.setProperty("--accent-fg", contrastText(s.accent));
}

/** Follow OS theme changes while the theme is set to "system". */
export function watchSystemTheme() {
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => applyAppearance(settingsStore.get()));
}
