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
  // Landing de venta (archivos estáticos en public/landing). Vive aquí de forma temporal; luego irá en su propia dirección.
  async rewrites() { return [{ source: "/landing", destination: "/landing/index.html" }]; },
  async headers() { return [{ source: "/:path*", headers: security }, { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }]; },
};

export default nextConfig;
