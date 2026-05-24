"use client";

import { useEffect, useState } from "react";
import { wmoToIcon, wmoToText } from "@/lib/weather/wmo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function ClockWidget({ config }: { config?: any }) {
  const { locale } = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "de-DE";
  const [time, setTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<any>(null);

  // Time Loop
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather Loop
  useEffect(() => {
    if (!config?.showMiniWeather || !config?.lat || !config?.lon) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/weather?lat=${config.lat}&lon=${config.lon}`);
        const result = await res.json();
        if (!result.error) setWeather(result);
      } catch (e) {
        console.error("Failed to fetch mini weather", e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config?.showMiniWeather, config?.lat, config?.lon]);

  if (!time) return <div className="animate-pulse w-full h-full bg-white/5 rounded-xl min-h-[4em]"></div>;

  const timezone = config?.timezone;
  const options: Intl.DateTimeFormatOptions = timezone ? { timeZone: timezone } : {};

  // Day/Night bestimmen: wenn timezone gesetzt, deren Stunde nutzen.
  let hoursInTz = time.getHours();
  if (timezone) {
    try {
      const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(time);
      const parsed = parseInt(h, 10);
      if (!isNaN(parsed)) hoursInTz = parsed;
    } catch {}
  }
  const isDay = hoursInTz > 6 && hoursInTz < 20;
  
  let hours = "00", minutes = "00", seconds = "00";
  let dateStr = "";

  try {
     const timeFormatter = new Intl.DateTimeFormat('de-DE', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' });
     const timeParts = timeFormatter.formatToParts(time);
     hours = timeParts.find(p => p.type === 'hour')?.value || '00';
     minutes = timeParts.find(p => p.type === 'minute')?.value || '00';
     seconds = timeParts.find(p => p.type === 'second')?.value || '00';

     const dateFormatter = new Intl.DateTimeFormat(dateLocale, { ...options, weekday: 'short', day: '2-digit', month: 'short' });
     dateStr = dateFormatter.format(time); // Returns like: "Sa., 11. Apr" / "Sat, 11 Apr"
  } catch (error) {
     hours = time.getHours().toString().padStart(2, '0');
     minutes = time.getMinutes().toString().padStart(2, '0');
     seconds = time.getSeconds().toString().padStart(2, '0');
     const days = locale === "en"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
     const months = locale === "en"
        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        : ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
     dateStr = locale === "en"
        ? `${days[time.getDay()]} ${time.getDate()} ${months[time.getMonth()]}`
        : `${days[time.getDay()]} ${time.getDate().toString().padStart(2, '0')}. ${months[time.getMonth()]}`;
  }

  // Alignment
  const alignClass = config?.align === 'center' ? 'items-center text-center' : config?.align === 'right' ? 'items-end text-right' : 'items-start text-left';
  
  return (
    <div className={`flex flex-col w-full h-full justify-center overflow-hidden ${alignClass} p-4`}>
       {/* Small Top Date */}
       {!config?.hideDate && (
         <div style={{ fontSize: '0.85em' }} className="opacity-90 tracking-wide text-ellipsis whitespace-nowrap overflow-hidden mb-1">
           {dateStr}
         </div>
       )}
       
       {/* Main Clock */}
       <div className="flex items-baseline tracking-tight leading-none mb-2">
         <span style={{ fontSize: '4.5em' }} className="font-bold">{hours}:{minutes}</span>
         {(!config || config?.hideSeconds !== true) && (
            <span style={{ fontSize: '1.8em' }} className="opacity-70 ml-[0.3em] font-medium">{seconds}</span>
         )}
       </div>

       {/* Zusätzliche Zeitzonen (Worldclock) */}
       {Array.isArray(config?.extraTimezones) && config.extraTimezones.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-70 mb-1" style={{ fontSize: '0.65em' }}>
             {config.extraTimezones.map((entry: any, idx: number) => {
                const tz = typeof entry === "string" ? entry : entry?.tz;
                const label = typeof entry === "string"
                   ? tz.split("/").pop()?.replace("_", " ") ?? tz
                   : (entry?.label || (tz?.split("/").pop()?.replace("_", " ") ?? tz));
                if (!tz) return null;
                let h = "--:--";
                try {
                   h = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(time);
                } catch {}
                return (
                   <div key={idx} className="flex items-baseline gap-1">
                      <span className="uppercase tracking-wider opacity-80">{label}</span>
                      <span className="font-mono">{h}</span>
                   </div>
                );
             })}
          </div>
       )}

       {/* Mini Weather */}
       {config?.showMiniWeather && weather?.current && (
          <div className="flex flex-col gap-1 mt-1">
             <div className="flex items-center gap-2">
                <div style={{ width: '1.5em', height: '1.5em' }} className="shrink-0 opacity-90 inline-block drop-shadow-md">
                   {wmoToIcon(weather.current.weather_code, isDay, config.iconSet)}
                </div>
                <span style={{ fontSize: '1.2em' }} className="font-bold drop-shadow-md tracking-wide">
                   {config.location ? config.location.split(',')[0] : 'Weather'}, {Math.round(weather.current.temperature_2m)}°
                </span>
             </div>
             {/* Subtext */}
             <div style={{ fontSize: '0.9em' }} className="font-medium opacity-80 pl-2">
                {wmoToText(weather.current.weather_code, locale)}
                {((config.showHumidity && weather.current.relative_humidity_2m !== undefined) || (config.showWind && weather.current.wind_speed_10m !== undefined)) && (
                   <span className="ml-[0.8em] opacity-80 inline-flex items-center gap-[0.5em]">
                      {config.showHumidity && weather.current.relative_humidity_2m !== undefined && (
                         <span className="flex items-center gap-[0.2em]"><span style={{fontSize: '0.9em'}}>💧</span> {weather.current.relative_humidity_2m}%</span>
                      )}
                      {config.showWind && weather.current.wind_speed_10m !== undefined && (
                         <span className="flex items-center gap-[0.2em]"><span style={{fontSize: '0.9em'}}>💨</span> {Math.round(weather.current.wind_speed_10m)} km/h</span>
                      )}
                   </span>
                )}
             </div>
          </div>
       )}
    </div>
  );
}
