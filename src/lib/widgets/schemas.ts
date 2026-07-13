import { z } from "zod";

export const WIDGET_TYPES = [
  "ClockWidget.tsx",
  "WeatherWidget.tsx",
  "CalendarWidget.tsx",
  "ButtonWidget.tsx",
  "HomeAssistantWidget.tsx",
  "HANotificationWidget.tsx",
  "TimerWidget.tsx",
  "MessagesWidget.tsx",
  "ShoppingListWidget.tsx",
  "TodosWidget.tsx",
] as const;

const baseConfig = z
  .object({
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional(),
    textShadowBlur: z.number().optional(),
    textShadowX: z.number().optional(),
    textShadowY: z.number().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    responsiveText: z.boolean().optional(),
    defaultHidden: z.boolean().optional(),
    // #6: Widget nur einblenden, wenn eine HA-Entity einen bestimmten State hat
    // (z.B. Kamera nur bei "Bewegung erkannt" / Türklingel). Leer = immer sichtbar.
    // Generisch für ALLE Widgets (baseConfig); der View hört live via SSE und
    // blendet ein/aus. Instant, kein Polling (HA-Bridge broadcaster).
    showWhenEntity: z.string().optional(),
    showWhenState: z.string().optional(),
    // Puls-Modus: >0 = beim Auslösen X Sekunden zeigen, dann automatisch wieder
    // ausblenden (z.B. Türklingel). 0/leer = sichtbar solange die Entity aktiv ist.
    autoHideSeconds: z.number().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
  })
  .passthrough();

const clockConfig = baseConfig.extend({
  timezone: z.string().optional(),
  hideSeconds: z.boolean().optional(),
  // "auto" follows the App locale (en → 12h, de → 24h). User can pin either.
  timeFormat: z.enum(["auto", "12h", "24h"]).optional(),
  // "auto" follows the App locale (en → en-US, de → de-DE). Explicit picks
  // for users who want a specific regional format.
  dateFormat: z.enum(["auto", "en-US", "en-GB", "de-DE"]).optional(),
  showMiniWeather: z.boolean().optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  location: z.string().optional(),
  showHumidity: z.boolean().optional(),
  showWind: z.boolean().optional(),
  showUv: z.boolean().optional(),
  iconSet: z.string().optional(),
  unitTemp: z.enum(["celsius", "fahrenheit"]).optional(),
  statsSize: z.number().optional(),
});

const weatherConfig = baseConfig.extend({
  lat: z.string().optional(),
  lon: z.string().optional(),
  location: z.string().optional(),
  forecastLayout: z.enum(["horizontal", "vertical"]).optional(),
  iconSet: z.string().optional(),
  hideForecast: z.boolean().optional(),
  showHumidity: z.boolean().optional(),
  showWind: z.boolean().optional(),
  showUv: z.boolean().optional(),
  showSunTimes: z.boolean().optional(),
  subtextSize: z.number().optional(),
  statsSize: z.number().optional(),
  unitTemp: z.enum(["celsius", "fahrenheit"]).optional(),
  unitWind: z.enum(["kmh", "mph", "ms", "kn"]).optional(),
});

const calendarConfig = baseConfig.extend({
  icalUrl: z.string().optional(),
  limit: z.number().optional(),
  days: z.number().optional(),
  hideOnEmpty: z.boolean().optional(),
  hideWeekday: z.boolean().optional(),
  // #33: Uhrzeit-Format der Termine. "auto" = nach App-Sprache (12h EN / 24h DE),
  // wie bisher → ändert für bestehende Layouts nichts. "12h"/"24h" = fester Override.
  calendarTimeFormat: z.enum(["auto", "12h", "24h"]).optional(),
});

const buttonConfig = baseConfig
  .extend({
    designLayout: z.enum(["auto", "row", "col"]).optional(),
    btnShape: z.enum(["square", "circle", "subtle", "fill"]).optional(),
    iconScale: z.number().optional(),
    btnScale: z.number().optional(),
    bgOpacity: z.number().optional(),
    bgBlur: z.number().optional(),
    bgRadius: z.number().optional(),
  })
  .passthrough();

const haEntitySlot = z.object({
  entityId: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  hideWhen: z.string().optional(),
  colorWhen: z.string().optional(),
  colorTarget: z.string().optional(),
  showIfEntity: z.string().optional(),
  showIfState: z.string().optional(),
});

const homeAssistantConfig = baseConfig
  .extend({
    design: z.enum(["cards", "minimal"]).optional(),
    cardOpacity: z.number().optional(),
    cardTheme: z.enum(["dark", "light"]).optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(), // Icon-Box an/aus (Default an)
    iconScale: z.number().optional(), // Icon-Größe-Faktor (Default 1)
    frameScale: z.number().optional(), // Kasten-Größe-Faktor (Default 1)
    hideControlButton: z.boolean().optional(), // Steuerungs-Button (Farbe/Slider) auf Kacheln ausblenden
    entities: z.array(haEntitySlot).optional(),
  })
  .passthrough();

const haNotificationConfig = baseConfig
  .extend({
    maxNotifications: z.number().optional(),
    rules: z.array(z.any()).optional(),
    cardOpacity: z.number().optional(),
    cardTheme: z.enum(["dark", "light"]).optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(),
    iconScale: z.number().optional(),
    frameScale: z.number().optional(),
    timeFormat: z.enum(["auto", "minutes", "hours", "days", "combined"]).optional(),
    showTimers: z.boolean().optional(),
  })
  .passthrough();

// Companion-Widgets: Config ist minimal, Widgets sind v.a. API-getrieben.
const timerConfig = baseConfig
  .extend({
    maxTimers: z.number().optional(),
    hideWhenEmpty: z.boolean().optional(),
  })
  .passthrough();

const messagesConfig = baseConfig
  .extend({
    maxMessages: z.number().optional(),
    hideWhenEmpty: z.boolean().optional(),
  })
  .passthrough();

const imageConfig = baseConfig
  .extend({
    immichSource: z.enum(["global", "view"]).optional(),
    immichAlbumId: z.string().optional(),
    fit: z.enum(["cover", "contain", "fill", "none"]).optional(),
    intervalSec: z.number().optional(),
    cornerRadius: z.number().optional(),
  })
  .passthrough();

const sensorSlot = z.object({
  entityId: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  unit: z.string().optional(),
  decimals: z.number().optional(),
});

const sensorConfig = baseConfig
  .extend({
    design: z.enum(["cards", "grid"]).optional(),
    cardTheme: z.enum(["dark", "light"]).optional(),
    cardOpacity: z.number().optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(),
    iconSize: z.number().optional(), // Icon-Größe-Faktor, 1 = Standard
    frameScale: z.number().optional(), // Kasten-Größe-Faktor, 1 = Standard
    showSparkline: z.boolean().optional(),
    sparklineHours: z.number().optional(),
    entities: z.array(sensorSlot).optional(),
  })
  .passthrough();

// CameraWidget — Home Assistant camera entity (snapshot-refresh MVP).
// MJPEG and WebRTC streamModes are reserved for follow-up releases.
const cameraConfig = baseConfig
  .extend({
    source: z.enum(["ha", "url"]).optional(),
    entityId: z.string().optional(),
    streamUrl: z.string().optional(),
    refreshIntervalSec: z.number().optional(),
    aspectRatio: z.enum(["auto", "16:9", "4:3", "1:1"]).optional(),
    streamMode: z.enum(["snapshot", "mjpeg", "webrtc"]).optional(),
    clickFullscreen: z.boolean().optional(),
    caption: z.string().optional(),
  })
  .passthrough();

const shoppingConfig = baseConfig
  .extend({
    title: z.string().optional(),
    hideHeader: z.boolean().optional(),
    hideCount: z.boolean().optional(),
    hideAddForm: z.boolean().optional(),
    listSource: z.enum(["local", "ha", "todoist"]).optional(),
    haListEntity: z.string().optional(),
    todoistProjectId: z.string().optional(),
  })
  .passthrough();

const todosConfig = baseConfig
  .extend({
    title: z.string().optional(),
    hideHeader: z.boolean().optional(),
    hideCount: z.boolean().optional(),
    assignee: z.string().optional(),
    hideAddForm: z.boolean().optional(),
    listSource: z.enum(["local", "ha", "todoist"]).optional(),
    haListEntity: z.string().optional(),
    todoistProjectId: z.string().optional(),
  })
  .passthrough();

// Custom-Modul-Widget: type beginnt mit "custom:". Config ist beliebig
// (passthrough), weil jedes Modul sein eigenes Field-Schema im Manifest hat.
// Validierung der Felder passiert client-seitig im Inspector.
const customWidgetConfig = baseConfig.passthrough();
const customWidgetSchema = z
  .object({
    type: z.string().regex(/^custom:[a-z0-9][a-z0-9_-]{0,63}$/i),
    config: customWidgetConfig,
  })
  .merge(commonWidgetFields());

export const widgetLayoutItemSchema = z.union([
  customWidgetSchema,
  z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("ClockWidget.tsx"), config: clockConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("WeatherWidget.tsx"), config: weatherConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("CalendarWidget.tsx"), config: calendarConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ButtonWidget.tsx"), config: buttonConfig })
    .merge(commonWidgetFields()),
  z
    .object({
      type: z.literal("HomeAssistantWidget.tsx"),
      config: homeAssistantConfig,
    })
    .merge(commonWidgetFields()),
  z
    .object({
      type: z.literal("HANotificationWidget.tsx"),
      config: haNotificationConfig,
    })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("TimerWidget.tsx"), config: timerConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("MessagesWidget.tsx"), config: messagesConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ShoppingListWidget.tsx"), config: shoppingConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("TodosWidget.tsx"), config: todosConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ImageWidget.tsx"), config: imageConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("SensorWidget.tsx"), config: sensorConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("CameraWidget.tsx"), config: cameraConfig })
    .merge(commonWidgetFields()),
  ]),
]);

function commonWidgetFields() {
  return z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    label: z.string().optional().default(""),
    bgOpacity: z.number().default(20),
  });
}

export const layoutSchema = z.array(widgetLayoutItemSchema);

export const wallpaperSchema = z
  .object({
    source: z.string().optional(),
    query: z.string().optional(),
    intervalSec: z.number().optional(),
    showMetadata: z.boolean().optional(),
    // Wie das Bild skaliert wird (issue #17). cover = Fill (default, croppt),
    // contain = Fit, fill = Stretch, none = Center.
    fit: z.enum(["cover", "contain", "fill", "none"]).optional(),
    // Dia-/Bild-Einstellungen: Übergangs-Dauer (ms), Bild-Position (object-
    // position), Ken-Burns-Intensität (%). Defaults reproduzieren das bisherige
    // Verhalten exakt — keine Migration nötig.
    transitionMs: z.number().optional(),
    imagePosition: z.enum(["top", "center", "bottom"]).optional(),
    kenBurnsIntensity: z.number().optional(),
  })
  .passthrough();

export const layoutSyncBodySchema = z.object({
  layout: layoutSchema,
  wallpaper: wallpaperSchema.optional(),
  settings: z.record(z.string(), z.any()).optional(),
  dashboardId: z.string().optional(),
});

export type WidgetType = (typeof WIDGET_TYPES)[number];
export type ClockConfig = z.infer<typeof clockConfig>;
export type WeatherConfig = z.infer<typeof weatherConfig>;
export type CalendarConfig = z.infer<typeof calendarConfig>;
export type ButtonConfig = z.infer<typeof buttonConfig>;
export type HomeAssistantConfig = z.infer<typeof homeAssistantConfig>;
export type HANotificationConfig = z.infer<typeof haNotificationConfig>;
