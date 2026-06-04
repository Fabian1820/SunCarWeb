"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog"
import { Plus, AlertCircle, RefreshCw } from "lucide-react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { useInventario } from "@/hooks/use-inventario"
import { TiendasTable } from "@/components/feats/inventario/tiendas-table"
import { TiendaForm } from "@/components/feats/inventario/tienda-form"
import type { Tienda } from "@/lib/inventario-types"

export default function GestionTiendasPage() {
  const router = useRouter()
  const {
    almacenes,
    tiendas,
    loading,
    error,
    refetchAll,
    createTienda,
    updateTienda,
    deleteTienda,
  } = useInventario()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTienda, setEditingTienda] = useState<Tienda | null>(null)
  const [tiendaToDelete, setTiendaToDelete] = useState<Tienda | null>(null)

  const handleCreate = async (data: Parameters<typeof createTienda>[0]) => {
    await createTienda(data)
    toast({ title: "Tienda creada correctamente" })
    setIsDialogOpen(false)
  }

  const handleUpdate = async (data: Parameters<typeof createTienda>[0]) => {
    if (!editingTienda?.id) return
    await updateTienda(editingTienda.id, data)
    toast({ title: "Tienda actualizada correctamente" })
    setEditingTienda(null)
    setIsDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!tiendaToDelete?.id) return
    await deleteTienda(tiendaToDelete.id)
    toast({ title: "Tienda eliminada correctamente" })
    setTiendaToDelete(null)
  }

  const openEdit = (tienda: Tienda) => {
    setEditingTienda(tienda)
    setIsDialogOpen(true)
  }

  const openCreate = () => {
    setEditingTienda(null)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingTienda(null)
  }

  const requestDelete = (id: string) => {
    const target = tiendas.find(t => t.id === id) || null
    setTiendaToDelete(target)
  }

  if (loading) {
    return <PageLoader moduleName="Gestión de Tiendas" text="Cargando tiendas..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Gestión de Tiendas"
        subtitle="Crear y administrar sucursales"
        badge={{ text: "Ventas", className: "bg-emerald-100 text-emerald-800" }}
        className="bg-white shadow-sm border-b border-emerald-100"
        backButton={{ href: "/tiendas-suncarventas", label: "Volver a Tiendas" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Tiendas ({tiendas.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={refetchAll}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Tienda
                </Button>
              </div>
            </div>

            {error ? (
              <div className="flex items-center gap-2 text-red-600 py-4">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : (
              <TiendasTable
                tiendas={tiendas}
                onEdit={openEdit}
                onDelete={requestDelete}
                onView={(tienda) => {
                  if (tienda.id) router.push(`/tiendas/${tienda.id}`)
                }}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTienda ? "Editar Tienda" : "Nueva Tienda"}</DialogTitle>
          </DialogHeader>
          <TiendaForm
            initialData={editingTienda ?? undefined}
            almacenes={almacenes}
            onSubmit={editingTienda ? handleUpdate : handleCreate}
            onCancel={closeDialog}
            isEditing={!!editingTienda}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tiendaToDelete} onOpenChange={(open) => { if (!open) setTiendaToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tienda</AlertDialogTitle>
            <AlertDialogDescription>
              {`Se eliminará la tienda "${tiendaToDelete?.nombre || ""}". Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
