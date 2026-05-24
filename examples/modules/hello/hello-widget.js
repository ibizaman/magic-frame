/**
 * Beispiel-Custom-Modul: "Hallo".
 * Build:  node scripts/build-module.mjs examples/modules/hello/hello-widget.js examples/modules/hello/dist
 * Upload: das resultierende module.json + bundle.js in Settings → Module hochladen.
 */

export const manifest = {
  type: "hello",
  label: "Hallo-Welt",
  description: "Begrüßung mit konfigurierbarem Namen — Beispiel-Modul, um den Build-Flow zu testen.",
  iconEmoji: "👋",
  version: "1.0.0",
  author: "Magic Frame",
  fields: [
    {
      key: "name",
      label: "Name",
      type: "text",
      default: "Welt",
      placeholder: "z. B. Emma",
    },
    {
      key: "showEmoji",
      label: "Emoji anzeigen",
      type: "boolean",
      default: true,
    },
    {
      key: "color",
      label: "Textfarbe (überschreibt Wrapper)",
      type: "color",
      help: "Leer = Editor-Default.",
    },
  ],
};

export default function render(ctx) {
  const h = ctx.createElement;
  const name = ctx.config.name || "Welt";
  const showEmoji = ctx.config.showEmoji !== false;
  const colorStyle = ctx.config.color ? { color: ctx.config.color } : {};

  return h(
    "div",
    {
      className: "w-full h-full flex flex-col items-center justify-center gap-[0.3em]",
      style: colorStyle,
    },
    h(
      "div",
      { className: "text-[1.5em] font-bold" },
      showEmoji ? `👋 Hallo, ${name}!` : `Hallo, ${name}!`,
    ),
    h(
      "div",
      { className: "text-[0.7em] opacity-60" },
      "Mein erstes Custom-Modul",
    ),
  );
}
