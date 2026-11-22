// Landing pública (22-nov). Sin sesión: el middleware no pasa por /landing y InstallGate la deja ver en el navegador.
import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import "../guide.css";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "Yeffitness · Coaching online con Yeff" },
  description: "Entrenamiento, nutrición y seguimiento con Yeff González, en una app hecha para ti. Recórrela por dentro y pregunta por WhatsApp.",
  openGraph: { title: "Yeffitness · Coaching online con Yeff", description: "Recorre la app por dentro y pregunta por WhatsApp.", url: "/landing" },
};
export default function Page() { return <Landing />; }
