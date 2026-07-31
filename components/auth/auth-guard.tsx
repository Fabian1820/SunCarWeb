"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "./login-form"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { FixedHeaderWatcher } from "@/components/shared/atom/fixed-header-watcher"
import { PersonalMessageOverlay } from "@/components/shared/molecule/personal-message-overlay"
import { NotificationBell } from "@/components/shared/organism/notification-bell"
import { SolicitudDesarrolloButton } from "@/components/shared/organism/solicitud-desarrollo-button"

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Rutas standalone que NO requieren sesión de SunCar: tienen su propia
 * pantalla de login separada (ver app/actualizaciones-felicity). No deben
 * mostrar el login de SunCar ni el "chrome" del panel autenticado (campana de
 * notificaciones, botón de peticiones, etc.) — quien las abre puede no tener
 * cuenta de SunCar en absoluto.
 */
const RUTAS_PUBLICAS = ["/actualizaciones-felicity"]

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()

  const esRutaPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname?.startsWith(`${ruta}/`),
  )

  if (esRutaPublica) {
    return <>{children}</>
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => {}} />
  }

  return (
    <>
      <FixedHeaderWatcher />
      {children}
      <PersonalMessageOverlay />
      <NotificationBell />
      <SolicitudDesarrolloButton />
    </>
  )
}
