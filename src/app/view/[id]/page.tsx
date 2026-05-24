"use client";

import { useEffect, useState, use, useRef } from "react";
import io from "socket.io-client";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import WallpaperEngine from "@/components/WallpaperEngine";
import ClockWidget from "@/components/widgets/ClockWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import HomeAssistantWidget from "@/components/widgets/HomeAssistantWidget";
import HANotificationWidget from "@/components/widgets/HANotificationWidget";
import ButtonWidget from "@/components/widgets/ButtonWidget";
import TimerWidget from "@/components/widgets/TimerWidget";
import MessagesWidget from "@/components/widgets/MessagesWidget";
import ShoppingListWidget from "@/components/widgets/ShoppingListWidget";
import TodosWidget from "@/components/widgets/TodosWidget";
import { CustomWidget } from "@/lib/modules/runtime";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardView({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const dashboardId = unwrappedParams.id;
  
  const [layout, setLayout] = useState<any[]>([]);
  const [wallpaperConfig, setWallpaperConfig] = useState<any>(null);
  const [rowHeight, setRowHeight] = useState(40);
  const [userHiddenWidgets, setUserHiddenWidgets] = useState<Record<string, boolean>>({});
  const [autoHiddenWidgets, setAutoHiddenWidgets] = useState<Record<string, boolean>>({});

  useEffect(() => {
     if (typeof window !== "undefined") {
       const computeRowHeight = () => {
          // Bottom offset is 65px. Padding top is 32px (md:pt-8).
          // 23 vertical gaps of 16px = 368px.
          const availableH = (window.innerHeight - 65) - 32 - 368;
          return Math.max(10, Math.floor(availableH / 24));
       };
       // Initial: synchron, ohne Delay.
       setRowHeight((prev) => {
          const next = computeRowHeight();
          return prev === next ? prev : next;
       });
       // Debounced + diff-aware: Tizen feuert manchmal Resize-Bursts
       // (OS-Overlays, Statusbar-Toggles), die sonst rowHeight wackeln lassen.
       let raf = 0;
       let to: any = null;
       const resize = () => {
          if (to) clearTimeout(to);
          to = setTimeout(() => {
             cancelAnimationFrame(raf);
             raf = requestAnimationFrame(() => {
                setRowHeight((prev) => {
                   const next = computeRowHeight();
                   // Nur committen wenn sich tatsächlich was geändert hat.
                   return prev === next ? prev : next;
                });
             });
          }, 150);
       };
       window.addEventListener('resize', resize);
       return () => {
          window.removeEventListener('resize', resize);
          if (to) clearTimeout(to);
          cancelAnimationFrame(raf);
       };
     }
  }, []);

  // Dummy Wallpapers for initial view
  const wallpapers = [
    { id: "1", url: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=1080&q=80", metadata: { cameraModel: "Sony A7III", locationName: "Yosemite" } },
    { id: "2", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80", metadata: { cameraModel: "Leica M10", locationName: "Beach Sunset" } }
  ];

  const objectsEqual = (o1: any, o2: any): boolean => {
    if (o1 === o2) return true;
    if (typeof o1 !== 'object' || o1 === null || typeof o2 !== 'object' || o2 === null) return false;
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) return false;
    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!objectsEqual(o1[key], o2[key])) return false;
    }
    return true;
  };

  const [overrideDashboardId, setOverrideDashboardId] = useState<string | null>(null);
  const effectiveDashboardId = overrideDashboardId || dashboardId;

  // Use ref to avoid stale closures in socket events
  const effectiveIdRef = useRef(effectiveDashboardId);
  useEffect(() => {
     effectiveIdRef.current = effectiveDashboardId;
  }, [effectiveDashboardId]);

  const fetchLayout = async () => {
    try {
      const res = await fetch(`/api/layout/get?dashboardId=${effectiveIdRef.current}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.layout && data.layout.length > 0) {
        setLayout((prev: any[]) => objectsEqual(prev, data.layout) ? prev : data.layout);
        
        setUserHiddenWidgets(prev => {
            const nextHidden = { ...prev };
            let changed = false;
            data.layout.forEach((w: any) => {
                if (!(w.i in prev)) {
                    const hide = !!w.config?.defaultHidden;
                    nextHidden[w.i] = hide;
                    changed = true;
                }
            });
            return changed ? nextHidden : prev;
        });

        if (data.wallpaper) {
           setWallpaperConfig((prev: any) => objectsEqual(prev, data.wallpaper) ? prev : data.wallpaper);
        }
      } else {
         // Fallback if empty database
         setLayout([
           { i: 'clk', x: 0, y: 0, w: 6, h: 4, type: 'ClockWidget.tsx', bgOpacity: 20 },
           { i: 'cal', x: 0, y: 4, w: 6, h: 6, type: 'CalendarWidget.tsx', bgOpacity: 20 },
           { i: 'wth', x: 0, y: 10, w: 12, h: 6, type: 'WeatherWidget.tsx', bgOpacity: 50 },
         ]);
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLayout();
    const interval = setInterval(fetchLayout, 5000);
    return () => clearInterval(interval);
  }, [effectiveDashboardId]);

  useEffect(() => {
    const handleWidgetAction = (e: any) => {
        const { targets, actionType } = e.detail;
        console.log('Received WIDGET_ACTION!', targets, actionType);
        if (!targets || !Array.isArray(targets)) return;
        
        setUserHiddenWidgets(prev => {
            const next = { ...prev };
            for (const tId of targets) {
                if (actionType === 'show') {
                    next[tId] = false;
                } else if (actionType === 'hide') {
                    next[tId] = true;
                } else {
                    // toggle
                    next[tId] = !prev[tId];
                }
            }
            return next;
        });
    };
    window.addEventListener('WIDGET_ACTION', handleWidgetAction);

    const socket = io();
    socket.on('connect', () => {
       console.log('Connected to socket', socket.id);
    });
    socket.on('LAYOUT_UPDATED', () => {
       console.log('Websocket: Layout update received');
       fetchLayout();
    });
    socket.on('FORCE_NAVIGATE', (targetDashboardId) => {
       if (targetDashboardId && targetDashboardId !== dashboardId) {
          setOverrideDashboardId(targetDashboardId);
       }
    });
    socket.on('CLEAR_NAVIGATE', () => {
       setOverrideDashboardId(null);
    });
    socket.on('REFRESH_DEVICE', (targetId: string | null) => {
       // null = alle Displays. Sonst nur das aktuelle Dashboard.
       if (!targetId || targetId === effectiveIdRef.current || targetId === dashboardId) {
          window.location.reload();
       }
    });
    return () => {
       window.removeEventListener('WIDGET_ACTION', handleWidgetAction);
       socket.disconnect();
    };
  }, [dashboardId]); // Only recreate socket mount if base ID changes.

  const renderWidgetContent = (type: string, config: any, id: string) => {
    if (type === 'ClockWidget.tsx') return <ClockWidget config={config} />;
    if (type === 'ButtonWidget.tsx') return <ButtonWidget config={config} />;
    if (type === 'TimerWidget.tsx') return <TimerWidget config={config} dashboardId={dashboardId} />;
    if (type === 'MessagesWidget.tsx') return <MessagesWidget config={config} dashboardId={dashboardId} />;
    if (type === 'ShoppingListWidget.tsx') return <ShoppingListWidget config={config} />;
    if (type === 'TodosWidget.tsx') return <TodosWidget config={config} />;
    if (type === 'CalendarWidget.tsx') return <CalendarWidget
        config={config}
        onVisibilityChange={(isVisible) => setAutoHiddenWidgets(prev => prev[id] === !isVisible ? prev : {...prev, [id]: !isVisible})}
    />;
    if (type === 'WeatherWidget.tsx') return <WeatherWidget config={config} location={config?.location} lat={config?.lat} lon={config?.lon} />;
    if (type === 'HomeAssistantWidget.tsx') return <HomeAssistantWidget
        config={config}
        onVisibilityChange={(isVisible) => setAutoHiddenWidgets(prev => prev[id] === !isVisible ? prev : {...prev, [id]: !isVisible})}
    />;
    if (type === 'HANotificationWidget.tsx') return <HANotificationWidget
        config={config}
        dashboardId={dashboardId}
        onVisibilityChange={(isVisible) => setAutoHiddenWidgets(prev => prev[id] === !isVisible ? prev : {...prev, [id]: !isVisible})}
    />;
    // Custom-Module: type beginnt mit "custom:". Werden zur Laufzeit via
    // <script>-Tag-Injection geladen und rendern via window.MagicFrame-Bridge.
    if (typeof type === 'string' && type.startsWith('custom:')) {
      return <CustomWidget type={type} config={config} dashboardId={dashboardId} />;
    }
    return null;
  };

  return (
    <LocaleProvider>
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans bg-black">
      <WallpaperEngine dashboardId={dashboardId} config={wallpaperConfig} />

      <div className="absolute inset-x-0 top-0 z-20 dashboard-static-grid p-4 md:px-8 md:pt-8" style={{ bottom: '65px' }}>
         <ResponsiveGridLayout
           className="layout"
           layouts={{ lg: layout }}
           breakpoints={{ lg: 0 }}
           cols={{ lg: 24 }}
           rowHeight={rowHeight}
           margin={[16, 16]}
           isDraggable={false}  // Static for the live dashboard
           isResizable={false}  // Static for the live dashboard
           compactType={null}
           preventCollision={true}
         >
           {layout.map(w => {
             const isCardBased = 
               (w.type === 'HomeAssistantWidget.tsx') ||
               (w.type === 'HANotificationWidget.tsx') ||
               (w.type === 'CalendarWidget.tsx' && w.config?.design !== 'minimal');
             const hasOuterBox = !isCardBased && w.bgOpacity > 0;
             const outerBgOpacity = isCardBased ? 0 : w.bgOpacity / 100;
             const paddingClass = isCardBased ? 'p-0' : (hasOuterBox ? 'p-4 md:p-6' : 'p-0');
             const justifyClass = isCardBased ? 'justify-start' : 'justify-center';

              return (
               <div key={w.i}>
                 <div className={`w-full h-full flex ${justifyClass} flex-col ${paddingClass} rounded-3xl overflow-hidden transition-opacity duration-500 ${(userHiddenWidgets[w.i] || autoHiddenWidgets[w.i]) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                      style={{ 
                        containerType: 'size',
                        backgroundColor: `rgba(0,0,0, ${outerBgOpacity})`, 
                        backdropFilter: outerBgOpacity > 0 ? "blur(12px)" : "none",
                        border: outerBgOpacity > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        transform: (w.config?.offsetX || w.config?.offsetY) ? `translate(${w.config?.offsetX || 0}px, ${w.config?.offsetY || 0}px)` : "none",
                      }}>
                      <div className="w-full h-full flex flex-col justify-center"
                           style={{
                            fontSize: w.config?.responsiveText ? `${(w.config.fontSize || 20) / 2}${['HomeAssistantWidget.tsx', 'HANotificationWidget.tsx'].includes(w.type) ? 'cqw' : 'cqmin'}` : (w.config?.fontSize ? `${w.config.fontSize}px` : '20px'),
                            fontFamily: `${w.config?.fontFamily || 'var(--font-geist-sans)'}, sans-serif`,
                            color: w.config?.color || 'inherit',
                            fontWeight: w.config?.fontWeight ? parseInt(w.config.fontWeight) : 'inherit',
                            textShadow: ((w.config?.textShadowBlur ?? 0) > 0 || (w.config?.textShadowX ?? 0) !== 0 || (w.config?.textShadowY ?? 0) !== 0) ? `${w.config?.textShadowX ?? 0}px ${w.config?.textShadowY ?? 4}px ${w.config?.textShadowBlur ?? 0}px rgba(0,0,0,0.8)` : 'none'
                           }}>
                         {renderWidgetContent(w.type, w.config, w.i)}
                      </div>
                 </div>
               </div>
              );
            })}
         </ResponsiveGridLayout>
      </div>

    </div>
    </LocaleProvider>
  );
}
