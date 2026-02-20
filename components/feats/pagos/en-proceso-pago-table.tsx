"use client"

import React, { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shared/molecule/table"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Loader2, ChevronDown, ChevronRight, Clock, DollarSign } from "lucide-react"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"

interface EnProcesoPagoTableProps {
    ofertas: OfertaConfirmadaSinPago[]
    loading: boolean
    onRegistrarPago?: (oferta: OfertaConfirmadaSinPago) => void
}

export function EnProcesoPagoTable({
    ofertas,
    loading,
    onRegistrarPago,
}: EnProcesoPagoTableProps) {
    const [expandedOfertas, setExpandedOfertas] = useState<Set<string>>(new Set())

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const getClienteNombre = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.contacto?.nombre) return oferta.contacto.nombre
        if (oferta.cliente?.nombre) return oferta.cliente.nombre
        if (oferta.lead?.nombre) return oferta.lead.nombre
        if (oferta.nombre_lead_sin_agregar) return oferta.nombre_lead_sin_agregar
        return 'Sin nombre'
    }

    const getClienteTelefono = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.contacto?.telefono) return oferta.contacto.telefono
        if (oferta.cliente?.telefono) return oferta.cliente.telefono
        if (oferta.lead?.telefono) return oferta.lead.telefono
        return '-'
    }

    const getClienteDireccion = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.contacto?.direccion) return oferta.contacto.direccion
        if (oferta.cliente?.direccion) return oferta.cliente.direccion
        if (oferta.lead?.direccion) return oferta.lead.direccion
        return '-'
    }

    const getClienteCI = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.contacto?.carnet) return oferta.contacto.carnet
        if (oferta.cliente?.carnet_identidad) return oferta.cliente.carnet_identidad
        if (oferta.cliente?.numero) return oferta.cliente.numero
        return '-'
    }

    const toggleOferta = (ofertaId: string) => {
        const newExpanded = new Set(expandedOfertas)
        if (newExpanded.has(ofertaId)) {
            newExpanded.delete(ofertaId)
        } else {
            newExpanded.add(ofertaId)
        }
        setExpandedOfertas(newExpanded)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        )
    }

    if (ofertas.length === 0) {
        return (
            <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No hay pagos en proceso</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[110px]">N° Oferta</TableHead>
                        <TableHead className="w-[180px]">Nombre Oferta</TableHead>
                        <TableHead className="w-[160px]">Cliente</TableHead>
                        <TableHead className="w-[100px]">CI</TableHead>
                        <TableHead className="text-right w-[110px]">Precio Final</TableHead>
                        <TableHead className="text-right w-[110px]">Pendiente</TableHead>
                        <TableHead className="w-[100px]">Estado</TableHead>
                        <TableHead className="text-right w-[130px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ofertas.map((oferta) => {
                        const isExpanded = expandedOfertas.has(oferta.id)
                        return (
                            <React.Fragment key={oferta.id}>
                                {/* Fila principal de la oferta */}
                                <TableRow 
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => toggleOferta(oferta.id)}
                                >
                                    <TableCell className="py-3">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-gray-500" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm py-3">
                                        <div className="break-words">
                                            {oferta.numero_oferta}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="max-w-[180px]">
                                            <span className="text-sm font-medium text-gray-900 block break-words">
                                                {oferta.nombre_completo || oferta.nombre_oferta || '-'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="flex flex-col max-w-[160px] gap-0.5">
                                            <span className="font-medium text-sm break-words">{getClienteNombre(oferta)}</span>
                                            {oferta.cliente_numero && (
                                                <span className="text-xs text-gray-500">
                                                    #{oferta.cliente_numero}
                                                </span>
                                            )}
                                            {oferta.lead_id && (
                                                <span className="text-xs text-gray-500">Lead</span>
                                            )}
                                            <span className="text-xs text-gray-600 break-words">
                                                {getClienteTelefono(oferta)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-sm break-words">{getClienteCI(oferta)}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm py-3">
                                        <div className="break-words">
                                            {formatCurrency(oferta.precio_final)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-3">
                                        <div className="break-words">
                                            <span className="font-bold text-orange-600 text-sm">
                                                {formatCurrency(oferta.monto_pendiente)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                            <Clock className="h-3 w-3 mr-1" />
                                            En proceso
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right py-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-start justify-end">
                                            {onRegistrarPago && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => onRegistrarPago(oferta)}
                                                    className="bg-green-600 hover:bg-green-700 h-8 px-3 text-sm"
                                                >
                                                    <DollarSign className="h-4 w-4 mr-1" />
                                                    Pagar
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* Filas expandidas con detalles del pago */}
                                {isExpanded && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="bg-gray-50 p-0">
                                            <div className="p-4 border-t-2 border-yellow-200">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <span className="h-1 w-1 rounded-full bg-yellow-600"></span>
                                                    Detalles del Pago en Proceso
                                                </h4>
                                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {/* Información del Cliente */}
                                                        <div className="space-y-3">
                                                            <div className="mb-2">
                                                                <span className="text-xs font-semibold text-gray-500 block mb-1">INFORMACIÓN DEL CLIENTE</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Nombre</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {getClienteNombre(oferta)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Teléfono</span>
                                                                <span className="text-sm text-gray-700">
                                                                    {getClienteTelefono(oferta)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">CI</span>
                                                                <span className="text-sm text-gray-700">
                                                                    {getClienteCI(oferta)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Dirección</span>
                                                                <span className="text-sm text-gray-700">
                                                                    {getClienteDireccion(oferta)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Información Financiera */}
                                                        <div className="space-y-3">
                                                            <div className="mb-2">
                                                                <span className="text-xs font-semibold text-gray-500 block mb-1">INFORMACIÓN FINANCIERA</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Precio Final</span>
                                                                <span className="text-sm font-semibold text-gray-900">
                                                                    {formatCurrency(oferta.precio_final)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Monto Pendiente</span>
                                                                <span className="text-sm font-bold text-orange-600">
                                                                    {formatCurrency(oferta.monto_pendiente)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Moneda de Pago</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {oferta.moneda_pago}
                                                                </Badge>
                                                            </div>
                                                            {oferta.tasa_cambio && (
                                                                <div>
                                                                    <span className="text-xs text-gray-500 block">Tasa de Cambio</span>
                                                                    <span className="text-sm text-gray-700">
                                                                        {oferta.tasa_cambio}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {oferta.aplica_contribucion && (
                                                                <div>
                                                                    <span className="text-xs text-gray-500 block">Contribución</span>
                                                                    <span className="text-sm text-gray-700">
                                                                        {oferta.porcentaje_contribucion}% ({formatCurrency(oferta.monto_contribucion || 0)})
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Información de la Oferta */}
                                                        <div className="space-y-3">
                                                            <div className="mb-2">
                                                                <span className="text-xs font-semibold text-gray-500 block mb-1">INFORMACIÓN DE LA OFERTA</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Almacén</span>
                                                                <span className="text-sm text-gray-700">
                                                                    {oferta.almacen_nombre || '-'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Tipo de Oferta</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {oferta.tipo_oferta}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-gray-500 block">Fecha de Creación</span>
                                                                <span className="text-sm text-gray-700">
                                                                    {formatDate(oferta.fecha_creacion)}
                                                                </span>
                                                            </div>
                                                            {oferta.pago_transferencia && (
                                                                <div>
                                                                    <span className="text-xs text-gray-500 block">Pago por Transferencia</span>
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                                                        Sí
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                            {oferta.notas && (
                                                                <div>
                                                                    <span className="text-xs text-gray-500 block">Notas</span>
                                                                    <span className="text-xs text-gray-700 italic">
                                                                        {oferta.notas}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Datos de cuenta si aplica transferencia */}
                                                    {oferta.pago_transferencia && oferta.datos_cuenta && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                            <span className="text-xs font-semibold text-gray-500 block mb-2">DATOS DE CUENTA PARA TRANSFERENCIA</span>
                                                            <div className="bg-blue-50 rounded p-3 border border-blue-200">
                                                                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                                                    {oferta.datos_cuenta}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
