import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { NoZoom } from "@/components/NoZoom";
import { InstallGate } from "@/components/InstallGate";
const display = Instrument_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
// Dirección pública: en Netlify la da la variable URL; en otro lugar se define NEXT_PUBLIC_SITE_URL (dominio propio).
const VERCEL = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL; // Vercel (pruebas) no define URL: sin esto la imagen al compartir apuntaba a localhost
const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || (VERCEL ? `https://${VERCEL}` : "http://localhost:3000");
// Nombre de la app instalada. En el sitio de pruebas (Vercel) se pone NEXT_PUBLIC_APP_NAME="YEFFITNES Test" para distinguirla.
const SHORT = process.env.NEXT_PUBLIC_APP_NAME || "YEFFITNES";
const OG = process.env.NEXT_PUBLIC_APP_NAME ? "/og-test.png" : "/og.png"; // en pruebas la imagen lleva la etiqueta TEST
const DESC = "Tu coaching online, hecho a tu medida. Entrenamiento, nutrición y seguimiento con Jeff González.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "YEFFITNES TRAINING", template: "%s · YEFFITNES TRAINING" },
  description: DESC, applicationName: "YEFFITNES TRAINING",
  // Al compartir el enlace (WhatsApp, Instagram, iMessage…) sale esta imagen con la marca.
  openGraph: { type: "website", locale: "es_CO", siteName: "YEFFITNES TRAINING", title: "YEFFITNES TRAINING", description: DESC, url: "/", images: [{ url: OG, width: 1200, height: 630, alt: "YEFFITNES TRAINING" }] },
  twitter: { card: "summary_large_image", title: "YEFFITNES TRAINING", description: DESC, images: [OG] },
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: SHORT, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};
// Pantalla fija: sin zoom por pellizco ni por enfocar un campo (a petición de Cristian; la app es de uso en el celular).
export const viewport: Viewport = { themeColor: "#0A0910", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}><NoZoom /><InstallGate>{children}</InstallGate></body>
    </html>
  );
}
