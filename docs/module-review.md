# Module review

Complete findings across all 6 widget types with improvement suggestions and feature ideas. As of: 2026-04-18.

---

## 1. ClockWidget

**What it does:** time + date in the user's timezone, optional mini weather line.

**Config keys in the inspector:** `timezone`, `align`, `hideSeconds`, `showMiniWeather`, `lat`, `lon`, `location`, `iconSet`, `showHumidity`, `showWind`.

### Dead / ineffective settings
- `hideDate` is read during render, but the inspector offers **no toggle** — dead option from the user's perspective.
- `timezone`: garbage input silently falls back to the local TZ, no feedback.
- `iconSet`: only visible when `showMiniWeather` is active — inconsistent with the Weather widget.

### Quality issues
- Day/night check (`hours > 6 && < 20`) ignores the config timezone.
- Loading state may collapse.
- Font sizes hardcoded in `em` without scaling.
- `location.split(',')[0]` breaks on "Washington, D.C.".
- Mini weather has no error/offline state.

### Quick wins
1. Add a `hideDate` toggle to the inspector (feature exists, just no UI).
2. Make day/night respect `timezone`.
3. Day/night via sunrise/sunset from the weather API.
4. Throttle `setInterval` from 1s to 1min when `hideSeconds=true`.

### Feature ideas
- Multiple timezones side by side (worldclock).
- Analog clock face (`design: 'analog' | 'digital' | 'minimal'`).
- Pomodoro / countdown mode.
- Alarm with an HA service call.
- Seconds as a progress ring.
- Daily progress in percent.

---

## 2. WeatherWidget

**What it does:** Open-Meteo query, current weather + 4-day forecast.

**Config keys:** `lat`, `lon`, `location`, `forecastLayout`, `iconSet`, `hideForecast`, `showHumidity`, `showWind`, `subtextSize`.

### Dead / ineffective settings
- `location`, `lat`, `lon` are partly passed as props, partly read from config — messy.
- No `timezone` → day/night ignores the user's location.
- `subtextSize` visible in the inspector, effect in render unclear (check).

### Quality issues
- `wmoToIcon` / `wmoToText` **duplicated** between Clock and Weather widget.
- `forecast.slice(1, 5)` skips today — bug or intentional (document it).
- `data.daily.weather_code[idx + 1]` on an API with only 4 days → silent fallback to cloud.
- No error state (API 500 = forever loading animation).
- `shrink shrink-0` (Tailwind duplicate) — `shrink` is dead.

### Quick wins
1. Extract `wmoToIcon`/`wmoToText` into `src/lib/weather/wmo.tsx`.
2. Error state: "Weather data unavailable".
3. Fix the forecast index bug or name the slice intent.
4. °C/°F + km/h/mph toggle (Open-Meteo supports this natively).

### Feature ideas
- Provider abstraction: DWD (DE), OpenWeatherMap, Bright Sky.
- Rain radar (DWD tiles or RainViewer).
- Severe weather banner.
- Hourly forecast as a tab.
- Sunrise/sunset + astro line.
- Dynamic background image via Bing-of-the-Day/Unsplash by `weather_code`.
- Minute-precise precipitation nowcast.

---

## 3. CalendarWidget

**What it does:** iCal/Webcal fetched server-side, events as cards or minimal.

**Config keys:** `icalUrl`, `design`, `limit`, `cardOpacity`, `days`, `color`/`accentColor`, `hideOnEmpty`.

### Dead / ineffective settings
- `accentColor` vs. `color`: the render reads both, the inspector only writes `color`. `accentColor` is **legacy dead code**.
- `design === 'minimal'` ignores `cardOpacity` — the slider stays visible anyway.
- `useEffect([icalUrl])` ignores changes to `limit`, `days` → inspector sliders only take effect after a reload.

### Quality issues
- `dayLabel` is assigned twice (dead `let` assignment).
- No pagination/scroll for many events.
- `parseISO` without try/catch — a broken iCal crashes render.
- `isAllDay` flag only from the server, no client fallback.
- `hideOnEmpty` unreliable during the loading phase.
- `isAfter`, `startOfDay` imported but never used.

### Quick wins
1. Extend `useEffect` deps to `[icalUrl, limit, days]`.
2. `parseISO` in try/catch.
3. Migrate `accentColor`, drop the `color` fallback.
4. Scrollbar or a "+3 more" indicator on overflow.
5. Events counter in the inspector badge.

### Feature ideas
- **OAuth for Google / Outlook** instead of iCal URL fiddling.
- Multi-feed with per-source color coding.
- "Today" view vs. "Agenda" mode.
- Week/month grid layout.
- Click an event = details (location, description, attendees).
- Birthday mode for the macOS Family Share ICS.
- Weather overlay per day (reusing the Weather config).
- Countdown to the next event in the header.

---

## 4. ButtonWidget

**What it does:** up to 4 action buttons that dispatch `WIDGET_ACTION` custom events (show/hide other widgets).

**Config keys:** `designLayout`, `btnShape`, `iconScale`, `btnScale`, `bgOpacity`, `bgBlur`, `bgRadius` + per btn 1–4: `label{n}`, `icon{n}`, `actionType{n}`, `targets{n}`, `color{n}`.

### Dead / ineffective settings
- `iconSize`, `fontSize`: passed through to `ActionBtn`, **no UI** in the inspector → dead props.
- `responsiveText`: same.
- `config.color` is read as a fallback, but the Button inspector never writes it → silent leak between widget types.
- `actionType`: only `toggle|show|hide` — **no HA service call**. De facto a show/hide switch only.

### Quality issues
- Touch event handling overengineered (double trigger on iOS).
- No keyboard accessibility (`<div onClick>`).
- `circle` shape overflows when `btnScale > 125`.
- `subtle` shape: label suggests "hover-visible", no hover effect implemented.
- `bgRadius`: inspector label "%", render uses `px` — mismatch.

### Quick wins
1. `bgRadius`: keep the unit consistent.
2. Expose or drop the dead props.
3. `subtle` shape: add a hover BG.
4. Icon picker: Iconify search instead of a rigid 12-icon preset.

### Feature ideas
- `actionType: 'ha_service'` — HA script/scene/service directly.
- `actionType: 'navigate'` — page / dashboard switch.
- `actionType: 'webhook'` — ping any endpoint.
- **Long-press action** as a secondary action.
- Haptic feedback (`navigator.vibrate`).
- More than 4 slots (array migration like the HA widget).
- Visualize toggle state: active targets = button highlighted.

---

## 5. HomeAssistantWidget

**What it does:** HA entities as tiles, 5s polling, tap action, slider for lights/covers, modal for color.

**Config keys:** `entities[]`, `cardTheme`, `cardOpacity`, `cardBlur`, plus legacy suffix keys (stripped on load).

### Dead / ineffective settings
- `config.design === 'minimal'` is rendered, but the inspector **offers no design switch** → dead UI.
- Legacy fallback code (lines 51–58) never reached anymore because the migration runs before load → **dead branch**.

### Quality issues
- **`console.log('HA Widget Rendering!', {...})` in prod** — fires every 5s per entity.
- No abort controller on the fetch.
- Polling fixed at 5s, not configurable, no backoff.
- `handleTap` without `domain`, slider callback with — inconsistent.
- Clickable `<div onClick>` — no keyboard accessibility.
- Active states: `binary_sensor=detected` or `lock=unlocked` aren't recognized.
- `cardOpacity=100` makes the dashboard background invisible.

### Quick wins
1. **Remove the `console.log` immediately.**
2. Delete the legacy fallback block, only `config.entities` now.
3. `<button>` instead of `<div>` for tap rows.
4. Abort controller on polling.
5. Expose the `design` switch in the inspector.
6. Make the polling interval configurable (3s/5s/10s/30s).
7. `ACTIVE_STATES` as a constant.

### Feature ideas
- Group tile (collapsible sub-list).
- Conditional widget-level show (`showIfEntity` analogous to single rows).
- History chart for numeric entities (sparkline).
- Media-player special tile (album art + transport controls).
- Climate dial tile.
- Vacuum/lawnmower special domain with a map.
- Scripts/scenes as an entity with a "Run" button.
- **WebSocket instead of polling** (HA-native, saves massive amounts of requests).
- Long-press → detail modal with `logbook`.

---

## 6. HANotificationWidget

**What it does:** rule-based alerts when HA entities switch into a trigger state.

**Config keys:** `cardTheme`, `cardOpacity`, `cardBlur`, `maxNotifications`, `rules[]` (entityId, triggerState, message, icon, color, durationMinutes, clearEntityId, clearStateVal, clearMatchMode, quitMode, dropOnTriggerLoss, tapAction, tapActionEntity).

### Dead / ineffective settings
- `dropOnTriggerLoss` in the logic, **not in the inspector** — dead feature.
- `design === 'minimal'` is rendered, **no toggle**.
- `ack` branch exists, but **no manual "dismiss" button**.

### Quality issues
- `rules` reference change on parent render → overrender risk.
- Persist state only in component state → **doesn't survive a reload**. Washer finished, reload = alert gone.
- No sound / vibration / push.
- `fetch` without `Content-Type` (inconsistent with the HA widget).
- Time strings hand-built instead of `formatDistanceToNow`.

### Quick wins
1. `dropOnTriggerLoss` toggle in the inspector.
2. Manual X dismiss button.
3. LocalStorage persist for alerts.
4. `formatDistanceToNow` from date-fns.
5. `rules` memoization.

### Feature ideas
- **Ingest HA persistent notifications directly** (HA domain `persistent_notification`) — users no longer need to write rules.
- HA Companion app integration (real push notifications).
- Sound file per rule.
- TTS (HA service `tts.speak`).
- Priority/severity (info/warn/critical) with styling + sorting.
- Grouping of multiple simultaneous alerts.
- Actions in the alert ("seen" / "snooze 10min").
- Alert history (last 50).

---

## Cross-cutting

1. **Glass / card styling duplicated** in HA, HANotification, and Calendar widget. A shared `<GlassCard>` + `useGlassStyle(config)` would save 200+ lines.
2. **`wmoToIcon` / `wmoToText` copy-paste** — move to `src/lib/weather/wmo.tsx`.
3. **Legacy suffix pattern** in Button widget (icon/icon2/icon3/icon4) — no migration yet, follow the HA widget migration.
4. **Logging hygiene** — `console.log` in HA widget in prod, `console.error` scattered everywhere. Central `logger`.
5. **Polling pattern** — every widget has its own `setInterval`, none with AbortController. `useInterval(fn, ms, enabled)` + `refreshInterval` config.
6. **Error UI** convention missing. `<WidgetError>` as a shared component.
7. **Accessibility across the board** — clickable divs. No keyboard / screen reader support.
8. **Widget registry** — the widget type identifier is currently the filename (`ClockWidget.tsx`). A central registry `{id, label, component, inspector, defaults}` would, among other things, tame the bloated inspector props.
9. **Inspector props bloat** — Clock/Weather inspectors get 8 props passed through the parent, 6 of them just for city search. A `useCitySearch()` hook local to the inspectors would eliminate that.
10. **Color key inconsistency** — Calendar: `color`/`accentColor`. HA: `color`. HANotification: `color`. Button: `color`/`color{n}`. A shared convention is missing.
