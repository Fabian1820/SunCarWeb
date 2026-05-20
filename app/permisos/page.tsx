"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card"
import { ArrowLeft, Shield, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ModulosSyncDialog } from "@/components/feats/permisos/modulos-sync-dialog"
import { TrabajadorPermisosDialog } from "@/components/feats/permisos/trabajador-permisos-dialog"
import { TrabajadoresPermisosTable } from "@/components/feats/permisos/trabajadores-permisos-table"
import { SetPasswordDialog } from "@/components/feats/permisos/set-password-dialog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { useModulosSync } from "@/hooks/use-modulos-sync"

export default function PermisosPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isModulosDialogOpen, setIsModulosDialogOpen] = useState(false)
  const [isTrabajadorPermisosDialogOpen, setIsTrabajadorPermisosDialogOpen] =
    useState(false)
  const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false)
  const [selectedTrabajadorCi, setSelectedTrabajadorCi] = useState<
    string | null
  >(null)
  const [selectedTrabajadorNombre, setSelectedTrabajadorNombre] = useState<
    string | null
  >(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { sincronizarFaltantes } = useModulosSync()
  const autoSyncRan = useRef(false)

  // Auto-sync silencioso al cargar el panel: crea en BD los módulos del catálogo
  // que falten. No notifica si no hubo cambios.
  useEffect(() => {
    if (!user?.is_superAdmin || autoSyncRan.current) return
    autoSyncRan.current = true
    sincronizarFaltantes()
      .then((creados) => {
        if (creados > 0) {
          toast({
            title: "Catálogo sincronizado",
            description: `Se crearon ${creados} módulo(s) en BD desde el catálogo del frontend.`,
          })
          setRefreshTrigger((p) => p + 1)
        }
      })
      .catch((err) => {
        console.warn("Auto-sync falló (se puede reintentar manualmente):", err)
      })
  }, [user?.is_superAdmin, sincronizarFaltantes, toast])

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

  const handleEditTrabajadorPermisos = (ci: string, nombre: string) => {
    setSelectedTrabajadorCi(ci)
    setSelectedTrabajadorNombre(nombre)
    setIsTrabajadorPermisosDialogOpen(true)
  }

  const handleSetPassword = (ci: string, nombre: string) => {
    setSelectedTrabajadorCi(ci)
    setSelectedTrabajadorNombre(nombre)
    setIsSetPasswordDialogOpen(true)
  }

  const handleModulosUpdated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handlePermisosUpdated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handlePasswordSet = () => {
    // Opcional: podrías actualizar algo si es necesario
    toast({
      title: "Éxito",
      description: "Contraseña administrativa establecida correctamente",
    })
  }

	  return (
	    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
	      <Toaster />

	      {/* Header */}
	      <ModuleHeader
	        title="Gestión de Permisos"
	        subtitle="Administrar módulos y permisos de trabajadores"
	        badge={{ text: "SuperAdmin", className: "bg-red-100 text-red-800" }}
	        actions={
	          <Button
	            onClick={() => setIsModulosDialogOpen(true)}
	            className="h-9 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 touch-manipulation"
	            aria-label="Sincronizar catálogo con BD"
	            title="Sincronizar catálogo con BD"
	          >
	            <RefreshCw className="h-4 w-4 sm:mr-2" />
	            <span className="hidden sm:inline">Sincronizar Catálogo</span>
	          </Button>
	        }
	      />

	      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
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
              onSetPassword={handleSetPassword}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <ModulosSyncDialog
        open={isModulosDialogOpen}
        onOpenChange={setIsModulosDialogOpen}
        onSynced={handleModulosUpdated}
      />

      <TrabajadorPermisosDialog
        open={isTrabajadorPermisosDialogOpen}
        onOpenChange={setIsTrabajadorPermisosDialogOpen}
        trabajadorCi={selectedTrabajadorCi}
        trabajadorNombre={selectedTrabajadorNombre}
        onPermisosUpdated={handlePermisosUpdated}
      />

      <SetPasswordDialog
        open={isSetPasswordDialogOpen}
        onOpenChange={setIsSetPasswordDialogOpen}
        trabajadorCi={selectedTrabajadorCi}
        trabajadorNombre={selectedTrabajadorNombre}
        onPasswordSet={handlePasswordSet}
      />
    </div>
  )
}
