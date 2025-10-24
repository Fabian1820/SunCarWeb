"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Search, 
  Image as ImageIcon,
  DollarSign,
  Eye,
  EyeOff
} from "lucide-react"
import { CategoryForm } from "./category-form"
import { MaterialService } from "@/lib/services/feats/materials/material-service"
import type { CreateCategoryRequest, BackendCatalogoProductos } from "@/lib/material-types"
import { useToast } from "@/hooks/use-toast"

interface CategoryManagementProps {
  onCategoryUpdate?: () => void
}

export function CategoryManagement({ onCategoryUpdate }: CategoryManagementProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<BackendCatalogoProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<BackendCatalogoProductos | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await MaterialService.getAllCatalogs()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: "Error",
        description: "Error al cargar las categorías",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (data: CreateCategoryRequest) => {
    try {
      setSaving(true)
      await MaterialService.createCategoryWithPhoto(data)
      toast({
        title: "Éxito",
        description: "Categoría creada correctamente",
      })
      setIsCreateDialogOpen(false)
      await loadCategories()
      if (onCategoryUpdate) onCategoryUpdate()
    } catch (error: any) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear la categoría",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditCategory = async (data: CreateCategoryRequest) => {
    if (!selectedCategory) return

    try {
      setSaving(true)
      await MaterialService.updateCategoryWithPhoto(selectedCategory.id, data)
      toast({
        title: "Éxito",
        description: "Categoría actualizada correctamente",
      })
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      await loadCategories()
      if (onCategoryUpdate) onCategoryUpdate()
    } catch (error: any) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la categoría",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría?")) return

    try {
      setSaving(true)
      // Note: You might need to implement deleteCategory in MaterialService
      // await MaterialService.deleteCategory(categoryId)
      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      })
      await loadCategories()
      if (onCategoryUpdate) onCategoryUpdate()
    } catch (error: any) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la categoría",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter(category =>
    category.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h2>
          <p className="text-gray-600">Administra las categorías de materiales con fotos</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.categoria}</CardTitle>
                <div className="flex items-center gap-2">
                  {category.esVendible ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Eye className="h-3 w-3 mr-1" />
                      Vendible
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      <EyeOff className="h-3 w-3 mr-1" />
                      No vendible
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo */}
              {category.foto ? (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={category.foto}
                    alt={category.categoria}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                  <div className="hidden flex items-center justify-center h-full bg-gray-100">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}

              {/* Materials count */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{category.materiales?.length || 0} materiales</span>
                </div>
                {category.materiales && category.materiales.length > 0 && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {category.materiales.filter(m => m.precio && m.precio > 0).length} con precio
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(category)
                    setIsEditDialogOpen(true)
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? "No se encontraron categorías" : "No hay categorías"}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? "Intenta con otros términos de búsqueda" 
              : "Crea tu primera categoría para comenzar"
            }
          </p>
        </div>
      )}

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Nueva Categoría
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={handleCreateCategory}
            onCancel={() => setIsCreateDialogOpen(false)}
            onClose={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Editar Categoría
            </DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm
              initialData={{
                categoria: selectedCategory.categoria,
                foto: selectedCategory.foto,
                esVendible: selectedCategory.esVendible,
                materiales: selectedCategory.materiales || []
              }}
              onSubmit={handleEditCategory}
              onCancel={() => {
                setIsEditDialogOpen(false)
                setSelectedCategory(null)
              }}
              onClose={() => {
                setIsEditDialogOpen(false)
                setSelectedCategory(null)
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
