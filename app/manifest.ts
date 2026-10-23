import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YEFFITNES TRAINING", short_name: "YEFFITNES", start_url: "/inicio", display: "standalone",
    background_color: "#0A0910", theme_color: "#0A0910",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
