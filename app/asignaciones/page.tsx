"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { ArrowLeft, Plus, Package, Users, Box } from "lucide-react"
import { useAsignaciones } from "@/hooks/use-asignaciones"
import { TrabajadorAsignacionesTable } from "@/components/feats/asignaciones/trabajador-asignaciones-table"
import { MediosBasicosTable } from "@/components/feats/asignaciones/medios-basicos-table"
import { MedioBasicoDialog } from "@/components/feats/asignaciones/medio-basico-dialog"
import { InstalacionAsignacionesTab } from "@/components/feats/asignaciones/instalacion-asignaciones-tab"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import type {
  MedioBasico, MedioBasicoCreateData, MedioBasicoUpdateData,
  AsignacionCreateData, AsignacionUpdateData,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { CATEGORIAS_MATERIAL } from "@/lib/types/feats/asignaciones/asignacion-types"
import { useMaterialesCatalogo } from "@/hooks/use-asignaciones"
import { HerramientaCatalogoDialog } from "@/components/feats/asignaciones/herramienta-catalogo-dialog"
import type { HerramientaCatalogo, HerramientaCatalogoCreateData, HerramientaCatalogoUpdateData } from "@/lib/types/feats/asignaciones/asignacion-types"

export default function AsignacionesPage() {
  return (
    <RouteGuard requiredModule="asignaciones">
      <AsignacionesPageContent />
    </RouteGuard>
  )
}

type Tab = "trabajador" | "instalacion" | "medios-basicos" | "catalogo-materiales"

function AsignacionesPageContent() {
  const {
    trabajadores, mediosBasicos, catalogoHerramientas, loading, error, clearError,
    createMedioBasico, updateMedioBasico, deleteMedioBasico,
    addAsignacion, updateAsignacion, removeAsignacion,
    createHerramientaCatalogo, updateHerramientaCatalogo, deleteHerramientaCatalogo,
  } = useAsignaciones()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("trabajador")

  // Catálogo de materiales
  const { materiales, loading: loadingMateriales, buscar } = useMaterialesCatalogo()
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [busquedaMaterial, setBusquedaMaterial] = useState("")

  // Medios básicos dialog
  const [medioDialogOpen, setMedioDialogOpen] = useState(false)
  const [editingMedio, setEditingMedio] = useState<MedioBasico | null>(null)
  const openCreateMedio = () => { setEditingMedio(null); setMedioDialogOpen(true) }
  const openEditMedio = (m: MedioBasico) => { setEditingMedio(m); setMedioDialogOpen(true) }

  // Catálogo herramientas/materiales dialog (reutilizamos el componente existente)
  const [herramientaDialogOpen, setHerramientaDialogOpen] = useState(false)
  const [editingHerramienta, setEditingHerramienta] = useState<HerramientaCatalogo | null>(null)
  const openCreateHerramienta = () => { setEditingHerramienta(null); setHerramientaDialogOpen(true) }
  const openEditHerramienta = (h: HerramientaCatalogo) => { setEditingHerramienta(h); setHerramientaDialogOpen(true) }

  // ── Handlers: Medios Básicos ──────────────────────────────────────────────
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

  // ── Handlers: Catálogo materiales ─────────────────────────────────────────
  const handleSaveMaterialCatalogo = async (
    data: HerramientaCatalogoCreateData | HerramientaCatalogoUpdateData,
    id?: string
  ) => {
    if (id) {
      const ok = await updateHerramientaCatalogo(id, data as HerramientaCatalogoUpdateData)
      if (ok) toast({ title: "Éxito", description: "Material actualizado" })
      else toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
      return ok
    }
    const ok = await createHerramientaCatalogo(data as HerramientaCatalogoCreateData)
    if (ok) toast({ title: "Éxito", description: "Material creado" })
    else toast({ title: "Error", description: "No se pudo crear", variant: "destructive" })
    return ok
  }

  const handleDeleteMaterialCatalogo = async (id: string) => {
    if (!confirm("¿Eliminar este material del catálogo?")) return
    const ok = await deleteHerramientaCatalogo(id)
    if (ok) toast({ title: "Éxito", description: "Material eliminado" })
    else toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
  }

  // ── Handlers: Asignaciones trabajador ────────────────────────────────────
  const handleAddAsignacion = async (ci: string, data: AsignacionCreateData) => {
    const ok = await addAsignacion(ci, data)
    if (ok) toast({ title: "Éxito", description: "Asignación agregada" })
    else toast({ title: "Error", description: "No se pudo agregar", variant: "destructive" })
    return ok
  }

  const handleUpdateAsignacion = async (ci: string, id: string, data: AsignacionUpdateData) => {
    const ok = await updateAsignacion(ci, id, data)
    if (ok) toast({ title: "Éxito", description: "Asignación actualizada" })
    else toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
    return ok
  }

  const handleDeleteAsignacion = async (ci: string, id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return
    const ok = await removeAsignacion(ci, id)
    if (ok) toast({ title: "Éxito", description: "Asignación eliminada" })
    else toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
  }

  if (loading && trabajadores.length === 0 && mediosBasicos.length === 0) {
    return <PageLoader moduleName="Asignaciones de Recursos" text="Cargando datos..." />
  }

  // Filtrar catálogo de materiales local (catalogoHerramientas es el catálogo local viejo)
  const filteredCatalogo = catalogoHerramientas.filter(h => {
    const matchCat = !categoriaFiltro || (h as any).categoria === categoriaFiltro
    const matchQ = !busquedaMaterial || h.nombre.toLowerCase().includes(busquedaMaterial.toLowerCase())
    return matchCat && matchQ
  })

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "trabajador", label: "Asignación por trabajador", icon: Users },
    { id: "instalacion", label: "Asignación por instalación", icon: Box },
    { id: "medios-basicos", label: "Catálogo medios básicos", icon: Package },
    { id: "catalogo-materiales", label: "Catálogo de materiales", icon: Package },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
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
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 h-12 w-12 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain rounded-full" />
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
                  ? "border-orange-500 text-orange-600"
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
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="text-base">Trabajadores y sus recursos asignados</CardTitle>
            </CardHeader>
            <CardContent>
              <TrabajadorAsignacionesTable
                trabajadores={trabajadores}
                mediosBasicos={mediosBasicos}
                onAddAsignacion={handleAddAsignacion}
                onUpdateAsignacion={handleUpdateAsignacion}
                onDeleteAsignacion={handleDeleteAsignacion}
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

        {/* Tab: Catálogo de materiales */}
        {activeTab === "catalogo-materiales" && (
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Catálogo de materiales</CardTitle>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={openCreateHerramienta}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[200px]"
                  value={categoriaFiltro}
                  onChange={e => setCategoriaFiltro(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {CATEGORIAS_MATERIAL.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="flex-1 min-w-[180px] text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Buscar material..."
                  value={busquedaMaterial}
                  onChange={e => setBusquedaMaterial(e.target.value)}
                />
              </div>
              <MaterialesCatalogoTable
                items={filteredCatalogo}
                onEdit={openEditHerramienta}
                onDelete={handleDeleteMaterialCatalogo}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}
      </main>

      <MedioBasicoDialog
        open={medioDialogOpen}
        onClose={() => setMedioDialogOpen(false)}
        medio={editingMedio}
        onSave={handleSaveMedio}
        loading={loading}
      />

      <HerramientaCatalogoDialog
        open={herramientaDialogOpen}
        onClose={() => setHerramientaDialogOpen(false)}
        herramienta={editingHerramienta}
        onSave={handleSaveMaterialCatalogo}
        loading={loading}
      />

      <Toaster />
    </div>
  )
}

function MaterialesCatalogoTable({
  items, onEdit, onDelete, loading,
}: {
  items: HerramientaCatalogo[]
  onEdit: (h: HerramientaCatalogo) => void
  onDelete: (id: string) => void
  loading?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No hay materiales en el catálogo</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((h, i) => (
            <tr key={h.producto_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="px-4 py-3">
                <p className="font-medium">{h.nombre}</p>
                {h.descripcion && h.descripcion !== h.nombre && (
                  <p className="text-xs text-gray-400 truncate max-w-xs">{h.descripcion}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.codigo}</td>
              <td className="px-4 py-3">
                {(h as any).categoria ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                    {(h as any).categoria}
                  </span>
                ) : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-right">
                {h.precio > 0 ? (
                  <span className="text-green-600 font-medium">${h.precio.toFixed(2)}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(h)} disabled={loading}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(h.producto_id)} disabled={loading}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
