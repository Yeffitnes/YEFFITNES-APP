import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
const display = Instrument_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
export const metadata: Metadata = { title: "YEFFITNES TRAINING", description: "Tu coaching online, hecho a tu medida." };
export const viewport: Viewport = { themeColor: "#0A0910", viewportFit: "cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  );
}
