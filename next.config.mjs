/** @type {import('next').NextConfig} */
const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // La cámara se usa para las fotos de progreso; el resto de sensores no.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
];
const nextConfig = {
  poweredByHeader: false,
  // Volver a una pantalla ya visitada (o precargada) es instantáneo: el navegador reutiliza la pantalla unos minutos.
  experimental: { staleTimes: { dynamic: 180, static: 600 } },
  // Landing de venta: desde el 22-nov es una página de la app (app/landing); en public/landing solo quedan sus capturas.
  async headers() { return [{ source: "/:path*", headers: security }, { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }]; },
};

export default nextConfig;
