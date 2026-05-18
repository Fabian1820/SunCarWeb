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
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
    NEXT_PUBLIC_SHOW_DEV_TOOLS: process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS ?? "",
  },
}

export default nextConfig
