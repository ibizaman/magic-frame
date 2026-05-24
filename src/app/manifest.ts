import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Magic Frame",
    short_name: "MagicFrame",
    description:
      "Magic Frame – Smart-Display-Dashboard für Tablets und TVs mit Home-Assistant-, Wetter- und Kalender-Widgets.",
    start_url: "/editor",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
