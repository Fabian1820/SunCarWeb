import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PWAInstallPrompt } from "@/components/shared/molecule/pwa-install-prompt"
import { OfflineIndicator } from "@/components/shared/molecule/offline-indicator"
import { BackendStatusBanner } from "@/components/shared/molecule/backend-status-banner"
import { ValidationErrorOverlay } from "@/components/shared/molecule/validation-error-overlay"
import { PersonalMessageOverlay } from "@/components/shared/molecule/personal-message-overlay"
import { Toaster } from "@/components/shared/molecule/toaster"
import { FixedHeaderWatcher } from "@/components/shared/atom/fixed-header-watcher"
import { NotificationBell } from "@/components/shared/organism/notification-bell"

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
}

// Forzar render dinámico para que process.env.NEXT_PUBLIC_BACKEND_URL
// se lea en cada request (runtime) y no se hornee en build time.
export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        {/* Favicon y apple-touch-icon con variante para modo oscuro (verde) */}
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-dark-96x96.png" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-dark-192x192.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-dark-152x152.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-dark-180x180.png" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-dark-192x192.png" media="(prefers-color-scheme: dark)" />
        {/* Inyectar variables en runtime para que el cliente no dependa del build */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BACKEND_URL__=${JSON.stringify(
              (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/+$/, "") || "http://localhost:8000"
            )};window.__SHOW_DEV_TOOLS__=${JSON.stringify(
              process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true"
            )};`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AuthGuard>
            <FixedHeaderWatcher />
            {children}
            <PersonalMessageOverlay />
            <NotificationBell />
          </AuthGuard>
        </AuthProvider>
        <PWAInstallPrompt />
        <OfflineIndicator />
        <BackendStatusBanner />
        <ValidationErrorOverlay />
        <Toaster />
      </body>
    </html>
  )
}
