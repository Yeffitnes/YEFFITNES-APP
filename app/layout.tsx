import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NoZoom } from "@/components/NoZoom";
import { InstallGate } from "@/components/InstallGate";
// 15-nov: tipografías guardadas en el repo (app/fonts, licencia OFL) en vez de descargarlas de Google al compilar. El build de Vercel
// falló con "An error occurred in next/font" (Google respondió algo que next/font no entiende) y sin red no compila. Mismas fuentes,
// mismos pesos y mismas variables CSS, así que la app se ve igual. Archivos sacados de los paquetes @fontsource.
const display = localFont({ variable: "--font-display", display: "swap", src: [
  { path: "./fonts/instrument-sans-latin-500-normal.woff2", weight: "500" }, { path: "./fonts/instrument-sans-latin-600-normal.woff2", weight: "600" },
  { path: "./fonts/instrument-sans-latin-700-normal.woff2", weight: "700" }] });
const body = localFont({ variable: "--font-body", display: "swap", src: "./fonts/manrope-latin-wght-normal.woff2", weight: "200 800" });
const mono = localFont({ variable: "--font-mono", display: "swap", src: [
  { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" }, { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" }] });
// Dirección pública: en Netlify la da la variable URL; en otro lugar se define NEXT_PUBLIC_SITE_URL (dominio propio).
const VERCEL = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL; // Vercel (pruebas) no define URL: sin esto la imagen al compartir apuntaba a localhost
const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || (VERCEL ? `https://${VERCEL}` : "http://localhost:3000");
// Nombre de la app instalada. En el sitio de pruebas (Vercel) se pone NEXT_PUBLIC_APP_NAME="YEFFITNES Test" para distinguirla.
const SHORT = process.env.NEXT_PUBLIC_APP_NAME || "YEFFITNES";
const OG = process.env.NEXT_PUBLIC_APP_NAME ? "/og-test.png" : "/og.png"; // en pruebas la imagen lleva la etiqueta TEST
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
// El servidor dibuja la primera pantalla (Hoy) con la fecha de Colombia, igual que el teléfono del cliente.
// Sin esto, de 7 p. m. a medianoche el servidor (hora UTC) pintaba el día siguiente y el teléfono lo tenía que corregir.
if (typeof window === "undefined") process.env.TZ = "America/Bogota";
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
      {/* Abre la conexión con la base desde el primer instante: los datos de la primera pantalla llegan antes. */}
      {SB && <head><link rel="preconnect" href={SB} crossOrigin="anonymous" /><link rel="dns-prefetch" href={SB} /></head>}
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}><NoZoom /><InstallGate>{children}</InstallGate></body>
    </html>
  );
}
