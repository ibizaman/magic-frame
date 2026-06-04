export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  label: string;
  bgOpacity: number;
  config: {
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    textShadowBlur?: number;
  textShadowX?: number;
  textShadowY?: number;
  offsetX?: number;
  offsetY?: number;
  responsiveText?: boolean;
  defaultHidden?: boolean;
  showHumidity?: boolean;
  showWind?: boolean;
    subtextSize?: number;
    forecastLayout?: 'horizontal' | 'vertical';
    iconSet?: string;
    hideForecast?: boolean;
    hideSeconds?: boolean;
    showMiniWeather?: boolean;
    align?: string;
    timezone?: string;
    location?: string;
    lat?: string;
    lon?: string;
    icalUrl?: string;
    limit?: number;
    days?: number;
    color?: string;
    hideOnEmpty?: boolean;
    entityId?: string;
    icon?: string;
    hideWhen?: string;
    colorWhen?: string;
    colorTarget?: string;
    showIfEntity?: string;
    showIfState?: string;
    entityId2?: string;
    icon2?: string;
    color2?: string;
    hideWhen2?: string;
    colorWhen2?: string;
    colorTarget2?: string;
    showIfEntity2?: string;
    showIfState2?: string;
    entityId3?: string;
    icon3?: string;
    color3?: string;
    hideWhen3?: string;
    colorWhen3?: string;
    colorTarget3?: string;
    showIfEntity3?: string;
    showIfState3?: string;
    entityId4?: string;
    icon4?: string;
    color4?: string;
    colorWhen4?: string;
    colorTarget4?: string;
    showIfEntity4?: string;
    showIfState4?: string;
    maxNotifications?: number;
    rules?: any[]; // NotificationRule array
    cardOpacity?: number;
    cardTheme?: 'dark' | 'light';
    cardBlur?: number;
    design?: 'cards' | 'minimal';
  };
}

export interface WallpaperConfig {
  source: string; // 'unsplash', 'url', 'webdav', 'immich'
  query: string; // keywords or image url
  intervalSec: number;
  showMetadata: boolean;
  webdavUrl?: string;
  webdavPath?: string;
  webdavUser?: string;
  webdavPass?: string;
  immichUrl?: string;
  immichApiKey?: string;
  immichAlbumId?: string;
  immichMode?: "album" | "favorites" | "memories" | "people"; // Immich-Quelle (#16, Schritt 2)
  immichPersonId?: string; // bei immichMode === "people"
  showDateTaken?: boolean; // deprecated, use metaShowDate
  metaShowDate?: boolean;
  metaShowLocation?: boolean;
  metaShowCamera?: boolean;
  metaFontFamily?: string;
  metaFontSize?: number;
  metaFontWeight?: string;
  metaTextShadow?: string;
  metaTextShadowBlur?: number;
  metaColor?: string;
  metaBgOpacity?: number;
  overlayBlur?: number;
  overlayVignette?: number;
  gradientTop?: number;
  gradientBottom?: number;
  zoomEffect?: boolean;
  transitionEffect?: "crossfade" | "kenburns" | "slide" | "none";
  transitionMs?: number; // Übergangs-Dauer (Default crossfade/kenburns 1500, slide 1200)
  fit?: "cover" | "contain" | "fill" | "none";
  imagePosition?: "top" | "center" | "bottom"; // object-position (gegen abgeschnittene Köpfe)
  kenBurnsIntensity?: number; // Ken-Burns-Zielzoom in % (Default 15 = scale 1.15)
  showTimer?: boolean;
}

// ── Widget display titles ────────────────────────────────────────────────
// Canonical default label per widget type, stored as the GERMAN source key.
// The title is ALWAYS rendered through t(), so it follows the active app
// locale. New widgets store an EMPTY label and derive their title from the
// type via widgetTitle() — no German string is ever baked into the DB.
export const WIDGET_DEFAULT_LABEL: Record<string, string> = {
  "ClockWidget.tsx": "Uhr",
  "WeatherWidget.tsx": "Wetter",
  "CalendarWidget.tsx": "Kalender",
  "HomeAssistantWidget.tsx": "HA Entity",
  "ButtonWidget.tsx": "Buttons",
  "HANotificationWidget.tsx": "Benachrichtigungen",
  "TimerWidget.tsx": "Timer",
  "MessagesWidget.tsx": "Nachrichten",
  "ImageWidget.tsx": "Bild",
  "ShoppingListWidget.tsx": "Einkaufsliste",
  "TodosWidget.tsx": "Todos",
  "CameraWidget.tsx": "Kamera",
};

// Every German default string we have ever auto-assigned (the current types
// above plus historical ones like the old "Uhr & Datum" clock default). Lets
// us recognise a stored label as an auto-default — not a user customisation —
// on existing DB rows, so we localise it instead of showing German verbatim
// on an English display.
const AUTO_DEFAULT_LABELS = new Set<string>([
  ...Object.values(WIDGET_DEFAULT_LABEL),
  "Uhr & Datum",
]);

/** True when a label is empty or one of our auto-assigned German defaults. */
export function isAutoDefaultLabel(label: string | undefined): boolean {
  const l = (label ?? "").trim();
  return l === "" || AUTO_DEFAULT_LABELS.has(l);
}

/**
 * Display title for a widget. Empty / auto-default labels derive from the
 * widget type and localise via t(); genuine user labels pass through as-is.
 *
 * NB: widget *targeting* (Button show/hide links) keys off the widget id
 * (`w.i`), never the label — so deriving the title here is display-only and
 * cannot break those dependencies.
 */
export function widgetTitle(
  type: string,
  label: string | undefined,
  t: (s: string) => string,
): string {
  if (isAutoDefaultLabel(label)) {
    const def = WIDGET_DEFAULT_LABEL[type];
    return def ? t(def) : type.replace("Widget.tsx", "");
  }
  return label as string;
}

export const defaultLayout: WidgetLayoutItem[] = [
  { i: 'clk', x: 2, y: 2, w: 10, h: 4, type: 'ClockWidget.tsx', label: '', bgOpacity: 20, config: { fontSize: 24, fontFamily: 'Inter' } },
  { i: 'cal', x: 2, y: 7, w: 10, h: 6, type: 'CalendarWidget.tsx', label: '', bgOpacity: 20, config: { fontSize: 18, fontFamily: 'Inter' } },
  { i: 'wth', x: 2, y: 14, w: 20, h: 6, type: 'WeatherWidget.tsx', label: '', bgOpacity: 50, config: { fontSize: 20, fontFamily: 'Inter' } },
];
