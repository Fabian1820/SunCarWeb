"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "./login-form"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { FixedHeaderWatcher } from "@/components/shared/atom/fixed-header-watcher"
import { PersonalMessageOverlay } from "@/components/shared/molecule/personal-message-overlay"
import { NotificationBell } from "@/components/shared/organism/notification-bell"
import { SolicitudDesarrolloButton } from "@/components/shared/organism/solicitud-desarrollo-button"
import {
  BarraLateralModulos,
  mostrarBarraLateral,
} from "@/components/shared/organism/barra-lateral"

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
const RUTAS_PUBLICAS = [
  "/actualizaciones-felicity",
  // Subida del vale firmado desde el movil: se llega escaneando un QR generado
  // desde el vale. La credencial es el token de la URL (15 min, un solo vale),
  // no una sesion de SunCar; ver app/subir-vale/[token]/page.tsx.
  "/subir-vale",
]

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

  const conBarra = mostrarBarraLateral(pathname)

  return (
    <>
      <FixedHeaderWatcher />
      {conBarra ? (
        <>
          <BarraLateralModulos />
          {/* Deja sitio a la barra recogida; el CSS de .con-barra-lateral
              corre también las cabeceras fijas (ver globals.css). */}
          <div className="con-barra-lateral lg:pl-16">{children}</div>
        </>
      ) : (
        children
      )}
      <PersonalMessageOverlay />
      <NotificationBell />
      <SolicitudDesarrolloButton />
    </>
  )
}
