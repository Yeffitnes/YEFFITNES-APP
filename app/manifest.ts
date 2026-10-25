import type { MetadataRoute } from "next";
// App instalable (Android: "Instalar app"; iPhone: Compartir → Añadir a pantalla de inicio).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "YEFFITNES TRAINING", short_name: process.env.NEXT_PUBLIC_APP_NAME || "YEFFITNES", description: "Tu coaching online con Jeff González: rutina, nutrición, agenda y mensajes.",
    start_url: "/inicio", scope: "/", display: "standalone", orientation: "portrait", lang: "es", dir: "ltr",
    background_color: "#0A0910", theme_color: "#0A0910", categories: ["fitness", "health", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mensajes", url: "/inicio/mensajes", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Mi plan", url: "/inicio/plan", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Agenda", url: "/inicio/agenda", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
