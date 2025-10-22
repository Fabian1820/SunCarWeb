"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PageLoader } from "@/components/shared/atom/page-loader"

interface RouteGuardProps {
  children: React.ReactNode
  requiredModule: string
}

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!hasPermission(requiredModule)) {
        console.warn(`Usuario ${user?.nombre} no tiene permiso para acceder a: ${requiredModule}`)
        router.push("/")
      }
    }
  }, [isLoading, isAuthenticated, hasPermission, requiredModule, router, user])

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return null // AuthGuard se encargará de mostrar el login
  }

  if (!hasPermission(requiredModule)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">No tienes permisos para acceder a este módulo.</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
