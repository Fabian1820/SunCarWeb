"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Plus } from "lucide-react"
import { useFacturas } from "@/hooks/use-facturas"
import { FacturasFilters } from "./facturas-filters"
import { FacturasTable } from "./facturas-table"
import { FacturaFormDialog } from "./factura-form-dialog"
import type { Factura, Vale } from "@/lib/types/feats/facturas/factura-types"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { ValeForm } from "./vale-form"
import { useMaterials } from "@/hooks/use-materials"
import { ArrowLeft } from "lucide-react"

export function FacturasSection() {
    const {
        facturas,
        stats,
        loading,
        error,
        filters,
        aplicarFiltros,
        limpiarFiltros,
        obtenerNumeroSugerido,
        crearFactura,
        actualizarFactura,
        eliminarFactura,
        agregarVale,
    } = useFacturas()
    const { materials, loading: loadingMaterials } = useMaterials()

    const [formDialogOpen, setFormDialogOpen] = useState(false)
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [facturaToDelete, setFacturaToDelete] = useState<string | null>(null)
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
    const [facturaDetails, setFacturaDetails] = useState<Factura | null>(null)
    const [valesListDialogOpen, setValesListDialogOpen] = useState(false)
    const [valeDialogOpen, setValeDialogOpen] = useState(false)
    const [facturaForVale, setFacturaForVale] = useState<Factura | null>(null)
    const [valeDraft, setValeDraft] = useState<Vale>({
        fecha: '',
        items: [],
    })

    const exportFacturaItems = () => {
        if (!facturaDetails || !facturaDetails.vales) return
        const rows = facturaDetails.vales.flatMap((vale, valeIndex) =>
            vale.items.map((item) => ({
                vale: valeIndex + 1,
                fecha_vale: vale.fecha ? new Date(vale.fecha).toISOString().slice(0, 10) : '',
                codigo: item.codigo,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio: item.precio,
                subtotal: item.precio * item.cantidad,
            }))
        )
        const headers = ['Vale', 'Fecha vale', 'Código', 'Descripción', 'Cantidad', 'Precio', 'Subtotal']
        const csvBody = rows
            .map((r) => [r.vale, r.fecha_vale, r.codigo, `"${(r.descripcion || '').replace(/"/g, '""')}"`, r.cantidad, r.precio, r.subtotal].join(','))
            .join('\n')
        const csvContent = [headers.join(','), csvBody].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `factura_${facturaDetails.numero_factura || 'detalle'}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleCreate = () => {
        setSelectedFactura(null)
        setFormDialogOpen(true)
    }

    const handleEdit = (factura: Factura) => {
        setSelectedFactura(factura)
        setFormDialogOpen(true)
    }

    const handleViewDetails = (factura: Factura) => {
        setFacturaDetails(factura)
        setDetailsDialogOpen(true)
    }

    const handleDeleteClick = (id: string) => {
        setFacturaToDelete(id)
        setDeleteDialogOpen(true)
    }

    const handleAddValeClick = (factura: Factura) => {
        setFacturaForVale(factura)
        setValeDraft({
            fecha: '',
            items: [],
        })
        setValeDialogOpen(true)
    }

    const handleSaveVale = async () => {
        if (!facturaForVale?.id) return
        await agregarVale(facturaForVale.id, valeDraft)
        setValeDialogOpen(false)
    }

    const confirmDelete = async () => {
        if (!facturaToDelete) return

        try {
            await eliminarFactura(facturaToDelete)
            setDeleteDialogOpen(false)
            setFacturaToDelete(null)
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error eliminando factura')
        }
    }

    const handleSave = async (factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>) => {
        if (selectedFactura?.id) {
            await actualizarFactura(selectedFactura.id, factura)
        } else {
            await crearFactura(factura)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
            {/* Header */}
            <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
	                        <div className="flex items-center space-x-3">
	                            <Link href="/">
	                                <Button
	                                    variant="ghost"
	                                    size="icon"
	                                    className="touch-manipulation"
	                                    aria-label="Volver al Dashboard"
	                                    title="Volver al Dashboard"
	                                >
	                                    <ArrowLeft className="h-4 w-4" />
	                                    <span className="sr-only">Volver al Dashboard</span>
	                                </Button>
	                            </Link>
                            <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                                    Gestión de Facturas
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        Finanzas
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Control de facturación y vales</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 justify-end">
                            <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                                Total facturado: {formatCurrency(stats?.total_facturado || 0)}
                            </div>
	                            <Button
	                                onClick={handleCreate}
	                                size="icon"
	                                className="h-10 w-10 bg-orange-600 hover:bg-orange-700 touch-manipulation"
	                                aria-label="Nueva factura"
	                                title="Nueva factura"
	                            >
	                                <Plus className="h-4 w-4" />
	                                <span className="sr-only">Nueva factura</span>
	                            </Button>
	                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-4">
                        <p className="text-red-600">Error: {error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    <FacturasFilters
                        filters={filters}
                        onApplyFilters={aplicarFiltros}
                        onClearFilters={limpiarFiltros}
                    />

                    <FacturasTable
                        facturas={facturas}
                        loading={loading}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        onViewDetails={handleViewDetails}
                        onAddVale={handleAddValeClick}
                    />
                </div>
            </main>

            {/* Dialog de Formulario */}
            <FacturaFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                factura={selectedFactura}
                onSave={handleSave}
                onGetNumeroSugerido={obtenerNumeroSugerido}
            />

            {/* Dialog de Confirmación de Eliminación */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. La factura y todos sus vales serán eliminados permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Detalles */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Detalles de Factura</DialogTitle>
                            {facturaDetails?.vales?.length ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportFacturaItems}
                                    >
                                        Exportar CSV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setValesListDialogOpen(true)}
                                    >
                                        Ver vales ({facturaDetails.vales.length})
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </DialogHeader>

                    {facturaDetails && (
                        <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
                            {/* Información General */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Número de Factura</p>
                                    <p className="font-semibold text-lg">{facturaDetails.numero_factura}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Cliente</p>
                                    <p className="font-semibold">{facturaDetails.nombre_cliente || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="font-bold text-xl text-orange-600">
                                        {formatCurrency(facturaDetails.total || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Estado</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${facturaDetails.pagada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {facturaDetails.pagada ? 'Pagada' : 'No Pagada'}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${facturaDetails.terminada ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {facturaDetails.terminada ? 'Terminada' : 'En Proceso'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Items combinados de todos los vales */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">
                                    Items ({facturaDetails.vales.reduce((acc, v) => acc + v.items.length, 0)})
                                </h3>
                                {facturaDetails.vales.flatMap((vale, valeIndex) =>
                                    vale.items.map((item, itemIndex) => ({
                                        valeIndex,
                                        ...item,
                                    }))
                                ).map((entry, idx) => (
                                    <div key={`${entry.valeIndex}-${idx}-${entry.codigo}`} className="grid grid-cols-12 gap-2 text-sm bg-white p-3 rounded border">
                                        <div className="col-span-1 text-gray-500">#{idx + 1}</div>
                                        <div className="col-span-4">
                                            <p className="font-medium">{entry.descripcion}</p>
                                            <p className="text-gray-500 text-xs">Cod: {entry.codigo}</p>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <p>Cant: {entry.cantidad}</p>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <p>Precio: {formatCurrency(entry.precio)}</p>
                                        </div>
                                        <div className="col-span-2 text-right font-semibold">
                                            <p>Subtotal: {formatCurrency(entry.precio * entry.cantidad)}</p>
                                        </div>
                                        <div className="col-span-1 text-right text-xs text-gray-500">
                                            Vale {entry.valeIndex + 1}
                                        </div>
                                    </div>
                                ))}
                                {facturaDetails.vales.length === 0 && (
                                    <p className="text-sm text-gray-500">No hay vales asociados.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialogo listado de vales */}
            <Dialog open={valesListDialogOpen} onOpenChange={setValesListDialogOpen}>
                <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Vales asociados</DialogTitle>
                    </DialogHeader>
                    {facturaDetails?.vales?.length ? (
                        <div className="space-y-4">
                            {facturaDetails.vales.map((vale, valeIndex) => (
                                <div key={valeIndex} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold">Vale #{valeIndex + 1}</h4>
                                        <div className="text-sm text-gray-600">
                                            Fecha: {new Date(vale.fecha).toLocaleDateString('es-ES')}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {vale.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                                <div className="flex-1">
                                                    <p className="font-medium">{item.codigo} - {item.descripcion}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {formatCurrency(item.precio)} x {item.cantidad}
                                                    </p>
                                                </div>
                                                <div className="font-semibold">
                                                    {formatCurrency(item.precio * item.cantidad)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between font-semibold">
                                        <span>Total del Vale:</span>
                                        <span className="text-orange-600">
                                            {formatCurrency(vale.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No hay vales asociados.</p>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialogo para agregar vale a factura existente */}
            <Dialog open={valeDialogOpen} onOpenChange={setValeDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Agregar Vale</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Factura: <span className="font-semibold">{facturaForVale?.numero_factura || 'Sin número'}</span>
                        </p>
                        <ValeForm
                            vale={valeDraft}
                            index={0}
                            materiales={materials}
                            onChange={(_, vale) => setValeDraft(vale)}
                            onRemove={() => setValeDraft(valeDraft)}
                            canRemove={false}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setValeDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveVale}
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={loadingMaterials || valeDraft.items.length === 0 || !valeDraft.fecha}
                            >
                                Guardar Vale
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
