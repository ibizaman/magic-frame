"use client";

import React, { useState } from 'react';
import { X, FolderSync, RefreshCw } from 'lucide-react';
import type { WallpaperConfig } from '../_types';
import { useT } from "@/lib/i18n/LocaleProvider";

export type ImmichAlbum = { id: string; albumName: string; assetCount: number };

type WallpaperSettingsModalProps = {
  onClose?: () => void;
  wallpaper: WallpaperConfig;
  setWallpaper: React.Dispatch<React.SetStateAction<WallpaperConfig>>;
  webdavFolders: any[];
  fetchWebdavFolders: (path?: string) => void;
  isFetchingFolders: boolean;
  webdavError: string;
  variant?: "modal" | "inline";
  // Immich-Alben (optional — wenn nicht übergeben, bleibt der manuelle ID-Fallback)
  immichAlbums?: ImmichAlbum[];
  fetchImmichAlbums?: () => void;
  isFetchingAlbums?: boolean;
  immichError?: string;
};

type WpTab = "source" | "display" | "overlays";

export default function WallpaperSettingsModal({
  onClose,
  wallpaper,
  setWallpaper,
  webdavFolders,
  fetchWebdavFolders,
  isFetchingFolders,
  webdavError,
  variant = "modal",
  immichAlbums,
  fetchImmichAlbums,
  isFetchingAlbums = false,
  immichError = "",
}: WallpaperSettingsModalProps) {
  const t = useT();
  const [tab, setTab] = useState<WpTab>("source");

  const TABS: { key: WpTab; label: string }[] = [
    { key: "source", label: "Quelle" },
    { key: "display", label: "Anzeige" },
    { key: "overlays", label: "Overlays & Text" },
  ];

  const inner = (
    <>
       {variant === "modal" && (
         <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="font-bold text-2xl text-white">{t("Wallpaper Engine")}</h3>
               <p className="text-white/50 text-sm mt-1">{t("Display-Hintergründe konfigurieren")}</p>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2" title={t("Schließen")}><X size={18} /></button>
         </div>
       )}

       {/* Untertabs — der Modal war als eine lange Spalte zu groß. */}
       <div className="flex gap-1 mb-6 border-b border-white/10">
          {TABS.map(({ key, label }) => (
             <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                   tab === key
                      ? "border-blue-500 text-white"
                      : "border-transparent text-white/50 hover:text-white/80"
                }`}
             >
                {t(label)}
             </button>
          ))}
       </div>

       <div className="space-y-6">
          {/* ─────────────── TAB: QUELLE ─────────────── */}
          {tab === "source" && (
            <>
             <div>
                <label className="text-sm font-medium text-white/80 block mb-2">{t("Provider")}</label>
                <select
                   value={wallpaper.source}
                   onChange={(e) => setWallpaper({ ...wallpaper, source: e.target.value })}
                   className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                >
                   <option value="bundled">{t("Mitgelieferte Bilder (Standard)")}</option>
                   <option value="unsplash">{t("Unsplash (Dynamisch via Suchbegriff)")}</option>
                   <option value="url">{t("Feste Bild-URL")}</option>
                   <option value="webdav">{t("Lokaler NAS Ordner (WebDAV)")}</option>
                   <option value="immich">{t("Immich API (Album)")}</option>
                </select>
             </div>

             {wallpaper.source === 'bundled' ? (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white/60 leading-relaxed">
                   {t("20 mitgelieferte Bilder — kein Setup nötig. Ideal als Start für einen neuen View. Du kannst jederzeit auf eine eigene Quelle (Immich, NAS, URL) wechseln.")}
                </div>
             ) : wallpaper.source === 'immich' ? (
                <div className="space-y-4">
                   <div>
                      <label className="text-sm font-medium text-white/80 block mb-2">{t("Immich Instanz URL (Domain)")}</label>
                      <input
                         type="text" value={wallpaper.immichUrl || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, immichUrl: e.target.value })}
                         placeholder="http://192.168.178.50:2283"
                         className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-white/80 block mb-2">{t("API-Key (Read Only)")}</label>
                      <input
                         type="password" value={wallpaper.immichApiKey || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, immichApiKey: e.target.value })}
                         placeholder="•••••••••••••••••••••"
                         className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>

                   {fetchImmichAlbums ? (
                     <div className="space-y-3">
                        <button
                           type="button"
                           onClick={() => fetchImmichAlbums()}
                           disabled={isFetchingAlbums || !wallpaper.immichUrl || !wallpaper.immichApiKey}
                           className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isFetchingAlbums
                             ? <><RefreshCw size={16} className="animate-spin" /> {t("Lade Alben…")}</>
                             : <><FolderSync size={16} /> {t("Mit Immich verbinden / Alben laden")}</>}
                        </button>

                        {immichError && (
                           <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                              {t(immichError)}
                           </div>
                        )}

                        {immichAlbums && immichAlbums.length > 0 && (
                           <div>
                              <label className="text-sm font-medium text-white/80 block mb-2">
                                 {t("Album auswählen ({n} gefunden)").replace("{n}", String(immichAlbums.length))}
                              </label>
                              <select
                                 value={wallpaper.immichAlbumId || ''}
                                 onChange={(e) => setWallpaper({ ...wallpaper, immichAlbumId: e.target.value })}
                                 className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                              >
                                 <option value="">{t("— Album wählen —")}</option>
                                 {immichAlbums.map((al) => (
                                    <option key={al.id} value={al.id}>
                                       {al.albumName} ({al.assetCount} {t("Fotos")})
                                    </option>
                                 ))}
                              </select>
                           </div>
                        )}

                        {immichAlbums && immichAlbums.length === 0 && !isFetchingAlbums && !immichError && (
                           <p className="text-xs text-white/40 px-1">
                              {t("Noch keine Alben geladen. URL + API-Key eintragen und „Alben laden“ drücken.")}
                           </p>
                        )}

                        {wallpaper.immichAlbumId && (
                           <p className="text-[11px] text-white/30 px-1 font-mono">
                              {t("Ausgewählte ID:")} {wallpaper.immichAlbumId}
                           </p>
                        )}
                     </div>
                   ) : (
                     <div>
                        <label className="text-sm font-medium text-white/80 block mb-2">{t("Album ID (manuell)")}</label>
                        <input
                           type="text" value={wallpaper.immichAlbumId || ''}
                           onChange={(e) => setWallpaper({ ...wallpaper, immichAlbumId: e.target.value })}
                           placeholder={t("z.B. a2f...")}
                           className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                        />
                     </div>
                   )}
                </div>
             ) : wallpaper.source === 'webdav' ? (
                <div className="space-y-4">
                   <div>
                      <label className="text-sm font-medium text-white/80 block mb-2">{t("WebDAV Server-URL (z.B. NAS)")}</label>
                      <input
                         type="text" value={wallpaper.webdavUrl || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, webdavUrl: e.target.value })}
                         placeholder="http://192.168.178.50:5005"
                         className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                         <label className="text-sm font-medium text-white/80 block mb-2">{t("Benutzername")}</label>
                         <input
                            type="text" value={wallpaper.webdavUser || ''}
                            onChange={(e) => setWallpaper({ ...wallpaper, webdavUser: e.target.value })}
                            placeholder="admin"
                            className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                         />
                      </div>
                      <div>
                         <label className="text-sm font-medium text-white/80 block mb-2">{t("Passwort")}</label>
                         <input
                            type="password" value={wallpaper.webdavPass || ''}
                            onChange={(e) => setWallpaper({ ...wallpaper, webdavPass: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                         />
                      </div>
                   </div>

                   <div className="pt-2">
                      <button
                         onClick={() => fetchWebdavFolders(wallpaper.webdavPath || "/")}
                         disabled={isFetchingFolders}
                         className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                         {isFetchingFolders ? t("Verbinde...") : t("NAS Verbinden / Ordner wählen")}
                      </button>
                   </div>

                   {webdavError && (
                      <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                         {t(webdavError)}
                      </div>
                   )}

                   {(webdavFolders.length > 0 || wallpaper.webdavPath) && (
                      <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden mt-4">
                         <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <span className="text-sm font-mono text-cyan-300 overflow-hidden text-ellipsis whitespace-nowrap mr-2">
                               {wallpaper.webdavPath || "/"}
                            </span>
                            {wallpaper.webdavPath && wallpaper.webdavPath !== "/" && (
                               <button
                                  onClick={() => {
                                     const parts = wallpaper.webdavPath!.replace(/\/$/, '').split('/');
                                     parts.pop();
                                     const parent = parts.length > 0 ? parts.join('/') : '/';
                                     fetchWebdavFolders(parent === "" ? "/" : parent);
                                  }}
                                  className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white font-medium flex-shrink-0"
                               >
                                  {t("Zurück")}
                               </button>
                            )}
                         </div>
                         <div className="max-h-[200px] overflow-y-auto">
                            {webdavFolders.length === 0 && !isFetchingFolders ? (
                               <div className="p-4 text-center text-white/50 text-sm">{t("Keine Unterordner")}</div>
                            ) : (
                               webdavFolders.map(folder => (
                                  <button
                                     key={folder.filename}
                                     onClick={() => fetchWebdavFolders(folder.filename)}
                                     className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 text-sm text-white/80 flex items-center gap-2 transition-colors last:border-0"
                                  >
                                     <span className="text-yellow-500 opacity-80">📁</span>
                                     <span>{folder.basename}</span>
                                  </button>
                               ))
                            )}
                         </div>
                      </div>
                   )}
                </div>
             ) : (
                <div>
                   <label className="text-sm font-medium text-white/80 block mb-2">
                      {wallpaper.source === 'unsplash' ? t("Suchbegriffe (komma-getrennt)") : t("Bild-URL (https://...)")}
                   </label>
                   <input
                      type="text" value={wallpaper.query}
                      onChange={(e) => setWallpaper({ ...wallpaper, query: e.target.value })}
                      placeholder={wallpaper.source === 'unsplash' ? 'nature, mountains, dark' : 'https://...'}
                      className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                   />
                </div>
             )}

             {(wallpaper.source === 'bundled' || wallpaper.source === 'unsplash' || wallpaper.source === 'webdav' || wallpaper.source === 'immich') && (
                <div>
                   <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
                      <span>{t("Bildwechsel Intervall (Sekunden)")}</span>
                      <span className="text-blue-400">{wallpaper.intervalSec}s</span>
                   </label>
                   <input
                      type="range" min="10" max="3600" step="10" value={wallpaper.intervalSec}
                      onChange={(e) => setWallpaper({ ...wallpaper, intervalSec: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10"
                   />
                </div>
             )}
            </>
          )}

          {/* ─────────────── TAB: ANZEIGE ─────────────── */}
          {tab === "display" && (
            <>
                <div>
                   <label className="text-sm font-medium text-white/80 block mb-2">{t("Übergangseffekt")}</label>
                   <select
                      value={wallpaper.transitionEffect ?? (wallpaper.zoomEffect ? "kenburns" : "crossfade")}
                      onChange={(e) => {
                         const next = e.target.value as "crossfade" | "kenburns" | "slide" | "none";
                         setWallpaper({
                            ...wallpaper,
                            transitionEffect: next,
                            // zoomEffect synchron halten für Legacy-Pfade
                            zoomEffect: next === "kenburns",
                         });
                      }}
                      className="w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="crossfade">{t("Crossfade (sanfte Blende)")}</option>
                      <option value="kenburns">{t("Ken Burns (langsamer Zoom)")}</option>
                      <option value="slide">{t("Slide (Push von rechts)")}</option>
                      <option value="none">{t("Hart (kein Effekt)")}</option>
                   </select>
                   <p className="text-[11px] text-white/40 mt-1">
                      {t("Ken Burns ist effektvoll, aber auf alten TV-Browsern (Tizen) spürbar schwerer. Bei Stottern auf Crossfade oder Hart wechseln.")}
                   </p>
                </div>
                <div>
                   <label className="text-sm font-medium text-white/80 block mb-2">{t("Bildanzeige")}</label>
                   <select
                      value={wallpaper.fit ?? "cover"}
                      onChange={(e) => setWallpaper({ ...wallpaper, fit: e.target.value as "cover" | "contain" | "fill" | "none" })}
                      className="w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="cover">{t("Füllen (Ausschnitt, Standard)")}</option>
                      <option value="contain">{t("Einpassen (ganzes Bild)")}</option>
                      <option value="fill">{t("Strecken (verzerrt)")}</option>
                      <option value="none">{t("Zentriert (Originalgröße)")}</option>
                   </select>
                   <p className="text-[11px] text-white/40 mt-1">
                      {t("Füllen schneidet Ränder ab. Einpassen zeigt das ganze Bild ohne Beschneiden — gut für Hochformat-Fotos.")}
                   </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input
                         type="checkbox"
                         checked={wallpaper.showTimer !== false}
                         onChange={(e) => setWallpaper({ ...wallpaper, showTimer: e.target.checked })}
                         className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{t("Ladekreis (Timer) anzeigen")}</span>
                </label>
            </>
          )}

          {/* ─────────────── TAB: OVERLAYS & TEXT ─────────────── */}
          {tab === "overlays" && (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                   <div>
                      <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
                         <span>{t("Schatten Oben")}</span>
                         <span className="text-blue-400">{wallpaper.gradientTop ?? 30}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.gradientTop ?? 30}
                         onChange={(e) => setWallpaper({ ...wallpaper, gradientTop: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-black"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
                         <span>{t("Schatten Unten")}</span>
                         <span className="text-blue-400">{wallpaper.gradientBottom ?? 80}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.gradientBottom ?? 80}
                         onChange={(e) => setWallpaper({ ...wallpaper, gradientBottom: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-black"
                      />
                   </div>
                   <div className="col-span-2 border-t border-white/5 pt-3 mt-1" />
                   <div>
                      <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
                         <span>{t("Vignette Effekt")}</span>
                         <span className="text-blue-400">{wallpaper.overlayVignette ?? 85}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.overlayVignette ?? 85}
                         onChange={(e) => setWallpaper({ ...wallpaper, overlayVignette: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-black"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
                         <span>{t("Unschärfe (Blur)")}</span>
                         <span className="text-blue-400">{wallpaper.overlayBlur ?? 0}px</span>
                      </label>
                      <input
                         type="range" min="0" max="30" step="1" value={wallpaper.overlayBlur ?? 0}
                         onChange={(e) => setWallpaper({ ...wallpaper, overlayBlur: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-black"
                      />
                   </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input
                         type="checkbox"
                         checked={wallpaper.showMetadata}
                         onChange={(e) => setWallpaper({ ...wallpaper, showMetadata: e.target.checked })}
                         className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{t("Metadata/EXIF einblenden")}</span>
                </label>

                {wallpaper.showMetadata && (
                   <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowDate !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowDate: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">{t("Datum & Uhrzeit")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowCamera !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowCamera: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">{t("Kamera-Modell")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowLocation !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowLocation: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">{t("Aufnahmeort (GPS)")}</span>
                      </label>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-3 rounded-lg border border-white/5">
                         <div className="col-span-2">
                            <label className="text-[10px] font-medium text-white/40 block mb-1 uppercase tracking-wider">{t("Hintergrund-Balken Deckkraft")}</label>
                            <div className="flex items-center gap-2">
                               <input
                                  type="range" min="0" max="100" step="10" value={wallpaper.metaBgOpacity ?? 40}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaBgOpacity: parseInt(e.target.value) })}
                                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10"
                               />
                               <span className="text-xs text-white/60 w-8">{wallpaper.metaBgOpacity ?? 40}%</span>
                            </div>
                         </div>

                         <div className="col-span-2 border-t border-white/10 my-1 pt-3" />

                         <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] font-medium text-white/40 block mb-1 uppercase tracking-wider">{t("Schriftfarbe")}</label>
                               <input
                                  type="color" value={wallpaper.metaColor || '#ffffff'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaColor: e.target.value })}
                                  className="w-full h-10 bg-black border border-white/10 rounded-lg cursor-pointer"
                               />
                            </div>
                            <div>
                               <label className="text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider flex justify-between">
                                  <span>{t("Schatten (Blur)")}</span>
                                  <span className="text-purple-400">{wallpaper.metaTextShadowBlur ?? 0}px</span>
                               </label>
                               <input
                                  type="range" min="0" max="20" value={wallpaper.metaTextShadowBlur ?? 0}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaTextShadowBlur: parseInt(e.target.value) })}
                                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-white/10 mt-3"
                               />
                            </div>

                            <div>
                               <label className="text-[10px] font-medium text-white/40 block mb-1 uppercase tracking-wider">{t("Basis-Schriftart")}</label>
                               <select
                                  value={wallpaper.metaFontFamily || 'Inter'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaFontFamily: e.target.value })}
                                  className="w-full bg-black border border-white/10 text-white font-sans text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                               >
                                  <option value="Inter">{t("Inter (Clean)")}</option>
                                  <option value="Courier New">{t("Courier (Retro)")}</option>
                                  <option value="Orbitron">{t("Orbitron (Digital)")}</option>
                                  <option value="Cutive Mono">{t("Cutive Mono (Typewriter)")}</option>
                                  <option value="Roboto">{t("Roboto (Android)")}</option>
                                  <option value="Montserrat">{t("Montserrat (Modern)")}</option>
                                  <option value="SF Pro Display">{t("SF Pro (Apple)")}</option>
                                  <option value="Playfair Display">{t("Playfair (Serif)")}</option>
                                  <option value="Lato">{t("Lato (Rund)")}</option>
                                  <option value="Oswald">{t("Oswald (Kompakt)")}</option>
                                  <option value="Outfit">{t("Outfit (Rund)")}</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] font-medium text-white/40 block mb-1 uppercase tracking-wider">{t("Dicke (Weight)")}</label>
                               <select
                                  value={wallpaper.metaFontWeight || '300'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaFontWeight: e.target.value })}
                                  className="w-full bg-black border border-white/10 text-white font-sans text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                               >
                                  <option value="100">{t("100 - Sehr dünn")}</option>
                                  <option value="300">{t("300 - Dünn (Standard)")}</option>
                                  <option value="400">{t("400 - Normal")}</option>
                                  <option value="500">{t("500 - Medium")}</option>
                                  <option value="700">{t("700 - Fett")}</option>
                                  <option value="900">{t("900 - Ultra Fett")}</option>
                               </select>
                            </div>
                         </div>

                         <div className="col-span-2 mt-2">
                            <label className="text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider flex justify-between">
                              <span>{t("Schriftgröße (Standard: 12px)")}</span>
                              <span className="text-green-400">{wallpaper.metaFontSize ?? 12}px</span>
                            </label>
                            <input
                               type="range" min="8" max="40" step="1" value={wallpaper.metaFontSize ?? 12}
                               onChange={(e) => setWallpaper({ ...wallpaper, metaFontSize: parseInt(e.target.value) })}
                               className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-500 bg-white/10 mt-2"
                            />
                         </div>
                      </div>
                   </div>
                )}
            </>
          )}
       </div>

       <p className="text-xs text-white/40 mt-6 bg-white/5 p-4 rounded-xl border border-white/5">
          {t("Hinweis: Speichern Sie das Layout über den blauen Button oben rechts, damit die Wallpaper Engine auf dem Display aktualisiert wird.")}
       </p>
    </>
  );

  if (variant === "inline") {
    return <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">{inner}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-3xl nodrag max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
}
