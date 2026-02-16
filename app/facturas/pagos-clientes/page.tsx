"use client"

import { useState, useMemo } from "react"
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
import { RegistrarPagoDialog } from "@/components/feats/pagos/registrar-pago-dialog"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"
import { useToast } from "@/hooks/use-toast"

type ViewMode = 'anticipos-pendientes' | 'finales-pendientes' | 'todos'

export default function PagosClientesPage() {
    const { ofertasSinPago, ofertasConSaldoPendiente, todosPagos, loading, error, refetch } = usePagos()
    const { toast } = useToast()
    const [viewMode, setViewMode] = useState<ViewMode>('anticipos-pendientes')
    const [searchTerm, setSearchTerm] = useState("")
    const [estadoFilter, setEstadoFilter] = useState("all")
    const [pagoDialogOpen, setPagoDialogOpen] = useState(false)
    const [selectedOferta, setSelectedOferta] = useState<OfertaConfirmadaSinPago | null>(null)

    // Filtrar ofertas según búsqueda y vista
    const filteredOfertas = useMemo(() => {
        const ofertas = viewMode === 'anticipos-pendientes' ? ofertasSinPago : ofertasConSaldoPendiente
        
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
        refetch()
    }

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
                                    Pagos Clientes
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Finanzas
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gestión de pagos recibidos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={refetch}
                                className="h-9 w-9 touch-manipulation"
                                aria-label="Recargar"
                                title="Recargar"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 touch-manipulation"
                                aria-label="Registrar pago"
                                title="Registrar pago"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Registrar Pago</span>
                                <span className="sr-only">Registrar pago</span>
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
                                        onClick={() => setViewMode('anticipos-pendientes')}
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
                                        variant={viewMode === 'finales-pendientes' ? "default" : "outline"}
                                        onClick={() => setViewMode('finales-pendientes')}
                                        className={
                                            viewMode === 'finales-pendientes'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Pagos Finales Pendientes
                                    </Button>
                                    <Button
                                        variant={viewMode === 'todos' ? "default" : "outline"}
                                        onClick={() => setViewMode('todos')}
                                        className={
                                            viewMode === 'todos'
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        Todos los Pagos
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
                                        Buscar Pago
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
                                {viewMode === 'todos' && (
                                    <div className="lg:w-48">
                                        <Label
                                            htmlFor="estado-filter"
                                            className="text-sm font-medium text-gray-700 mb-2 block"
                                        >
                                            Filtrar por Estado
                                        </Label>
                                        <Select
                                            value={estadoFilter}
                                            onValueChange={setEstadoFilter}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos los estados" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los estados</SelectItem>
                                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                                <SelectItem value="completado">Completado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Content Area */}
                    <Card className="border-0 shadow-md border-l-4 border-l-green-600">
                        <CardHeader>
                            <CardTitle>
                                {viewMode === 'anticipos-pendientes' && 'Anticipos Pendientes'}
                                {viewMode === 'finales-pendientes' && 'Pagos Finales Pendientes'}
                                {viewMode === 'todos' && 'Todos los Pagos'}
                            </CardTitle>
                            <CardDescription>
                                {viewMode === 'anticipos-pendientes' && 
                                    `Mostrando ${filteredOfertas.length} de ${ofertasSinPago.length} ofertas confirmadas sin pago`
                                }
                                {viewMode === 'finales-pendientes' && 
                                    `Mostrando ${filteredOfertas.length} de ${ofertasConSaldoPendiente.length} ofertas con saldo pendiente`
                                }
                                {viewMode === 'todos' && `Mostrando ${todosPagos.length} pagos registrados`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {viewMode === 'todos' ? (
                                <TodosPagosTable
                                    pagos={todosPagos}
                                    loading={loading}
                                />
                            ) : (
                                <AnticiposPendientesTable
                                    ofertas={filteredOfertas}
                                    loading={loading}
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
