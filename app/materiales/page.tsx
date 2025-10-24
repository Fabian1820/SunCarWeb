"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Switch } from "@/components/shared/molecule/switch"
import { ArrowLeft, Package, Plus, Search, AlertCircle, Loader2, RefreshCw, Grid, List } from "lucide-react"
import { MaterialsTable } from "@/components/feats/materials/materials-table"
import { CategoriesTable } from "@/components/feats/materials/categories-table"
import { MaterialForm } from "@/components/feats/materials/material-form"
import { useMaterials } from "@/hooks/use-materials"
import type { Material } from "@/lib/material-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"

export default function MaterialesPage() {
  const { materials, categories, loading, error, refetch, catalogs, deleteMaterialByCodigo, editMaterialInProduct, createCategory, addMaterialToProduct } = useMaterials()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"materials" | "categories">("materials")

  const addMaterial = async (material: Omit<Material, "id">) => {
    const categoria = (material as any).categoria
    const codigo = (material as any).codigo
    const descripcion = (material as any).descripcion
    const um = (material as any).um
    const precio = (material as any).precio
    const isNewCategory = (material as any).isNewCategory
    const categoryPhoto = (material as any).categoryPhoto
    const categoryVendible = (material as any).categoryVendible

    try {
      let productoId: string | undefined

      if (isNewCategory) {
        // Crear nueva categoría con foto y configuración
        const { MaterialService } = await import("@/lib/services/feats/materials/material-service")
        productoId = await MaterialService.createCategoryWithPhoto({
          categoria,
          foto: categoryPhoto,
          esVendible: categoryVendible,
          materiales: [{
            codigo: String(codigo),
            descripcion,
            um,
            precio: precio || 0
          }]
        })
      } else {
        // Encontrar o crear el producto por categoría
        let producto = catalogs.find(c => c.categoria === categoria)
        productoId = producto?.id as any
        if (!productoId) {
          const newId = await createCategory(categoria)
          productoId = newId
        }
        if (!productoId) {
          throw new Error('No se pudo determinar el producto para la categoría')
        }

        await addMaterialToProduct(productoId as any, { 
          codigo: String(codigo), 
          descripcion, 
          um
        }, categoria)
      }

      toast({
        title: "Éxito",
        description: isNewCategory ? 'Categoría y material creados exitosamente' : 'Material creado exitosamente',
      })

      setIsAddDialogOpen(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || 'Error al crear material',
        variant: "destructive",
      })
    }
  }

  const updateMaterial = async (updatedMaterial: Material | Omit<Material, "id">) => {
    // updatedMaterial puede ser MaterialFormData o Material
    const codigo = (updatedMaterial as any).codigo
    const categoria = (updatedMaterial as any).categoria
    const descripcion = (updatedMaterial as any).descripcion
    const um = (updatedMaterial as any).um
    // Buscar producto y material original
    const producto = catalogs.find(c => c.categoria === categoria)
    if (!producto) {
      toast({
        title: "Error",
        description: 'No se encontró el producto para este material',
        variant: "destructive",
      });
      return;
    }
    const materialCodigo = editingMaterial?.codigo?.toString() || codigo?.toString()
    try {
      await editMaterialInProduct(producto.id, materialCodigo, { codigo, descripcion, um }, categoria)
      toast({
        title: "Éxito",
        description: 'Material actualizado exitosamente',
      });
      setIsEditDialogOpen(false)
      setEditingMaterial(null)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Error al actualizar material',
        variant: "destructive",
      });
    }
  }

  const deleteMaterial = async (codigo: string) => {
    const material = materials.find(m => String(m.codigo) === codigo)
    if (!material || !material.codigo) {
      toast({
        title: "Error",
        description: 'No se encontró el material o el código es inválido.',
        variant: "destructive",
      });
      return
    }
    setMaterialToDelete(material)
    setIsDeleteDialogOpen(true)
  }

  // Confirmar eliminación de material
  const confirmDeleteMaterial = async () => {
    if (!materialToDelete || !materialToDelete.codigo) return
    
    setDeleteLoading(true)
    try {
      await deleteMaterialByCodigo(String(materialToDelete.codigo), materialToDelete.categoria)
      toast({
        title: "Éxito",
        description: 'Material eliminado exitosamente',
      });
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: 'Error al eliminar material: ' + (err.message || err),
        variant: "destructive",
      });
      console.error('[UI] Error al eliminar material:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material)
    setIsEditDialogOpen(true)
  }

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.codigo.toString().includes(searchTerm) ||
      material.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoryFilter = selectedCategory === "all" || material.categoria === selectedCategory
    return matchesSearch && matchesCategoryFilter
  })

  const filteredCategories = catalogs.filter((category) => {
    const matchesSearch = category.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Debug: log cuando cambie el estado de materials
  console.log('[MaterialesPage] Materials count:', materials.length, 'Filtered count:', filteredMaterials.length)

  // Obtener unidades únicas de los materiales
  const units = Array.from(new Set(materials.map(m => m.um))).sort()

  const handleCloseModal = () => {
    setIsAddDialogOpen(false);
  };

  if (loading) {
    return <PageLoader moduleName="Materiales" text="Cargando catálogo de materiales..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar materiales</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch} className="bg-amber-600 hover:bg-amber-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
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
                  Gestión de Materiales
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Recursos
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Administrar catálogo de materiales y equipos</p>
              </div>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Material</DialogTitle>
                </DialogHeader>
                <MaterialForm
                  onSubmit={addMaterial}
                  onCancel={handleCloseModal}
                  onClose={handleCloseModal}
                  existingCategories={categories}
                  existingUnits={units}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card className="border-0 shadow-md mb-6 border-l-4 border-l-emerald-600">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                    {viewMode === "materials" ? "Buscar Material" : "Buscar Categoría"}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder={viewMode === "materials" ? "Buscar por código o descripción..." : "Buscar por nombre de categoría..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {viewMode === "materials" && (
                  <div className="lg:w-48">
                    <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                      Filtrar por Categoría
                    </Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map((category, idx) => (
                          <SelectItem key={category || idx} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* View Toggle */}
          <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <List className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Vista por Materiales</span>
                  </div>
                  <Switch
                    checked={viewMode === "categories"}
                    onCheckedChange={(checked) => setViewMode(checked ? "categories" : "materials")}
                  />
                  <div className="flex items-center space-x-2">
                    <Grid className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Vista por Categorías</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Table */}
          <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
            <CardHeader>
              <CardTitle>
                {viewMode === "materials" ? "Catálogo de Materiales" : "Catálogo de Categorías"}
              </CardTitle>
              <CardDescription>
                {viewMode === "materials" 
                  ? `Mostrando ${filteredMaterials.length} de ${materials.length} materiales`
                  : `Mostrando ${filteredCategories.length} de ${catalogs.length} categorías`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {viewMode === "materials" ? (
                <MaterialsTable materials={filteredMaterials} onEdit={openEditDialog} onDelete={deleteMaterial} />
              ) : (
                <CategoriesTable categories={filteredCategories} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Material</DialogTitle>
            </DialogHeader>
            {editingMaterial && (
              <MaterialForm
                initialData={editingMaterial}
                onSubmit={updateMaterial}
                onCancel={() => {
                  setIsEditDialogOpen(false)
                  setEditingMaterial(null)
                }}
                existingCategories={categories}
                existingUnits={units}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación de eliminación */}
        <ConfirmDeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Eliminar Material"
          message={`¿Estás seguro de que quieres eliminar el material "${materialToDelete?.descripcion}" (Código: ${materialToDelete?.codigo})? Esta acción no se puede deshacer.`}
          onConfirm={confirmDeleteMaterial}
          confirmText="Eliminar Material"
          isLoading={deleteLoading}
        />
      </main>
      <Toaster />
    </div>
  )
}
