import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { InitialLoaderProvider } from "@/components/shared/atom/initial-loader-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PWAInstallPrompt } from "@/components/shared/molecule/pwa-install-prompt"
import { OfflineIndicator } from "@/components/shared/molecule/offline-indicator"
import { Toaster } from "@/components/shared/molecule/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SUNCAR Administración",
  description: "Sistema administrativo de SUNCAR para gestión de brigadas, materiales, trabajadores y reportes",
  generator: 'Next.js',
  manifest: '/manifest.json',
  keywords: ['SUNCAR', 'administración', 'brigadas', 'materiales', 'trabajadores', 'reportes', 'gestión empresarial'],
  authors: [{ name: 'SUNCAR' }],
  creator: 'SUNCAR',
  publisher: 'SUNCAR',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SUNCAR Admin',
  },
  openGraph: {
    type: 'website',
    siteName: 'SUNCAR Administración',
    title: 'SUNCAR Administración',
    description: 'Sistema administrativo de SUNCAR para gestión de brigadas, materiales, trabajadores y reportes',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary',
    title: 'SUNCAR Administración',
    description: 'Sistema administrativo de SUNCAR para gestión de brigadas, materiales, trabajadores y reportes',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#f59e0b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-title" content="Suncar Administración" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <InitialLoaderProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </InitialLoaderProvider>
        </AuthProvider>
        <PWAInstallPrompt />
        <OfflineIndicator />
        <Toaster />
      </body>
    </html>
  )
}
