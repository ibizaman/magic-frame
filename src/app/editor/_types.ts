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
  showTimer?: boolean;
}

export const defaultLayout: WidgetLayoutItem[] = [
  { i: 'clk', x: 2, y: 2, w: 10, h: 4, type: 'ClockWidget.tsx', label: 'Uhr & Datum', bgOpacity: 20, config: { fontSize: 24, fontFamily: 'Inter' } },
  { i: 'cal', x: 2, y: 7, w: 10, h: 6, type: 'CalendarWidget.tsx', label: 'Kalender', bgOpacity: 20, config: { fontSize: 18, fontFamily: 'Inter' } },
  { i: 'wth', x: 2, y: 14, w: 20, h: 6, type: 'WeatherWidget.tsx', label: 'Wetter', bgOpacity: 50, config: { fontSize: 20, fontFamily: 'Inter' } },
];
