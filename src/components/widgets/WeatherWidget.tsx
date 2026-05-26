"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Droplets, Wind, Sunrise, Sunset, Sun } from "lucide-react";
import { wmoToIcon } from "@/lib/weather/wmo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type StatIconKey = "droplets" | "wind" | "sunrise" | "sunset" | "uv";

function StatIcon({ k, sizeEm = 1 }: { k: StatIconKey; iconSet?: string; sizeEm?: number }) {
  // Stat-Icons sind immer Line-Icons (Lucide), unabhängig vom Wetter-iconSet.
  // Vorher gab's einen Emoji-Branch für celestial/forecast — sah inkonsistent
  // aus zwischen Hauptkarte und Subtext.
  const style: CSSProperties = { width: `${sizeEm}em`, height: `${sizeEm}em` };
  const cls = "opacity-80";
  if (k === "droplets") return <Droplets style={style} strokeWidth={2} className={cls} />;
  if (k === "wind") return <Wind style={style} strokeWidth={2} className={cls} />;
  if (k === "sunrise") return <Sunrise style={style} strokeWidth={2} />;
  if (k === "sunset") return <Sunset style={style} strokeWidth={2} />;
  if (k === "uv") return <Sun style={style} strokeWidth={2} className={cls} />;
  return null;
}

export default function WeatherWidget({ config, location, lat, lon }: { config?: any, location?: string, lat?: string, lon?: string }) {
  const { locale, t } = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "de-DE";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const unitTemp: "celsius" | "fahrenheit" = config?.unitTemp === "fahrenheit" ? "fahrenheit" : "celsius";
  const unitWind: "kmh" | "mph" | "ms" | "kn" =
    config?.unitWind === "mph" || config?.unitWind === "ms" || config?.unitWind === "kn"
      ? config.unitWind
      : "kmh";

  const provider: string = config?.provider || "open-meteo";
  const haEntity: string = config?.haEntity || "";
  const needsLatLon = provider !== "home-assistant";

  useEffect(() => {
    if (needsLatLon && (!lat || !lon)) return;
    if (provider === "home-assistant" && !haEntity) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const qs = new URLSearchParams({
          temperature_unit: unitTemp,
          wind_speed_unit: unitWind,
          provider,
        });
        if (lat) qs.set("lat", String(lat));
        if (lon) qs.set("lon", String(lon));
        if (haEntity) qs.set("haEntity", haEntity);
        const res = await fetch(`/api/weather?${qs.toString()}`, { signal: controller.signal });
        const result = await res.json();
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setData(result);
        setError(null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (!cancelled) setError(t("Wetterdaten nicht verfügbar"));
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [lat, lon, unitTemp, unitWind, provider, haEntity, needsLatLon]);

  if (needsLatLon && (!lat || !lon)) {
     return <div className="text-white/50 text-sm text-center">{t("Wetter")}<br/>({t("Lat/Lon in Config eintragen")})</div>;
  }
  if (provider === "home-assistant" && !haEntity) {
     return <div className="text-white/50 text-sm text-center">{t("Wetter")}<br/>({t("HA-Entity in Config eintragen, z.B. weather.home")})</div>;
  }

  if (error) return <div className="text-red-400/80 text-sm text-center">⚠ {error}</div>;
  if (!data) return <div className="text-white/50 text-sm">{t("Lade Wetter…")}</div>;

  const tempSuffix = unitTemp === "fahrenheit" ? "°F" : "°";
  const windUnitLabel = unitWind === "mph" ? "mph" : unitWind === "ms" ? "m/s" : unitWind === "kn" ? "kn" : "km/h";
  const currentTemp = Math.round(data.current.temperature_2m);
  const feelsLike = Math.round(data.current.apparent_temperature);
  const currentCode = data.current.weather_code;
  const humidity = data.current.relative_humidity_2m;
  const windSpeed = data.current.wind_speed_10m;
  
  // Open-Meteo is_day: 1 = Tag, 0 = Nacht (bezieht sich auf den lat/lon).
  const isNight = typeof data.current.is_day === "number"
    ? data.current.is_day === 0
    : (new Date().getHours() < 6 || new Date().getHours() > 20);

  const sunrise = data.daily?.sunrise?.[0];
  const sunset = data.daily?.sunset?.[0];
  const formatHm = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  };

  // Forecast: Tage ab morgen (idx 0 = heute, wird bereits als current oben angezeigt).
  const forecastDays = Math.max(1, Math.min(6, config?.forecastDays ?? 4));
  const forecastRaw = data.daily.time.slice(1, 1 + forecastDays);
  const forecast = forecastRaw
    .map((dateStr: string, idx: number) => {
      const realIdx = idx + 1;
      if (data.daily.weather_code[realIdx] === undefined) return null;
      const dayName = new Date(dateStr).toLocaleDateString(dateLocale, { weekday: 'short' });
      return {
        day: dayName,
        code: data.daily.weather_code[realIdx],
        max: Math.round(data.daily.temperature_2m_max[realIdx]),
        min: Math.round(data.daily.temperature_2m_min[realIdx]),
      };
    })
    .filter(Boolean);

  const isVertical = config?.forecastLayout === 'vertical';
  const flexDirectionClass = isVertical ? 'flex-col gap-[1.5em]' : 'gap-[2em] md:gap-[3em]';
  const subtextSizeEm = 1.2 * (config?.subtextSize ? config.subtextSize / 100 : 1);
  // Stats-Zeile (Luftfeuchte/Wind/UV) wird in Pixel angegeben, nicht in em.
  // Grund: em skaliert mit der Widget-Schriftgröße — wenn das Widget groß
  // war, wurden bei 200% die Stats fast so groß wie die Hauptanzeige.
  // Mit px bleibt die Stats-Größe absolut und unabhängig vom Widget.
  const statsSizePx = typeof config?.statsSize === 'number' ? config.statsSize : 14;
  const subtextOpacity = (config?.subtextOpacity ?? 80) / 100;
  const subtextUppercase = config?.subtextUppercase === true;
  const subtextTracking = config?.subtextTracking ?? "wide";
  const subtextTrackingClass =
    subtextTracking === "normal" ? "" : subtextTracking === "widest" ? "tracking-widest" : "tracking-wide";

  // Ort-Label-Styling
  const locationSizeEm = 0.8 * ((config?.locationSize ?? 100) / 100);
  const locationOpacity = (config?.locationOpacity ?? 60) / 100;
  const locationUppercase = config?.locationUppercase !== false;
  const locationTracking = config?.locationTracking ?? "widest";
  const trackingClass =
    locationTracking === "normal" ? "" : locationTracking === "wide" ? "tracking-wide" : "tracking-widest";

  const uv = typeof data.current?.uv_index === "number" ? data.current.uv_index : undefined;
  const iconSet = config?.iconSet;

  // Hourly-Strip
  const showHourly = !!config?.showHourly;
  const hourlyHours = Math.max(4, Math.min(24, config?.hourlyHours ?? 12));
  const hourlyData = (() => {
    const h = data.hourly;
    if (!showHourly || !h || !Array.isArray(h.time)) return null;
    const now = Date.now();
    // erste zukunfts-Stunde finden
    let startIdx = h.time.findIndex((t: string) => new Date(t).getTime() >= now - 60 * 60 * 1000);
    if (startIdx < 0) startIdx = 0;
    const slice = h.time.slice(startIdx, startIdx + hourlyHours);
    if (slice.length === 0) return null;
    return slice.map((iso: string, i: number) => {
      const idx = startIdx + i;
      const d = new Date(iso);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const isNow = i === 0;
      return {
        label: isNow ? t("Jetzt") : `${hh}:${mm}`,
        temp: Math.round(h.temperature_2m[idx] ?? 0),
        code: h.weather_code[idx] ?? 0,
        pop: typeof h.precipitation_probability?.[idx] === "number" ? h.precipitation_probability[idx] : 0,
        isDay: typeof h.is_day?.[idx] === "number" ? h.is_day[idx] === 1 : true,
      };
    });
  })();

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className={`flex items-center justify-center flex-1 overflow-hidden ${flexDirectionClass}`}>
      {/* Current Weather */}
      <div className="flex flex-col min-w-0 overflow-hidden shrink-0">
        {location && (
           <span
              style={{ fontSize: `${locationSizeEm}em`, opacity: locationOpacity }}
              className={`mb-[0.2em] ${locationUppercase ? "uppercase" : ""} ${trackingClass} text-ellipsis whitespace-nowrap overflow-hidden block`}
           >
              {location}
           </span>
        )}
        <div className="flex items-center gap-[0.5em]">
          <span style={{ fontSize: '4.2em' }} className="tracking-tighter leading-none">{currentTemp}{tempSuffix}</span>
          <div style={{ width: '2.2em', height: '2.2em' }} className="shrink-0">
             {wmoToIcon(currentCode, !isNight, config?.iconSet)}
          </div>
        </div>
        <div
           style={{ fontSize: `${subtextSizeEm}em`, opacity: subtextOpacity }}
           className={`mt-[0.5em] ${subtextUppercase ? "uppercase" : ""} ${subtextTrackingClass} text-ellipsis whitespace-nowrap overflow-hidden`}
        >
          {t("Fühlt sich an wie")} {feelsLike}{tempSuffix}
        </div>
        {/* Stats-Zeile separat — darf auf neue Zeile umbrechen wenn Widget
            schmal/groß ist (zB große Hauptansicht). Vorher in der Subtext-Zeile
            mit whitespace-nowrap → wurde abgeschnitten. Eigener statsSize-Slider,
            damit User UV/Wind/Feuchte unabhängig von "Fühlt sich an wie" skaliert. */}
        {((config?.showHumidity && humidity !== undefined) || (config?.showWind && windSpeed !== undefined) || (config?.showUv && uv !== undefined)) && (
          <div
             style={{ fontSize: `${statsSizePx}px`, opacity: subtextOpacity }}
             className={`mt-[0.3em] ${subtextUppercase ? "uppercase" : ""} ${subtextTrackingClass} flex flex-wrap items-center gap-x-[0.8em] gap-y-[0.2em]`}
          >
            {config?.showHumidity && humidity !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="droplets" iconSet={iconSet} />
                 {humidity}%
              </span>
            )}
            {config?.showWind && windSpeed !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="wind" iconSet={iconSet} />
                 {Math.round(windSpeed)} {windUnitLabel}
              </span>
            )}
            {config?.showUv && uv !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="uv" iconSet={iconSet} />
                 UV {Math.round(uv)}
              </span>
            )}
          </div>
        )}
        {config?.showSunTimes !== false && (sunrise || sunset) && (
          <div style={{ fontSize: `${subtextSizeEm * 0.8}em` }} className="mt-[0.3em] opacity-60 inline-flex items-center gap-[0.8em]">
            {sunrise && (
               <span className="inline-flex items-center gap-[0.3em]">
                  <StatIcon k="sunrise" iconSet={iconSet} />
                  {formatHm(sunrise)}
               </span>
            )}
            {sunset && (
               <span className="inline-flex items-center gap-[0.3em]">
                  <StatIcon k="sunset" iconSet={iconSet} />
                  {formatHm(sunset)}
               </span>
            )}
          </div>
        )}
      </div>

      {/* Forecast Row */}
      {!config?.hideForecast && (
        <div className="flex gap-[1em] md:gap-[1.5em] shrink-0 items-center justify-end">
          {forecast.map((day: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-[0.4em]">
              <span style={{ fontSize: '0.9em' }} className="opacity-80 tracking-wide font-medium">{day.day}</span>
              <div style={{ width: '1.4em', height: '1.4em' }} className="opacity-90 drop-shadow-sm">
                 {wmoToIcon(day.code, true, config?.iconSet)}
              </div>
              <div className="flex flex-col items-center leading-tight mt-1" style={{ fontSize: '0.85em' }}>
                <span className="font-bold">{day.max}{tempSuffix}</span>
                <span className="opacity-50">{day.min}{tempSuffix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Hourly Strip */}
      {hourlyData && hourlyData.length > 0 && (
        <div
          className="mt-[0.8em] pt-[0.8em] border-t border-white/10 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          <div className="flex gap-[1.2em] items-end" style={{ minWidth: "max-content" }}>
            {hourlyData.map((h: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-[0.25em] shrink-0">
                <span style={{ fontSize: '0.65em' }} className="opacity-70 uppercase tracking-wider font-medium whitespace-nowrap">
                  {h.label}
                </span>
                <div style={{ width: '1.2em', height: '1.2em' }} className="opacity-90 drop-shadow-sm">
                  {wmoToIcon(h.code, h.isDay, config?.iconSet)}
                </div>
                {h.pop > 5 && (
                  <span style={{ fontSize: '0.55em' }} className="text-cyan-300 font-medium leading-none">
                    {h.pop}%
                  </span>
                )}
                <span style={{ fontSize: '0.85em' }} className="font-bold leading-none">
                  {h.temp}{tempSuffix}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
