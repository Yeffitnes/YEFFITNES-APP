// Landing pública (22-nov). Sin sesión: el middleware no pasa por /landing y InstallGate la deja ver en el navegador.
import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "../guide.css";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "Yeffitness · Coaching online con Yeff" },
  description: "Entrenamiento, nutrición y seguimiento con Yeff González, en una app hecha para ti. Recórrela por dentro y pregunta por WhatsApp.",
  // Imagen propia al compartir el enlace (23-nov): titular y el personaje, no la de la app (public/landing/og.jpg, tools/landing/og).
  openGraph: { type: "website", locale: "es_CO", siteName: "Yeffitness", title: "Yeffitness · Coaching online con Yeff", description: "Entrena con plan, mide cada serie y mira cómo cambias. Recorre la app por dentro y pregunta por WhatsApp.", url: "/landing",
    images: [{ url: "/landing/og.jpg", width: 1200, height: 630, alt: "Yeffitness: entrena con plan, mide cada serie, mira cómo cambias" }] },
  twitter: { card: "summary_large_image", title: "Yeffitness · Coaching online con Yeff", description: "Entrena con plan, mide cada serie y mira cómo cambias.", images: ["/landing/og.jpg"] },
};
export default function Page() { return <Landing />; }
