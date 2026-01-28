"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Package, Plus, Search, AlertCircle, Loader2, RefreshCw, Grid, List } from "lucide-react"
import { MaterialsTable } from "@/components/feats/materials/materials-table"
import { CategoriesTable } from "@/components/feats/materials/categories-table"
import { MaterialForm } from "@/components/feats/materials/material-form"
import { EditCategoryForm } from "@/components/feats/materials/edit-category-form"
import { DuplicatesDashboard } from "@/components/feats/materials/duplicates-dashboard"
import { MarcasManagement } from "@/components/feats/materials/marcas-management"
import { MarcaForm } from "@/components/feats/materials/marca-form"
import { useMaterials } from "@/hooks/use-materials"
import type { Material, BackendCatalogoProductos } from "@/lib/material-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function MaterialesPage() {
  const { materials, categories, loading, error, refetch, catalogs, deleteMaterialByCodigo, editMaterialInProduct, createCategory, addMaterialToProduct, refetchBackground, registerNewCategory } = useMaterials()
  const { toast, dismiss } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"materials" | "categories" | "marcas">("materials")
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BackendCatalogoProductos | null>(null)
  const [duplicatesChecked, setDuplicatesChecked] = useState(false)
  const [duplicates, setDuplicates] = useState<{ codigo: string; materiales: Material[] }[]>([])
  const [isDuplicatesDashboardOpen, setIsDuplicatesDashboardOpen] = useState(false)
  const duplicateToastIdRef = useRef<string | null>(null)

  // Estados para marcas
  const [marcas, setMarcas] = useState<any[]>([])
  const [marcasLoading, setMarcasLoading] = useState(false)
  const [isAddMarcaDialogOpen, setIsAddMarcaDialogOpen] = useState(false)
  const [isEditMarcaDialogOpen, setIsEditMarcaDialogOpen] = useState(false)
  const [isDeleteMarcaDialogOpen, setIsDeleteMarcaDialogOpen] = useState(false)
  const [editingMarca, setEditingMarca] = useState<any>(null)
  const [deletingMarca, setDeletingMarca] = useState<any>(null)
  const [deleteMarcaLoading, setDeleteMarcaLoading] = useState(false)

  const addMaterial = async (material: Omit<Material, "id">) => {
    const categoria = (material as any).categoria
    const codigo = (material as any).codigo
    const descripcion = (material as any).descripcion
    const um = (material as any).um
    const precio = (material as any).precio
    const nombre = (material as any).nombre
    const foto = (material as any).foto // Ya es una URL de MinIO
    const marca_id = (material as any).marca_id
    const potenciaKW = (material as any).potenciaKW
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
            precio: precio || 0,
            ...(nombre && { nombre }),
            ...(foto && { foto }), // URL de MinIO
            ...(marca_id && { marca_id }),
            ...(potenciaKW && { potenciaKW }),
          }]
        })
        registerNewCategory(categoria, productoId, {
          codigo: String(codigo),
          descripcion,
          um,
          precio: precio || 0,
          nombre: nombre || undefined,
          foto: foto || undefined,
          marca_id: marca_id || undefined,
          potenciaKW: potenciaKW || undefined,
        })
        await refetchBackground()
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
          um,
          precio: precio,
          ...(nombre && { nombre }),
          ...(foto && { foto }), // URL de MinIO
          ...(marca_id && { marca_id }),
          ...(potenciaKW && { potenciaKW }),
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
    const codigo = String((updatedMaterial as any).codigo)
    const categoria = (updatedMaterial as any).categoria
    const descripcion = (updatedMaterial as any).descripcion
    const um = (updatedMaterial as any).um
    const precio = (updatedMaterial as any).precio
    const nombre = (updatedMaterial as any).nombre
    const foto = (updatedMaterial as any).foto // Ya es una URL de MinIO
    const marca_id = (updatedMaterial as any).marca_id
    const potenciaKW = (updatedMaterial as any).potenciaKW
    
    const materialCodigo = String(editingMaterial?.codigo || codigo)
    const categoriaOriginal = editingMaterial?.categoria
    const categoriaChanged = categoriaOriginal !== categoria

    try {
      if (categoriaChanged) {
        // Si cambió la categoría, eliminar de la antigua y agregar a la nueva
        console.log('[updateMaterial] Categoría cambió de', categoriaOriginal, 'a', categoria)
        
        // 1. Eliminar de la categoría antigua
        await deleteMaterialByCodigo(materialCodigo, categoriaOriginal)
        
        // 2. Buscar o crear el producto de la nueva categoría
        let productoNuevo = catalogs.find(c => c.categoria === categoria)
        let productoNuevoId = productoNuevo?.id
        
        if (!productoNuevoId) {
          console.log('[updateMaterial] Creando nueva categoría:', categoria)
          productoNuevoId = await createCategory(categoria)
          console.log('[updateMaterial] Nueva categoría creada con ID:', productoNuevoId)
        }
        
        // 3. Agregar el material a la nueva categoría
        console.log('[updateMaterial] Agregando material a categoría:', categoria)
        await addMaterialToProduct(productoNuevoId, {
          codigo: codigo,
          descripcion,
          um,
          precio: precio || 0,
          nombre: nombre || undefined,
          foto: foto || undefined,
          marca_id: marca_id || undefined,
          potenciaKW: potenciaKW || undefined,
        }, categoria)
        
        console.log('[updateMaterial] Material agregado exitosamente')
        
        toast({
          title: "Éxito",
          description: 'Material movido a nueva categoría exitosamente',
        })
      } else {
        // Si no cambió la categoría, actualizar normalmente
        const producto = catalogs.find(c => c.categoria === categoria)
        if (!producto) {
          toast({
            title: "Error",
            description: 'No se encontró el producto para este material',
            variant: "destructive",
          })
          return
        }
        
        await editMaterialInProduct(producto.id, materialCodigo, { 
          codigo, 
          descripcion, 
          um, 
          precio,
          nombre,
          foto,
          marca_id,
          potenciaKW,
        }, categoria)
        
        toast({
          title: "Éxito",
          description: 'Material actualizado exitosamente',
        })
      }
      
      setIsEditDialogOpen(false)
      setEditingMaterial(null)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Error al actualizar material',
        variant: "destructive",
      })
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

  const openEditCategoryDialog = (category: BackendCatalogoProductos) => {
    setEditingCategory(category)
    setIsEditCategoryDialogOpen(true)
  }

  const updateCategory = async (data: { categoria: string; foto?: File | null; esVendible: boolean }) => {
    if (!editingCategory) return

    try {
      const { MaterialService } = await import("@/lib/services/feats/materials/material-service")
      await MaterialService.updateCategoryWithPhoto(editingCategory.id, data)
      
      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
      })
      
      setIsEditCategoryDialogOpen(false)
      setEditingCategory(null)
      await refetch()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Error al actualizar la categoría",
        variant: "destructive",
      })
    }
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

  // Función para abrir el dashboard de duplicados y cerrar el toast
  const handleOpenDuplicatesDashboard = useCallback(() => {
    console.log('[handleOpenDuplicatesDashboard] Abriendo dashboard, toastId:', duplicateToastIdRef.current)
    setIsDuplicatesDashboardOpen(true)
    // Cerrar el toast si existe
    if (duplicateToastIdRef.current) {
      console.log('[handleOpenDuplicatesDashboard] Cerrando toast:', duplicateToastIdRef.current)
      dismiss(duplicateToastIdRef.current)
      duplicateToastIdRef.current = null
    }
  }, [dismiss])

  // Detectar códigos duplicados
  useEffect(() => {
    if (!loading && materials.length > 0 && !duplicatesChecked) {
      const codigoMap = new Map<string, Material[]>()

      // Agrupar materiales por código
      materials.forEach(material => {
        const codigo = String(material.codigo)
        if (!codigoMap.has(codigo)) {
          codigoMap.set(codigo, [])
        }
        codigoMap.get(codigo)!.push(material)
      })

      // Encontrar duplicados
      const foundDuplicates = Array.from(codigoMap.entries())
        .filter(([_, mats]) => mats.length > 1)
        .map(([codigo, mats]) => ({ codigo, materiales: mats }))

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates)

        const totalDuplicates = foundDuplicates.reduce((sum, dup) => sum + dup.materiales.length, 0)

        const toastResult = toast({
          title: "⚠️ Códigos Duplicados Detectados",
          description: (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Se encontraron {foundDuplicates.length} código(s) con duplicados ({totalDuplicates} materiales afectados)
              </p>
	              <Button
	                size="icon"
	                variant="outline"
	                onClick={handleOpenDuplicatesDashboard}
	                className="h-9 w-9 bg-white hover:bg-gray-50 text-gray-900 font-medium shadow-sm border-gray-300 touch-manipulation"
	                aria-label="Ver detalles"
	                title="Ver detalles"
	              >
	                <List className="h-4 w-4" />
	                <span className="sr-only">Ver detalles</span>
	              </Button>
	            </div>
	          ) as any,
          variant: "destructive",
          duration: 15000,
        })

        // Guardar el ID del toast para poder cerrarlo después
        duplicateToastIdRef.current = toastResult.id
        console.log('[useEffect] Toast creado con ID:', toastResult.id)
      }

      setDuplicatesChecked(true)
    }
  }, [loading, materials, duplicatesChecked, toast])

  // Debug: log cuando cambie el estado de materials
  console.log('[MaterialesPage] Materials count:', materials.length, 'Filtered count:', filteredMaterials.length)

  // Obtener unidades únicas de los materiales
  const units = Array.from(new Set(materials.map(m => m.um))).sort()

  const handleCloseModal = () => {
    setIsAddDialogOpen(false);
  };

  // Cargar marcas al inicio
  useEffect(() => {
    loadMarcas()
  }, [])

  const loadMarcas = async () => {
    setMarcasLoading(true)
    try {
      const { MarcaService } = await import("@/lib/services/feats/marcas/marca-service")
      const data = await MarcaService.getMarcas()
      setMarcas(data)
    } catch (err) {
      console.error('Error loading marcas:', err)
      toast({
        title: "Error",
        description: "No se pudieron cargar las marcas",
        variant: "destructive",
      })
    } finally {
      setMarcasLoading(false)
    }
  }

  const handleCreateMarca = async (data: any) => {
    try {
      const { MarcaService } = await import("@/lib/services/feats/marcas/marca-service")
      await MarcaService.createMarca(data)
      toast({
        title: "Éxito",
        description: "Marca creada exitosamente",
      })
      setIsAddMarcaDialogOpen(false)
      await loadMarcas()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo crear la marca",
        variant: "destructive",
      })
    }
  }

  const handleUpdateMarca = async (data: any) => {
    if (!editingMarca?.id) return

    try {
      const { MarcaService } = await import("@/lib/services/feats/marcas/marca-service")
      await MarcaService.updateMarca(editingMarca.id, data)
      toast({
        title: "Éxito",
        description: "Marca actualizada exitosamente",
      })
      setIsEditMarcaDialogOpen(false)
      setEditingMarca(null)
      await loadMarcas()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar la marca",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMarca = async () => {
    if (!deletingMarca?.id) return

    setDeleteMarcaLoading(true)
    try {
      const { MarcaService } = await import("@/lib/services/feats/marcas/marca-service")
      await MarcaService.deleteMarca(deletingMarca.id)
      toast({
        title: "Éxito",
        description: "Marca eliminada exitosamente",
      })
      setIsDeleteMarcaDialogOpen(false)
      setDeletingMarca(null)
      await loadMarcas()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar la marca",
        variant: "destructive",
      })
    } finally {
      setDeleteMarcaLoading(false)
    }
  }

  const openEditMarcaDialog = (marca: any) => {
    setEditingMarca(marca)
    setIsEditMarcaDialogOpen(true)
  }

  const openDeleteMarcaDialog = (marca: any) => {
    setDeletingMarca(marca)
    setIsDeleteMarcaDialogOpen(true)
  }

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
	          <Button
	            size="icon"
	            onClick={refetch}
	            className="h-10 w-10 bg-amber-600 hover:bg-amber-700 touch-manipulation"
	            aria-label="Reintentar"
	            title="Reintentar"
	          >
	            <RefreshCw className="h-4 w-4" />
	            <span className="sr-only">Reintentar</span>
	          </Button>
	        </div>
	      </div>
	    )
	  }

	  return (
	    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
	      {/* Header */}
	      <ModuleHeader
	        title="Gestión de Materiales"
	        subtitle="Administrar catálogo de materiales y equipos"
	        badge={{ text: "Recursos", className: "bg-emerald-100 text-emerald-800" }}
	        className="bg-white shadow-sm border-b border-orange-100"
	        actions={
	          viewMode === "materials" ? (
	            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
	              <DialogTrigger asChild>
	                <Button
	                  size="icon"
	                  className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 touch-manipulation"
	                  aria-label="Agregar material"
	                  title="Agregar material"
	                >
	                  <Plus className="h-4 w-4 sm:mr-2" />
	                  <span className="hidden sm:inline">Agregar Material</span>
	                  <span className="sr-only">Agregar material</span>
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
	          ) : viewMode === "marcas" ? (
	            <Dialog open={isAddMarcaDialogOpen} onOpenChange={setIsAddMarcaDialogOpen}>
	              <DialogTrigger asChild>
	                <Button
	                  size="icon"
	                  className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 touch-manipulation"
	                  aria-label="Agregar marca"
	                  title="Agregar marca"
	                >
	                  <Plus className="h-4 w-4 sm:mr-2" />
	                  <span className="hidden sm:inline">Agregar Marca</span>
	                  <span className="sr-only">Agregar marca</span>
	                </Button>
	              </DialogTrigger>
	              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
	                <DialogHeader>
	                  <DialogTitle>Agregar Nueva Marca</DialogTitle>
	                </DialogHeader>
	                <MarcaForm
	                  onSubmit={handleCreateMarca}
	                  onCancel={() => setIsAddMarcaDialogOpen(false)}
	                />
	              </DialogContent>
	            </Dialog>
	          ) : null
	        }
	      />

	      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
	        <div className="space-y-6">
	          {/* View Toggle - Selector de vistas */}
	          <Card className="border-0 shadow-md border-l-4 border-l-emerald-600">
	            <CardContent className="pt-6">
	              <div className="flex items-center justify-between">
	                <div className="flex items-center gap-4 flex-wrap">
	                  <Button
	                    variant={viewMode === "materials" ? "default" : "outline"}
	                    onClick={() => setViewMode("materials")}
	                    className={viewMode === "materials" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
	                  >
	                    <List className="h-4 w-4 mr-2" />
	                    Materiales
	                  </Button>
	                  <Button
	                    variant={viewMode === "categories" ? "default" : "outline"}
	                    onClick={() => setViewMode("categories")}
	                    className={viewMode === "categories" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
	                  >
	                    <Grid className="h-4 w-4 mr-2" />
	                    Categorías
	                  </Button>
	                  <Button
	                    variant={viewMode === "marcas" ? "default" : "outline"}
	                    onClick={() => setViewMode("marcas")}
	                    className={viewMode === "marcas" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
	                  >
	                    <Package className="h-4 w-4 mr-2" />
	                    Marcas
	                  </Button>
	                </div>
	              </div>
	            </CardContent>
	          </Card>

	          {/* Filters and Search - Solo para materiales y categorías */}
	          {viewMode !== "marcas" && (
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
          )}

          {/* Dynamic Content */}
          {viewMode === "marcas" ? (
            <MarcasManagement
              marcas={marcas}
              loading={marcasLoading}
              onEdit={openEditMarcaDialog}
              onDelete={openDeleteMarcaDialog}
            />
          ) : (
            <>
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
                    <MaterialsTable
                      materials={filteredMaterials}
                      onEdit={openEditDialog}
                      onDelete={deleteMaterial}
                      marcas={marcas}
                    />
                  ) : (
                    <CategoriesTable
                      key={`${searchTerm}-${catalogs.length}`}
                      categories={filteredCategories}
                      onEdit={openEditCategoryDialog}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Material</DialogTitle>
            </DialogHeader>
            {editingMaterial && (
              <MaterialForm
                key={`edit-${editingMaterial.codigo}-${categories.length}`}
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

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Categoría</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <EditCategoryForm
                category={editingCategory}
                onSubmit={updateCategory}
                onCancel={() => {
                  setIsEditCategoryDialogOpen(false)
                  setEditingCategory(null)
                }}
                onClose={() => {
                  setIsEditCategoryDialogOpen(false)
                  setEditingCategory(null)
                }}
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

        {/* Dashboard de Duplicados */}
        <DuplicatesDashboard
          open={isDuplicatesDashboardOpen}
          onOpenChange={setIsDuplicatesDashboardOpen}
          duplicates={duplicates}
        />

        {/* Edit Marca Dialog */}
        <Dialog open={isEditMarcaDialogOpen} onOpenChange={setIsEditMarcaDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Marca</DialogTitle>
            </DialogHeader>
            {editingMarca && (
              <MarcaForm
                initialData={editingMarca}
                onSubmit={handleUpdateMarca}
                onCancel={() => {
                  setIsEditMarcaDialogOpen(false)
                  setEditingMarca(null)
                }}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Marca Dialog */}
        <ConfirmDeleteDialog
          open={isDeleteMarcaDialogOpen}
          onOpenChange={setIsDeleteMarcaDialogOpen}
          title="Eliminar Marca"
          message={`¿Estás seguro de que quieres eliminar la marca "${deletingMarca?.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDeleteMarca}
          confirmText="Eliminar Marca"
          isLoading={deleteMarcaLoading}
        />
      </main>
      <Toaster />
    </div>
  )
}
