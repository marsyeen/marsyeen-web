export type ThemeId = "mars" | "lynix";

export const THEMES: Record<ThemeId, { accent: string; shadow: string; rgb: string }> = {
  mars: { accent: "#ff6b1a", shadow: "#7a3200", rgb: "255, 107, 26" },
  lynix: { accent: "#a855f7", shadow: "#3b0764", rgb: "168, 85, 247" },
};

const STORAGE_KEY = "site-theme";

export function getStoredTheme(): ThemeId {
  return localStorage.getItem(STORAGE_KEY) === "lynix" ? "lynix" : "mars";
}

export function applyTheme(id: ThemeId) {
  const theme = THEMES[id];
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-shadow", theme.shadow);
  root.style.setProperty("--accent-rgb", theme.rgb);
  root.dataset.theme = id;
  document.dispatchEvent(new CustomEvent<ThemeId>("theme:change", { detail: id }));
}

export function setStoredTheme(id: ThemeId) {
  localStorage.setItem(STORAGE_KEY, id);
  applyTheme(id);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
