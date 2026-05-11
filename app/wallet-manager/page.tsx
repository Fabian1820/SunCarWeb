"use client"

import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card"
import { ArrowLeft, Wallet } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { WalletPermisosTable } from "@/components/feats/wallet-manager/wallet-permisos-table"
import { useMyWalletPermiso } from "@/hooks/use-wallet-permisos"
import { Loader2 } from "lucide-react"

export default function WalletManagerPage() {
  const { user } = useAuth()
  const { permiso, loading } = useMyWalletPermiso()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isAuthorized = !!user?.is_superAdmin || !!permiso?.esAdmin

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
            <CardDescription>
              No tiene permisos para acceder a este módulo. Solo los
              administradores de wallet pueden gestionarlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="w-full touch-manipulation"
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver al inicio</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <Toaster />

      <ModuleHeader
        title="Gestión de Wallet"
        subtitle="Administrar permisos de billetera de los trabajadores"
        badge={{
          text: user?.is_superAdmin ? "SuperAdmin" : "Admin Wallet",
          className: "bg-blue-100 text-blue-800",
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="mb-8 border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Trabajadores y Permisos de Wallet
            </CardTitle>
            <CardDescription>
              <span className="block">
                <strong>Ver todos:</strong> permite ver el historial y las
                billeteras de todos los trabajadores. Si está apagado, el
                usuario solo verá sus propias transacciones.
              </span>
              <span className="block mt-1">
                <strong>Admin:</strong> da acceso a este módulo para gestionar
                los permisos de wallet de otros trabajadores.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletPermisosTable />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
