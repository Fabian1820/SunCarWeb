"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { ArrowLeft, Plus, Package, Users, Box, Layers, FileBarChart2 } from "lucide-react"
import { useAsignaciones } from "@/hooks/use-asignaciones"
import { TrabajadorAsignacionesTable } from "@/components/feats/asignaciones/trabajador-asignaciones-table"
import { MediosBasicosTable } from "@/components/feats/asignaciones/medios-basicos-table"
import { MedioBasicoDialog } from "@/components/feats/asignaciones/medio-basico-dialog"
import { InstalacionAsignacionesTab } from "@/components/feats/asignaciones/instalacion-asignaciones-tab"
import { MaterialesCatalogoReadonly } from "@/components/feats/asignaciones/materiales-catalogo-readonly"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import type {
  MedioBasico, MedioBasicoCreateData, MedioBasicoUpdateData,
  AsignacionCreateData, AsignacionUpdateData,
  AjustarCostoData, TransferirData,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { PlanDepreciacionView } from "@/components/feats/asignaciones/plan-depreciacion-view"

export default function AsignacionesPage() {
  return (
    <RouteGuard requiredModule="asignaciones">
      <AsignacionesPageContent />
    </RouteGuard>
  )
}

type Tab = "trabajador" | "instalacion" | "medios-basicos" | "catalogo-materiales" | "plan-depreciacion"

function AsignacionesPageContent() {
  const {
    trabajadores, mediosBasicos, loading, error, clearError,
    createMedioBasico, updateMedioBasico, deleteMedioBasico,
    addAsignacion, updateAsignacion, ajustarCostoAsignacion, transferirAsignacion,
  } = useAsignaciones()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("trabajador")

  // ── Medios básicos dialog ─────────────────────────────────────────────────
  const [medioDialogOpen, setMedioDialogOpen] = useState(false)
  const [editingMedio, setEditingMedio] = useState<MedioBasico | null>(null)
  const openCreateMedio = () => { setEditingMedio(null); setMedioDialogOpen(true) }
  const openEditMedio = (m: MedioBasico) => { setEditingMedio(m); setMedioDialogOpen(true) }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveMedio = async (data: MedioBasicoCreateData | MedioBasicoUpdateData, id?: string) => {
    if (id) {
      const ok = await updateMedioBasico(id, data as MedioBasicoUpdateData)
      if (ok) toast({ title: "Éxito", description: "Medio básico actualizado" })
      else toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
      return ok
    }
    const ok = await createMedioBasico(data as MedioBasicoCreateData)
    if (ok) toast({ title: "Éxito", description: "Medio básico creado" })
    else toast({ title: "Error", description: "No se pudo crear", variant: "destructive" })
    return ok
  }

  const handleDeleteMedio = async (id: string) => {
    if (!confirm("¿Eliminar este medio básico?")) return
    const ok = await deleteMedioBasico(id)
    if (ok) toast({ title: "Éxito", description: "Medio básico eliminado" })
    else toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
  }

  const handleAddAsignacion = async (ci: string, data: AsignacionCreateData) => {
    const ok = await addAsignacion(ci, data)
    if (ok) toast({ title: "Éxito", description: "Asignación agregada" })
    else toast({ title: "Error", description: "No se pudo agregar", variant: "destructive" })
    return ok
  }

  const handleAjustarCosto = async (ci: string, id: string, data: AjustarCostoData) => {
    const ok = await ajustarCostoAsignacion(ci, id, data)
    if (ok) toast({ title: "Éxito", description: "Costo ajustado" })
    else toast({ title: "Error", description: "No se pudo ajustar el costo", variant: "destructive" })
    return ok
  }

  const handleTransferir = async (ci: string, id: string, data: TransferirData) => {
    const ok = await transferirAsignacion(ci, id, data)
    if (ok) toast({ title: "Éxito", description: "Asignación transferida" })
    else toast({ title: "Error", description: "No se pudo transferir", variant: "destructive" })
    return ok
  }

  const handleUpdateAsignacion = async (ci: string, id: string, data: AsignacionUpdateData) => {
    const ok = await updateAsignacion(ci, id, data)
    // El "eliminar" llega aquí también con cantidad=0+motivo → mostrar mensaje adecuado
    const esEliminar = data.cantidad === 0
    if (ok) {
      toast({
        title: "Éxito",
        description: esEliminar ? "Asignación eliminada" : "Asignación actualizada",
      })
    } else {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    }
    return ok
  }

  if (loading && trabajadores.length === 0 && mediosBasicos.length === 0) {
    return <PageLoader moduleName="Asignaciones de Recursos" text="Cargando datos..." />
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "trabajador", label: "Asignación por trabajador", icon: Users },
    { id: "instalacion", label: "Asignación por instalación", icon: Box },
    { id: "medios-basicos", label: "Catálogo medios básicos", icon: Package },
    { id: "catalogo-materiales", label: "Catálogo de materiales", icon: Layers },
    { id: "plan-depreciacion", label: "Plan de depreciación", icon: FileBarChart2 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
              </Link>
              <div className="rounded-xl bg-suncar-primary shadow-sm flex items-center justify-center h-9 w-9 sm:h-12 sm:w-12 shrink-0 p-1.5 sm:p-2">
                <img src="/brand/suncar-v1-iso.png" alt="Logo Suncar" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Asignaciones de Recursos</h1>
                <p className="text-sm text-gray-600">Medios básicos y materiales asignados a trabajadores e instalaciones</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800 text-sm">{error}</p>
                <Button variant="ghost" size="sm" onClick={clearError}>✕</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === id
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Asignación por trabajador */}
        {activeTab === "trabajador" && (
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <CardTitle className="text-base">Trabajadores y sus recursos asignados</CardTitle>
            </CardHeader>
            <CardContent>
              <TrabajadorAsignacionesTable
                trabajadores={trabajadores}
                mediosBasicos={mediosBasicos}
                onAddAsignacion={handleAddAsignacion}
                onUpdateAsignacion={handleUpdateAsignacion}
                onAjustarCosto={handleAjustarCosto}
                onTransferir={handleTransferir}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Tab: Asignación por instalación */}
        {activeTab === "instalacion" && (
          <InstalacionAsignacionesTab mediosBasicos={mediosBasicos} />
        )}

        {/* Tab: Catálogo medios básicos */}
        {activeTab === "medios-basicos" && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Catálogo de medios básicos</CardTitle>
              <Button size="sm" onClick={openCreateMedio}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </CardHeader>
            <CardContent>
              <MediosBasicosTable
                items={mediosBasicos}
                onEdit={openEditMedio}
                onDelete={handleDeleteMedio}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Tab: Catálogo de materiales (read-only) */}
        {activeTab === "catalogo-materiales" && (
          <MaterialesCatalogoReadonly />
        )}

        {/* Tab: Plan de depreciación */}
        {activeTab === "plan-depreciacion" && (
          <PlanDepreciacionView />
        )}
      </main>

      <MedioBasicoDialog
        open={medioDialogOpen}
        onClose={() => setMedioDialogOpen(false)}
        medio={editingMedio}
        onSave={handleSaveMedio}
        loading={loading}
      />

      <Toaster />
    </div>
  )
}
