/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [],
  // NO declarar NEXT_PUBLIC_BACKEND_URL en `env`: ese bloque inlinea el valor
  // estáticamente en build time, lo que impide leer la var en runtime desde
  // el server (layout.tsx la inyecta como window.__BACKEND_URL__ en cada request).
  // Las vars NEXT_PUBLIC_* ya son accesibles automáticamente sin declararlas aquí.
}

export default nextConfig
