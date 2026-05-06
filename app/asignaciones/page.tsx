"use client"

import { useState, useEffect, useCallback } from "react"
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
import { AsignacionService } from "@/lib/api-services"
import type {
  MedioBasico, MedioBasicoCreateData, MedioBasicoUpdateData,
  AsignacionCreateData, AsignacionUpdateData,
  MaterialCatalogo,
} from "@/lib/types/feats/asignaciones/asignacion-types"
import { CATEGORIAS_MATERIAL } from "@/lib/types/feats/asignaciones/asignacion-types"

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
    trabajadores, mediosBasicos, loading, error, clearError,
    createMedioBasico, updateMedioBasico, deleteMedioBasico,
    addAsignacion, updateAsignacion, removeAsignacion,
  } = useAsignaciones()

  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("trabajador")

  // ── Catálogo de materiales (productos/admin/materiales) ───────────────────
  const [catalogoMateriales, setCatalogoMateriales] = useState<MaterialCatalogo[]>([])
  const [loadingCatalogo, setLoadingCatalogo] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [busquedaMaterial, setBusquedaMaterial] = useState("")

  const cargarCatalogo = useCallback(async (q: string, categoria: string) => {
    setLoadingCatalogo(true)
    try {
      const data = await AsignacionService.getMaterialesCatalogo(q || undefined, categoria || undefined)
      setCatalogoMateriales(data)
    } catch {
      setCatalogoMateriales([])
    } finally {
      setLoadingCatalogo(false)
    }
  }, [])

  // Cargar catálogo cuando se activa la tab o cambian los filtros
  useEffect(() => {
    if (activeTab === "catalogo-materiales") {
      cargarCatalogo(busquedaMaterial, categoriaFiltro)
    }
  }, [activeTab, categoriaFiltro, cargarCatalogo])

  // Búsqueda con debounce
  useEffect(() => {
    if (activeTab !== "catalogo-materiales") return
    const timer = setTimeout(() => cargarCatalogo(busquedaMaterial, categoriaFiltro), 350)
    return () => clearTimeout(timer)
  }, [busquedaMaterial])

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

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "trabajador", label: "Asignación por trabajador", icon: Users },
    { id: "instalacion", label: "Asignación por instalación", icon: Box },
    { id: "medios-basicos", label: "Catálogo medios básicos", icon: Package },
    { id: "catalogo-materiales", label: "Catálogo de materiales", icon: Package },
  ]

  // Filtro local sobre el catálogo ya cargado
  const materialesFiltrados = catalogoMateriales.filter(m =>
    !busquedaMaterial.trim() ||
    m.nombre.toLowerCase().includes(busquedaMaterial.toLowerCase())
  )

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
            <CardHeader>
              <CardTitle className="text-base">Catálogo de materiales</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[220px]"
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

              {loadingCatalogo ? (
                <div className="text-center py-10 text-gray-400 text-sm">Cargando materiales...</div>
              ) : materialesFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {categoriaFiltro || busquedaMaterial ? "No se encontraron materiales con esos filtros" : "No hay materiales en el catálogo"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialesFiltrados.map((m, i) => (
                        <tr key={m.material_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-4 py-3 font-medium">{m.nombre}</td>
                          <td className="px-4 py-3">
                            {m.categoria ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                {m.categoria}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {m.precio != null && m.precio > 0 ? (
                              <span className="text-green-600 font-medium">${m.precio.toFixed(2)}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 px-4 py-2 border-t">
                    {materialesFiltrados.length} material{materialesFiltrados.length !== 1 ? "es" : ""}
                    {!categoriaFiltro && !busquedaMaterial && " — usa los filtros para refinar la búsqueda"}
                  </p>
                </div>
              )}
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

      <Toaster />
    </div>
  )
}
