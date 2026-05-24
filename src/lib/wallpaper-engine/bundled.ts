// Mitgelieferte Standard-Wallpaper (im Repo unter public/wallpapers/).
// Werden als Default für NEU angelegte Views verwendet, damit ein frischer
// View sofort Bilder zeigt. Bestehende Views behalten ihre gespeicherte Config.

export const BUNDLED_WALLPAPER_COUNT = 20;

export const BUNDLED_WALLPAPERS: string[] = Array.from(
  { length: BUNDLED_WALLPAPER_COUNT },
  (_, i) => `/wallpapers/mf-${String(i + 1).padStart(2, "0")}.jpg`,
);

// Default-Wallpaper-Config für neue Views.
export const DEFAULT_WALLPAPER = {
  source: "bundled",
  query: "",
  intervalSec: 45,
  showMetadata: false,
  transitionEffect: "crossfade" as const,
  gradientTop: 30,
  gradientBottom: 80,
  overlayVignette: 30,
  overlayBlur: 0,
};
