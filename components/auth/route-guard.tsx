"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PageLoader } from "@/components/shared/atom/page-loader"

interface RouteGuardProps {
  children: React.ReactNode
  /**
   * Módulo(s) requerido(s). Si es un array, basta con tener CUALQUIERA de ellos
   * (útil p.ej. para "Trabajos Diarios", accesible con `instalaciones/trabajos-diarios`
   * o con cualquier `trabajos:*`).
   */
  requiredModule: string | string[]
  /**
   * Exigir el permiso exacto, sin herencia padre→hijo. Para módulos aditivos:
   * tener el padre (p. ej. "facturas") no debe abrirlos.
   */
  exact?: boolean
}

export function RouteGuard({ children, requiredModule, exact = false }: RouteGuardProps) {
  const { isAuthenticated, isLoading, hasPermission, hasExactPermission, user } = useAuth()
  const router = useRouter()

  const comprobar = exact ? hasExactPermission : hasPermission
  const tieneAcceso = Array.isArray(requiredModule)
    ? requiredModule.some((m) => comprobar(m))
    : comprobar(requiredModule)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!tieneAcceso) {
        console.warn(`Usuario ${user?.nombre} no tiene permiso para acceder a: ${requiredModule}`)
        router.push("/")
      }
    }
  }, [isLoading, isAuthenticated, tieneAcceso, requiredModule, router, user])

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return null // AuthGuard se encargará de mostrar el login
  }

  if (!tieneAcceso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">No tienes permisos para acceder a este módulo.</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
