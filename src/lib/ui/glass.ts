import type { CSSProperties } from "react";

export type GlassConfig = {
  cardOpacity?: number; // 0..100
  cardBlur?: number; // 0..64 (px)
  cardTheme?: "dark" | "light";
};

export type GlassStyle = {
  cardOpacity: number;
  cardBlur: number;
  isLight: boolean;
  hasBg: boolean;
  baseRgb: string;
  borderRgba: string;
  /** Kann direkt per style={...} an den Outer-Container einer Karte gehängt werden. */
  cardStyle: CSSProperties;
};

/**
 * Berechnet die wiederkehrenden "Glass-Card"-Styles aus der
 * Widget-Config. War bisher 3× wortgleich in HomeAssistant-,
 * HANotification- und Calendar-Widget dupliziert.
 *
 * cardOpacity/cardBlur default auf 40/12 wie bisher.
 */
export function useGlassStyle(config?: GlassConfig): GlassStyle {
  const cardOpacity = config?.cardOpacity ?? 40;
  const cardBlur = config?.cardBlur ?? 12;
  const isLight = config?.cardTheme === "light";
  const hasBg = cardOpacity > 0 || cardBlur > 0;
  const baseRgb = isLight ? "255,255,255" : "0,0,0";
  const borderRgba = isLight ? "0,0,0,0.1" : "255,255,255,0.1";

  const cardStyle: CSSProperties = {
    backgroundColor: `rgba(${baseRgb},${cardOpacity / 100})`,
    ...(cardBlur > 0
      ? {
          backdropFilter: `blur(${cardBlur}px)`,
          WebkitBackdropFilter: `blur(${cardBlur}px)`,
        }
      : {}),
    ...(hasBg ? { border: `1px solid rgba(${borderRgba})` } : {}),
  };

  return { cardOpacity, cardBlur, isLight, hasBg, baseRgb, borderRgba, cardStyle };
}
