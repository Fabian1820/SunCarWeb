"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card"
import { ArrowLeft, Shield, Settings } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ModulosManagerDialog } from "@/components/feats/permisos/modulos-manager-dialog"
import { TrabajadorPermisosDialog } from "@/components/feats/permisos/trabajador-permisos-dialog"
import { TrabajadoresPermisosTable } from "@/components/feats/permisos/trabajadores-permisos-table"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"

export default function PermisosPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isModulosDialogOpen, setIsModulosDialogOpen] = useState(false)
  const [isTrabajadorPermisosDialogOpen, setIsTrabajadorPermisosDialogOpen] =
    useState(false)
  const [selectedTrabajadorCi, setSelectedTrabajadorCi] = useState<
    string | null
  >(null)
  const [selectedTrabajadorNombre, setSelectedTrabajadorNombre] = useState<
    string | null
  >(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Verificar si es superAdmin
  if (!user?.is_superAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
            <CardDescription>
              No tiene permisos para acceder a este módulo. Solo los
              super-administradores pueden gestionar permisos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleEditTrabajadorPermisos = (ci: string, nombre: string) => {
    setSelectedTrabajadorCi(ci)
    setSelectedTrabajadorNombre(nombre)
    setIsTrabajadorPermisosDialogOpen(true)
  }

  const handleModulosUpdated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handlePermisosUpdated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <Toaster />

      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Gestión de Permisos
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    SuperAdmin
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Administrar módulos y permisos de trabajadores</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsModulosDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                <Settings className="h-4 w-4 mr-2" />
                Ver Módulos
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <Card className="mb-8 border-l-4 border-l-red-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Trabajadores y Permisos
            </CardTitle>
            <CardDescription>
              Gestione los permisos de acceso a módulos para cada trabajador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrabajadoresPermisosTable
              onEditPermisos={handleEditTrabajadorPermisos}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <ModulosManagerDialog
        open={isModulosDialogOpen}
        onOpenChange={setIsModulosDialogOpen}
        onModulosUpdated={handleModulosUpdated}
      />

      <TrabajadorPermisosDialog
        open={isTrabajadorPermisosDialogOpen}
        onOpenChange={setIsTrabajadorPermisosDialogOpen}
        trabajadorCi={selectedTrabajadorCi}
        trabajadorNombre={selectedTrabajadorNombre}
        onPermisosUpdated={handlePermisosUpdated}
      />
    </div>
  )
}
