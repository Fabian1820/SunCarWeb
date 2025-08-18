import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { InitialLoaderProvider } from "@/components/shared/atom/initial-loader-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SolarTech Admin - Sistema de Gestión",
  description: "Sistema administrativo para empresa de instalación de paneles solares",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <InitialLoaderProvider>
          {children}
        </InitialLoaderProvider>
      </body>
    </html>
  )
}
