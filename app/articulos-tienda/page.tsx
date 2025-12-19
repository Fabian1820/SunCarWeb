"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { ShoppingBag, Plus, Search, AlertCircle, Loader2, RefreshCw, Eye } from "lucide-react"
import { ArticulosTiendaTable } from "@/components/feats/articulos-tienda/articulos-tienda-table"
import { ArticuloTiendaForm } from "@/components/feats/articulos-tienda/articulo-tienda-form"
import { useArticulosTienda } from "@/hooks/use-articulos-tienda"
import type { ArticuloTienda, ArticuloTiendaCreateData, ArticuloTiendaUpdateData } from "@/lib/articulos-tienda-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function ArticulosTiendaPage() {
    const {
        articulos,
        loading,
        error,
        refetch,
        createArticulo,
        updateArticulo,
        deleteArticulo,
        categories,
        unidades,
    } = useArticulosTienda()
    const { toast } = useToast()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedUnidad, setSelectedUnidad] = useState("all")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [editingArticulo, setEditingArticulo] = useState<ArticuloTienda | null>(null)
    const [viewingArticulo, setViewingArticulo] = useState<ArticuloTienda | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [articuloToDelete, setArticuloToDelete] = useState<ArticuloTienda | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleAddArticulo = async (data: ArticuloTiendaCreateData) => {
        try {
            await createArticulo(data)
            toast({
                title: "Éxito",
                description: "Artículo creado exitosamente",
            })
            setIsAddDialogOpen(false)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Error al crear el artículo",
                variant: "destructive",
            })
        }
    }

    const handleUpdateArticulo = async (data: ArticuloTiendaUpdateData) => {
        if (!editingArticulo?.id && !editingArticulo?.articulo_id) {
            toast({
                title: "Error",
                description: "No se pudo identificar el artículo a actualizar",
                variant: "destructive",
            })
            return
        }

        try {
            const id = editingArticulo.id || editingArticulo.articulo_id || ""
            await updateArticulo(id, data)
            toast({
                title: "Éxito",
                description: "Artículo actualizado exitosamente",
            })
            setIsEditDialogOpen(false)
            setEditingArticulo(null)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Error al actualizar el artículo",
                variant: "destructive",
            })
        }
    }

    const handleDeleteArticulo = (id: string) => {
        const articulo = articulos.find((a) => (a.id || a.articulo_id) === id)
        if (!articulo) {
            toast({
                title: "Error",
                description: "No se encontró el artículo",
                variant: "destructive",
            })
            return
        }
        setArticuloToDelete(articulo)
        setIsDeleteDialogOpen(true)
    }

    const confirmDeleteArticulo = async () => {
        if (!articuloToDelete) return

        const id = articuloToDelete.id || articuloToDelete.articulo_id || ""
        if (!id) {
            toast({
                title: "Error",
                description: "No se pudo identificar el artículo a eliminar",
                variant: "destructive",
            })
            return
        }

        setDeleteLoading(true)
        try {
            await deleteArticulo(id)
            toast({
                title: "Éxito",
                description: "Artículo eliminado exitosamente",
            })
            setIsDeleteDialogOpen(false)
            setArticuloToDelete(null)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.message || "Error al eliminar el artículo",
                variant: "destructive",
            })
        } finally {
            setDeleteLoading(false)
        }
    }

    const openEditDialog = (articulo: ArticuloTienda) => {
        setEditingArticulo(articulo)
        setIsEditDialogOpen(true)
    }

    const openViewDialog = (articulo: ArticuloTienda) => {
        setViewingArticulo(articulo)
        setIsViewDialogOpen(true)
    }

    const filteredArticulos = articulos.filter((articulo) => {
        const matchesSearch =
            articulo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            articulo.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (articulo.descripcion_uso?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        const matchesCategoryFilter = selectedCategory === "all" || articulo.categoria === selectedCategory
        const matchesUnidadFilter = selectedUnidad === "all" || articulo.unidad === selectedUnidad
        return matchesSearch && matchesCategoryFilter && matchesUnidadFilter
    })

    if (loading) {
        return <PageLoader moduleName="Artículos Tienda" text="Cargando catálogo de artículos..." />
    }

	    if (error) {
	        return (
	            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
	                <div className="text-center max-w-md">
	                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
	                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar artículos</h3>
	                    <p className="text-gray-600 mb-4">{error}</p>
	                    <Button
	                        size="icon"
	                        onClick={refetch}
	                        className="h-10 w-10 bg-blue-600 hover:bg-blue-700 touch-manipulation"
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
	        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
	            {/* Header */}
	            <ModuleHeader
	                title="Gestión de Artículos Tienda"
	                subtitle="Administrar catálogo de artículos de tienda"
	                badge={{ text: "Tienda", className: "bg-blue-100 text-blue-800" }}
	                className="bg-white shadow-sm border-b border-blue-100"
	                actions={
	                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
	                        <DialogTrigger asChild>
	                            <Button
	                                size="icon"
	                                className="h-9 w-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 touch-manipulation"
	                                aria-label="Agregar artículo"
	                                title="Agregar artículo"
	                            >
	                                <Plus className="h-4 w-4 sm:mr-2" />
	                                <span className="hidden sm:inline">Agregar Artículo</span>
	                                <span className="sr-only">Agregar artículo</span>
	                            </Button>
	                        </DialogTrigger>
	                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
	                            <DialogHeader>
	                                <DialogTitle>Agregar Nuevo Artículo</DialogTitle>
	                            </DialogHeader>
	                            <ArticuloTiendaForm
	                                onSubmit={handleAddArticulo}
	                                onCancel={() => setIsAddDialogOpen(false)}
	                                onClose={() => setIsAddDialogOpen(false)}
	                                existingCategories={categories}
	                            />
	                        </DialogContent>
	                    </Dialog>
	                }
	            />

	            <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
	                <div className="space-y-6">
	                    {/* Filters and Search */}
	                    <Card className="border-0 shadow-md mb-6 border-l-4 border-l-blue-600">
	                        <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Buscar Artículo
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="search"
                                            placeholder="Buscar por modelo, categoría o descripción..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
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
                                <div className="lg:w-48">
                                    <Label htmlFor="unidad-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Filtrar por Unidad
                                    </Label>
                                    <Select value={selectedUnidad} onValueChange={setSelectedUnidad}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todas las unidades" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las unidades</SelectItem>
                                            {unidades.map((unidad) => (
                                                <SelectItem key={unidad} value={unidad}>
                                                    {unidad.charAt(0).toUpperCase() + unidad.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="border-0 shadow-md border-l-4 border-l-blue-600">
                        <CardHeader>
                            <CardTitle>Catálogo de Artículos</CardTitle>
                            <CardDescription>
                                Mostrando {filteredArticulos.length} de {articulos.length} artículos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ArticulosTiendaTable
                                articulos={filteredArticulos}
                                onEdit={openEditDialog}
                                onDelete={handleDeleteArticulo}
                                onView={openViewDialog}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar Artículo</DialogTitle>
                        </DialogHeader>
                        {editingArticulo && (
                            <ArticuloTiendaForm
                                initialData={editingArticulo}
                                onSubmit={handleUpdateArticulo}
                                onCancel={() => {
                                    setIsEditDialogOpen(false)
                                    setEditingArticulo(null)
                                }}
                                onClose={() => {
                                    setIsEditDialogOpen(false)
                                    setEditingArticulo(null)
                                }}
                                existingCategories={categories}
                                isEditing
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* View Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalles del Artículo</DialogTitle>
                        </DialogHeader>
                        {viewingArticulo && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Categoría</Label>
                                        <p className="text-sm text-gray-900">{viewingArticulo.categoria}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Modelo</Label>
                                        <p className="text-sm text-gray-900">{viewingArticulo.modelo}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Unidad</Label>
                                        <p className="text-sm text-gray-900">{viewingArticulo.unidad}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Precio</Label>
                                        <p className="text-sm text-gray-900">${viewingArticulo.precio.toFixed(2)}</p>
                                    </div>
                                </div>
                                {viewingArticulo.descripcion_uso && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Descripción de Uso</Label>
                                        <p className="text-sm text-gray-900">{viewingArticulo.descripcion_uso}</p>
                                    </div>
                                )}
                                {viewingArticulo.foto && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Foto</Label>
                                        <div className="mt-2">
                                            <img
                                                src={viewingArticulo.foto}
                                                alt={viewingArticulo.modelo}
                                                className="max-w-full h-auto rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                                {viewingArticulo.precio_por_cantidad && Object.keys(viewingArticulo.precio_por_cantidad).length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Precios por Cantidad</Label>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(viewingArticulo.precio_por_cantidad)
                                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                .map(([cantidad, precio]) => (
                                                    <div key={cantidad} className="flex items-center space-x-2 p-2 bg-blue-50 rounded border border-blue-200">
                                                        <span className="text-sm font-medium text-gray-700">{cantidad} unidades:</span>
                                                        <span className="text-sm font-semibold text-blue-700">${Number(precio).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                                {viewingArticulo.especificaciones && Object.keys(viewingArticulo.especificaciones).length > 0 && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Especificaciones</Label>
                                        <div className="mt-2 space-y-2">
                                            {Object.entries(viewingArticulo.especificaciones).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                                    <span className="text-sm font-medium text-gray-700">{key}:</span>
                                                    <span className="text-sm text-gray-600">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <ConfirmDeleteDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    title="Eliminar Artículo"
                    message={`¿Estás seguro de que quieres eliminar el artículo "${articuloToDelete?.modelo}"? Esta acción no se puede deshacer.`}
                    onConfirm={confirmDeleteArticulo}
                    confirmText="Eliminar Artículo"
                    isLoading={deleteLoading}
                />
            </main>
            <Toaster />
        </div>
    )
}

