"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shared/atom/select"
import { ArrowLeft, Search, Plus, List, RefreshCw, AlertCircle } from "lucide-react"
import { usePagos } from "@/hooks/use-pagos"
import { AnticiposPendientesTable } from "@/components/feats/pagos/anticipos-pendientes-table"
import { TodosPagosTable } from "@/components/feats/pagos/todos-pagos-table"
import { TodosPagosPlanosTable } from "@/components/feats/pagos/todos-pagos-planos-table"
import { EnProcesoPagoTable } from "@/components/feats/pagos/en-proceso-pago-table"
import { RegistrarPagoDialog } from "@/components/feats/pagos/registrar-pago-dialog"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"
import { useToast } from "@/hooks/use-toast"

type ViewMode = 'anticipos-pendientes' | 'en-proceso-pago' | 'finales-pendientes' | 'pagos-por-ofertas' | 'todos-pagos'

export default function PagosClientesPage() {
    const { 
        ofertasSinPago, 
        ofertasConSaldoPendiente, 
        ofertasConPagos, 
        loading, 
        loadingSinPago,
        loadingConSaldo,
        error, 
        refetch, 
        refetchOfertasSinPago,
        refetchOfertasConSaldoPendiente,
        refetchOfertasConPagos 
    } = usePagos()
    const { toast } = useToast()
    const [viewMode, setViewMode] = useState<ViewMode>('anticipos-pendientes')
    const [searchTerm, setSearchTerm] = useState("")
    const [estadoFilter, setEstadoFilter] = useState("all")
    const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
    const [selectedOferta, setSelectedOferta] = useState<OfertaConfirmadaSinPago | null>(null)
    const [loadingPagos, setLoadingPagos] = useState(false)

    // Filtrar ofertas según búsqueda y vista
    const filteredOfertas = useMemo(() => {
        let ofertas: OfertaConfirmadaSinPago[] = []
        
        if (viewMode === 'anticipos-pendientes') {
            ofertas = ofertasSinPago
        } else if (viewMode === 'en-proceso-pago') {
            // Para "en proceso de pago", mostramos ofertas con saldo pendiente
            ofertas = ofertasConSaldoPendiente
        } else if (viewMode === 'finales-pendientes') {
            ofertas = ofertasConSaldoPendiente
        }
        
        if (!searchTerm) return ofertas

        const term = searchTerm.toLowerCase()
        return ofertas.filter((oferta) => {
            const clienteNombre = oferta.cliente?.nombre || oferta.lead?.nombre || oferta.nombre_lead_sin_agregar || ''
            const clienteTelefono = oferta.cliente?.telefono || oferta.lead?.telefono || ''
            
            return (
                oferta.numero_oferta.toLowerCase().includes(term) ||
                clienteNombre.toLowerCase().includes(term) ||
                clienteTelefono.includes(term) ||
                oferta.almacen_nombre?.toLowerCase().includes(term)
            )
        })
    }, [ofertasSinPago, ofertasConSaldoPendiente, searchTerm, viewMode])

    const handleRegistrarPago = (oferta: OfertaConfirmadaSinPago) => {
        setSelectedOferta(oferta)
        setPagoDialogOpen(true)
    }

    const handlePagoSuccess = () => {
        toast({
            title: "Éxito",
            description: "Pago registrado correctamente",
        })
        // Solo recargar la vista actual
        if (viewMode === 'anticipos-pendientes') {
            refetchOfertasSinPago()
        } else if (viewMode === 'en-proceso-pago') {
            refetchOfertasConSaldoPendiente()
        } else if (viewMode === 'finales-pendientes') {
            refetchOfertasConSaldoPendiente()
        } else if (viewMode === 'pagos-por-ofertas' || viewMode === 'todos-pagos') {
            refetchOfertasConPagos()
        }
    }

    // Cargar ofertas con pagos solo cuando se cambia a esas vistas
    const handleViewModeChange = async (mode: ViewMode) => {
        setViewMode(mode)
        
        // Cargar datos según la vista seleccionada
        if (mode === 'anticipos-pendientes' && ofertasSinPago.length === 0) {
            await refetchOfertasSinPago()
        } else if ((mode === 'en-proceso-pago' || mode === 'finales-pendientes') && ofertasConSaldoPendiente.length === 0) {
            await refetchOfertasConSaldoPendiente()
        } else if ((mode === 'pagos-por-ofertas' || mode === 'todos-pagos') && ofertasConPagos.length === 0) {
            setLoadingPagos(true)
            await refetchOfertasConPagos()
            setLoadingPagos(false)
        }
    }

    // Cargar datos de la vista inicial al montar el componente
    useEffect(() => {
        if (viewMode === 'anticipos-pendientes') {
            refetchOfertasSinPago()
        }
    }, []) // Solo ejecutar una vez al montar

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
            {/* Header */}
            <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
                        <div className="flex items-center space-x-3">
                            <Link href="/facturas">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                                    aria-label="Volver a Facturación"
                                    title="Volver a Facturación"
                                >
                                    <ArrowLeft className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Volver a Facturación</span>
                                    <span className="sr-only">Volver a Facturación</span>
                                </Button>
                            </Link>
                            <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                                    Cobros Clientes
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Finanzas
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gestión de cobros recibidos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                size="icon"
                                className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 touch-manipulation"
                                aria-label="Registrar cobro"
                                title="Registrar cobro"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Registrar Cobro</span>
                                <span className="sr-only">Registrar cobro</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800">Error al cargar datos</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={refetch}
                                className="text-red-600 hover:text-red-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* View Toggle - Selector de vistas */}
                    <Card className="border-0 shadow-md border-l-4 border-l-green-600">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <Button
                                        variant={viewMode === 'anticipos-pendientes' ? "default" : "outline"}
                                        onClick={() => handleViewModeChange('anticipos-pendientes')}
                                        className={
                                            viewMode === 'anticipos-pendientes'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Anticipos Pendientes
                                    </Button>
                                    <Button
                                        variant={viewMode === 'en-proceso-pago' ? "default" : "outline"}
                                        onClick={() => handleViewModeChange('en-proceso-pago')}
                                        className={
                                            viewMode === 'en-proceso-pago'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        En Proceso de Pago
                                    </Button>
                                    <Button
                                        variant={viewMode === 'finales-pendientes' ? "default" : "outline"}
                                        onClick={() => handleViewModeChange('finales-pendientes')}
                                        className={
                                            viewMode === 'finales-pendientes'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Cobros Finales Pendientes
                                    </Button>
                                    <Button
                                        variant={viewMode === 'pagos-por-ofertas' ? "default" : "outline"}
                                        onClick={() => handleViewModeChange('pagos-por-ofertas')}
                                        disabled={loadingPagos}
                                        className={
                                            viewMode === 'pagos-por-ofertas'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Cobros por Ofertas
                                    </Button>
                                    <Button
                                        variant={viewMode === 'todos-pagos' ? "default" : "outline"}
                                        onClick={() => handleViewModeChange('todos-pagos')}
                                        disabled={loadingPagos}
                                        className={
                                            viewMode === 'todos-pagos'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Todos los Cobros
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Filters and Search */}
                    <Card className="border-0 shadow-md mb-6 border-l-4 border-l-green-600">
                        <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                                <div className="flex-1">
                                    <Label
                                        htmlFor="search"
                                        className="text-sm font-medium text-gray-700 mb-2 block"
                                    >
                                        Buscar Cobro
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="search"
                                            placeholder="Buscar por cliente, referencia..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Area */}
                    <Card className="border-0 shadow-md border-l-4 border-l-green-600">
                        <CardHeader>
                            <CardTitle>Cobros Clientes</CardTitle>
                            <CardDescription>
                                {viewMode === 'anticipos-pendientes' && 
                                    `Mostrando ${filteredOfertas.length} de ${ofertasSinPago.length} ofertas confirmadas sin pago`
                                }
                                {viewMode === 'en-proceso-pago' && 
                                    `Mostrando ${filteredOfertas.length} de ${ofertasConSaldoPendiente.length} pagos en proceso`
                                }
                                {viewMode === 'finales-pendientes' && 
                                    `Mostrando ${filteredOfertas.length} de ${ofertasConSaldoPendiente.length} ofertas con saldo pendiente`
                                }
                                {viewMode === 'pagos-por-ofertas' && `Mostrando ${ofertasConPagos.length} ofertas con cobros`}
                                {viewMode === 'todos-pagos' && `Mostrando ${ofertasConPagos.reduce((acc, o) => acc + o.cantidad_pagos, 0)} cobros registrados`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {viewMode === 'pagos-por-ofertas' ? (
                                <TodosPagosTable
                                    ofertasConPagos={ofertasConPagos}
                                    loading={loadingPagos}
                                />
                            ) : viewMode === 'todos-pagos' ? (
                                <TodosPagosPlanosTable
                                    ofertasConPagos={ofertasConPagos}
                                    loading={loadingPagos}
                                    onPagoUpdated={refetchOfertasConPagos}
                                />
                            ) : viewMode === 'en-proceso-pago' ? (
                                <EnProcesoPagoTable
                                    ofertas={filteredOfertas}
                                    loading={loadingConSaldo}
                                    onRegistrarPago={handleRegistrarPago}
                                />
                            ) : (
                                <AnticiposPendientesTable
                                    ofertas={filteredOfertas}
                                    loading={viewMode === 'anticipos-pendientes' ? loadingSinPago : loadingConSaldo}
                                    onRegistrarPago={handleRegistrarPago}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Dialog de Registro de Pago */}
            <RegistrarPagoDialog
                open={pagoDialogOpen}
                onOpenChange={setPagoDialogOpen}
                oferta={selectedOferta}
                onSuccess={handlePagoSuccess}
            />
        </div>
    )
}
