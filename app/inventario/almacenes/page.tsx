"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { useInventario } from "@/hooks/use-inventario"
import { AlmacenesTable } from "@/components/feats/inventario/almacenes-table"
import { AlmacenForm } from "@/components/feats/inventario/almacen-form"
import type { Almacen } from "@/lib/inventario-types"

export default function GestionAlmacenesPage() {
  const router = useRouter()
  const {
    almacenes,
    loading,
    error,
    refetchAll,
    createAlmacen,
    updateAlmacen,
    deleteAlmacen,
  } = useInventario()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async (data: Parameters<typeof createAlmacen>[0]) => {
    await createAlmacen(data)
    toast({ title: "Almacén creado correctamente" })
    setIsDialogOpen(false)
  }

  const handleUpdate = async (data: Parameters<typeof createAlmacen>[0]) => {
    if (!editingAlmacen?.id) return
    await updateAlmacen(editingAlmacen.id, data)
    toast({ title: "Almacén actualizado correctamente" })
    setEditingAlmacen(null)
    setIsDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    await deleteAlmacen(deletingId)
    toast({ title: "Almacén eliminado correctamente" })
    setDeletingId(null)
  }

  const openEdit = (almacen: Almacen) => {
    setEditingAlmacen(almacen)
    setIsDialogOpen(true)
  }

  const openCreate = () => {
    setEditingAlmacen(null)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingAlmacen(null)
  }

  if (loading) {
    return <PageLoader moduleName="Gestión de Almacenes" text="Cargando almacenes..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ModuleHeader
        title="Gestión de Almacenes"
        subtitle="Crear y administrar almacenes"
        badge={{ text: "Inventario", className: "bg-blue-100 text-blue-800" }}
        className="bg-white shadow-sm border-b border-blue-100"
        backButton={{ href: "/almacenes-suncar", label: "Volver a Almacenes" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Almacenes ({almacenes.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={refetchAll}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Almacén
                </Button>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 text-red-600 py-4">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : (
              <AlmacenesTable
                almacenes={almacenes}
                onEdit={openEdit}
                onDelete={(id) => setDeletingId(id)}
                onView={(almacen) => {
                  if (almacen.id) router.push(`/almacenes/${almacen.id}`)
                }}
              />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAlmacen ? "Editar Almacén" : "Nuevo Almacén"}</DialogTitle>
          </DialogHeader>
          <AlmacenForm
            initialData={editingAlmacen ?? undefined}
            onSubmit={editingAlmacen ? handleUpdate : handleCreate}
            onCancel={closeDialog}
            isEditing={!!editingAlmacen}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <ConfirmDeleteDialog
        open={!!deletingId}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        title="Eliminar almacén"
        description="¿Estás seguro de que deseas eliminar este almacén? Esta acción no se puede deshacer."
      />
    </div>
  )
}
