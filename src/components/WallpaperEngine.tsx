"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BUNDLED_WALLPAPERS } from "@/lib/wallpaper-engine/bundled";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface WallpaperData {
  id: string;
  url: string;
  metadata?: {
    cameraModel?: string;
    locationName?: string;
    dateTaken?: string;
  };
}

type TransitionKind = "crossfade" | "kenburns" | "slide" | "none";

function resolveTransition(config: any): TransitionKind {
  const t = config?.transitionEffect;
  if (t === "crossfade" || t === "kenburns" || t === "slide" || t === "none") return t;
  if (config?.zoomEffect) return "kenburns"; // backward-compat
  return "crossfade";
}

export default function WallpaperEngine({
  config,
  dashboardId = "1"
}: {
  config?: any;
  dashboardId?: string;
}) {
  const { locale } = useLocale();
  const [images, setImages] = useState<WallpaperData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const source = config?.source || 'unsplash';
    const query = config?.query || 'nature,dark';

    if (source === 'url') {
      setImages([{ id: 'fixed', url: query }]);
      setIsReady(true);
    } else if (source === 'bundled') {
      // Mitgelieferte Bilder aus public/wallpapers/ — gemischt für Abwechslung.
      const list = BUNDLED_WALLPAPERS.map((url, i) => ({ id: `bundled-${i}`, url }));
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setImages(list);
      setIsReady(true);
    } else if (source === 'webdav') {
      fetch(`/api/wallpaper/webdav/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("Failed to load generic WebDAV playlist", err);
           setIsReady(true);
        });
    } else if (source === 'immich') {
      fetch(`/api/wallpaper/immich/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("Failed to load Immich playlist", err);
           setIsReady(true);
        });
    } else {
      const generated = Array.from({ length: 20 }).map((_, i) => ({
        id: `unsplash-${i}-${Date.now()}`,
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' cinematic 4k high resolution realistic photography')}?width=3840&height=2160&seed=${i + Math.floor(Math.random() * 9999999)}&nologo=true`,
        metadata: config?.showMetadata ? { locationName: `Topic: ${query}` } : undefined
      }));
      setImages(generated);
      setIsReady(true);
    }
  }, [config, locale]);

  useEffect(() => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev >= images.length ? 0 : prev));
  }, [images.length]);

  const intervalMs = (config?.intervalSec || 60) * 1000;
  const transition = resolveTransition(config);

  useEffect(() => {
    if (!isReady || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isReady, images.length, intervalMs]);

  // Preload über Image()-Instanzen statt DOM-<img>. Browser-Cache reicht.
  useEffect(() => {
    if (images.length === 0) return;
    const urls = Array.from(new Set([
      images[(currentIndex + 1) % images.length]?.url,
      images[(currentIndex + 2) % images.length]?.url,
    ].filter(Boolean))) as string[];
    const loaders = urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });
    return () => { for (const img of loaders) img.src = ""; };
  }, [currentIndex, images]);

  if (images.length === 0) return <div className="absolute inset-0 bg-black z-0" />;

  const currentImage = images[currentIndex];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black z-0">
      {transition === "kenburns" ? (
        <KenBurnsSlot image={currentImage} intervalMs={intervalMs} />
      ) : transition === "none" ? (
        <img
          src={currentImage.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
        />
      ) : (
        <TwoSlotTransition image={currentImage} mode={transition} />
      )}

      {/* Overlays */}
      {config?.overlayVignette && config.overlayVignette > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 300px rgba(0,0,0,${config.overlayVignette / 100})` }}
         ></div>
      ) : null}

      {config?.overlayBlur && config.overlayBlur > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ backdropFilter: `blur(${config.overlayBlur}px)`, WebkitBackdropFilter: `blur(${config.overlayBlur}px)` }}
         ></div>
      ) : null}

      <div
         className="absolute top-0 inset-x-0 h-[50vh] pointer-events-none"
         style={{
            opacity: (config?.gradientTop ?? 30) / 100,
            background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      <div
         className="absolute bottom-0 inset-x-0 h-[60vh] pointer-events-none"
         style={{
            opacity: (config?.gradientBottom ?? 80) / 100,
            background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      {( (images.length > 1 && (config?.intervalSec || 60) > 0) || (config?.showMetadata !== false && currentImage.metadata && Object.keys(currentImage.metadata).length > 0) ) && (
         <div
            className={`absolute bottom-0 inset-x-0 z-10 flex flex-row items-center justify-between px-6 py-3 ${(config?.metaBgOpacity ?? 40) > 0 ? "backdrop-blur-md border-t border-white/5" : ""}`}
            style={{ backgroundColor: `rgba(0,0,0,${(config?.metaBgOpacity ?? 40) / 100})` }}
         >
           <div className="flex items-center">
              {images.length > 1 && intervalMs > 0 && config?.showTimer !== false ? (
                 <ProgressRing key={currentImage.id} durationMs={intervalMs} />
              ) : <div />}
           </div>
           <div className="flex flex-col items-end text-right">
              {config?.showMetadata !== false && currentImage.metadata && (Object.keys(currentImage.metadata).length > 0) && (
                <div
                   className="flex flex-col items-end uppercase tracking-[0.15em]"
                   style={{
                      fontFamily: `${config?.metaFontFamily || 'Inter'}, sans-serif`,
                      fontSize: config?.metaFontSize ? `${config.metaFontSize}px` : '12px',
                      fontWeight: config?.metaFontWeight || 500,
                      textShadow: config?.metaTextShadow || 'none',
                      color: config?.metaColor || 'rgba(255,255,255,0.8)'
                   }}
                >
                   {config?.metaShowDate !== false && currentImage.metadata.dateTaken && <span>{currentImage.metadata.dateTaken}</span>}
                   {config?.metaShowLocation !== false && currentImage.metadata.locationName && <span>{currentImage.metadata.locationName}</span>}
                   {config?.metaShowCamera !== false && currentImage.metadata.cameraModel && <span>Shot on {currentImage.metadata.cameraModel}</span>}
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}

// Ken-Burns (langsamer Zoom + Opacity-Crossfade) — via Framer-Motion weil
// die Scale-Animation über viele Sekunden läuft und Exit-Animation braucht.
function KenBurnsSlot({ image, intervalMs }: { image: WallpaperData; intervalMs: number }) {
  return (
    <AnimatePresence initial={false}>
      <motion.img
        key={image.id}
        src={image.url}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1.15 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{
          opacity: { duration: 1.5, ease: "easeInOut" },
          scale: { duration: Math.min(intervalMs / 1000 + 1.5, 30), ease: "linear" },
        }}
        className="absolute inset-0 w-full h-full object-cover"
        decoding="async"
      />
    </AnimatePresence>
  );
}

// Zwei-Slot-Ping-Pong, ohne Framer-Motion. Zwei feste <img>-Elemente, die
// nie unmounted werden — nur der aktive Slot wechselt. Billig auf Tizen.
function TwoSlotTransition({ image, mode }: { image: WallpaperData; mode: "crossfade" | "slide" }) {
  const [slotA, setSlotA] = useState<WallpaperData>(image);
  const [slotB, setSlotB] = useState<WallpaperData | null>(null);
  const [active, setActive] = useState<"A" | "B">("A");
  const prevIdRef = useRef<string>(image.id);

  useEffect(() => {
    if (image.id === prevIdRef.current) return;
    prevIdRef.current = image.id;
    // Lade neues Bild in den INAKTIVEN Slot (der steht im Off-Screen-Startzustand),
    // dann in 2 rAFs den aktiven Slot umschalten. Die 2 rAFs geben dem Browser
    // Zeit, das neue <img> mit seinem Startzustand ins Layout zu stecken, bevor
    // wir die Transition triggern.
    if (active === "A") {
      setSlotB(image);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive("B"));
      });
    } else {
      setSlotA(image);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive("A"));
      });
    }
  }, [image.id, active]);

  const slotStyle = (slotName: "A" | "B"): React.CSSProperties => {
    const isActive = slotName === active;
    if (mode === "crossfade") {
      return {
        opacity: isActive ? 1 : 0,
        transition: "opacity 1500ms ease-in-out",
        willChange: "opacity",
      };
    }
    // slide: aktiv → 0, inaktiv → +100% (wartet rechts auf seinen Einsatz).
    // Während des Wechsels läuft es linear von +100% nach 0 bzw. 0 nach -100%.
    return {
      transform: isActive ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
      transition: "transform 1200ms cubic-bezier(0.77, 0, 0.175, 1)",
      willChange: "transform",
    };
  };

  return (
    <>
      <img
        src={slotA.url}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={slotStyle("A")}
        decoding="async"
      />
      {slotB && (
        <img
          src={slotB.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={slotStyle("B")}
          decoding="async"
        />
      )}
    </>
  );
}

function ProgressRing({ durationMs }: { durationMs: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const circumference = 2 * Math.PI * 40;
  return (
    <div className="w-3.5 h-3.5 drop-shadow-md">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" className="stroke-white/30" strokeWidth="16" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-white"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: ready ? circumference : 0,
            transition: `stroke-dashoffset ${durationMs}ms linear`,
          }}
        />
      </svg>
    </div>
  );
}
