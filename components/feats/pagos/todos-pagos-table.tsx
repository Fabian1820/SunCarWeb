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
import { Loader2, ChevronDown, ChevronRight, FileText } from "lucide-react"
import type { OfertaConPagos } from "@/lib/services/feats/pagos/pago-service"
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service"

interface TodosPagosTableProps {
    ofertasConPagos: OfertaConPagos[]
    loading: boolean
}

export function TodosPagosTable({ ofertasConPagos, loading }: TodosPagosTableProps) {
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

    const getTipoPagoBadge = (tipo: string) => {
        return tipo === 'anticipo' ? (
            <Badge variant="default" className="bg-blue-100 text-blue-700">
                Anticipo
            </Badge>
        ) : (
            <Badge variant="default" className="bg-purple-100 text-purple-700">
                Pendiente
            </Badge>
        )
    }

    const getMetodoPagoBadge = (metodo: string) => {
        const badges = {
            efectivo: <Badge className="bg-green-100 text-green-700">Efectivo</Badge>,
            transferencia_bancaria: <Badge className="bg-orange-100 text-orange-700">Transferencia</Badge>,
            stripe: <Badge className="bg-indigo-100 text-indigo-700">Stripe</Badge>,
        }
        return badges[metodo as keyof typeof badges] || <Badge>{metodo}</Badge>
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

    const handleExportarComprobante = (oferta: OfertaConPagos, pago: any) => {
        // Calcular el total pagado antes de este pago sumando los monto_usd de pagos con fecha anterior
        const fechaPagoActual = new Date(pago.fecha).getTime()
        const totalPagadoAnteriormente = oferta.pagos
            .filter(p => new Date(p.fecha).getTime() < fechaPagoActual)
            .reduce((sum, p) => sum + p.monto_usd, 0)
        
        ExportComprobanteService.generarComprobantePDF({
            pago: pago,
            oferta: {
                numero_oferta: oferta.numero_oferta,
                nombre_completo: oferta.nombre_completo,
                precio_final: oferta.precio_final
            },
            contacto: {
                nombre: oferta.contacto.nombre || 'No especificado',
                carnet: oferta.contacto.carnet ?? undefined,
                telefono: oferta.contacto.telefono ?? undefined,
                direccion: oferta.contacto.direccion ?? undefined
            },
            total_pagado_anteriormente: totalPagadoAnteriormente > 0 ? totalPagadoAnteriormente : undefined
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        )
    }

    if (ofertasConPagos.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No hay cobros registrados</p>
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
                        <TableHead className="w-[160px]">Cliente</TableHead>
                        <TableHead className="w-[100px]">CI</TableHead>
                        <TableHead className="text-right w-[110px]">Precio Final</TableHead>
                        <TableHead className="text-right w-[110px]">Total Cobrado</TableHead>
                        <TableHead className="text-right w-[110px]">Pendiente</TableHead>
                        <TableHead className="w-[80px] text-center">Cobros</TableHead>
                        <TableHead className="w-[140px]">Almacén</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ofertasConPagos.map((oferta) => {
                        const isExpanded = expandedOfertas.has(oferta.oferta_id)
                        return (
                            <React.Fragment key={oferta.oferta_id}>
                                {/* Fila principal de la oferta */}
                                <TableRow 
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => toggleOferta(oferta.oferta_id)}
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
                                        <div className="flex flex-col max-w-[160px] gap-0.5">
                                            <span className="font-medium text-sm break-words">
                                                {oferta.contacto.nombre || 'Sin contacto'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {oferta.contacto.codigo || '-'}
                                            </span>
                                            {oferta.contacto.telefono && (
                                                <span className="text-xs text-gray-600 break-words">
                                                    {oferta.contacto.telefono}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-sm break-words">
                                            {oferta.contacto.carnet || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm py-3">
                                        <div className="break-words">
                                            {formatCurrency(oferta.precio_final)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm py-3">
                                        <div className="break-words text-green-700">
                                            {formatCurrency(oferta.total_pagado)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-sm py-3">
                                        <div className="break-words text-orange-700">
                                            {formatCurrency(oferta.monto_pendiente)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-3">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                            {oferta.cantidad_pagos}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span className="text-sm break-words">
                                            {oferta.almacen_nombre || '-'}
                                        </span>
                                    </TableCell>
                                </TableRow>

                                {/* Filas expandidas con los pagos */}
                                {isExpanded && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="bg-gray-50 p-0">
                                            <div className="p-4 border-t-2 border-blue-200">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <span className="h-1 w-1 rounded-full bg-blue-600"></span>
                                                    Detalle de Cobros ({oferta.cantidad_pagos})
                                                </h4>
                                                <div className="space-y-3">
                                                    {/* Ordenar pagos por fecha (más antiguos primero) */}
                                                    {[...oferta.pagos]
                                                        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                                                        .map((pago, index) => {
                                                        // Calcular el total pagado hasta este pago (inclusive)
                                                        const pagosOrdenados = [...oferta.pagos].sort((a, b) => 
                                                            new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
                                                        )
                                                        const indicePago = pagosOrdenados.findIndex(p => p.id === pago.id)
                                                        const totalPagadoHastaAqui = pagosOrdenados
                                                            .slice(0, indicePago + 1)
                                                            .reduce((sum, p) => sum + p.monto_usd, 0)
                                                        
                                                        // Calcular el pendiente después de este pago
                                                        const pendienteDespuesPago = oferta.precio_final - totalPagadoHastaAqui
                                                        
                                                        return (
                                                        <div 
                                                            key={pago.id} 
                                                            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                {/* Columna 1: Información del Pago */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-xs font-semibold text-gray-500">COBRO #{index + 1}</span>
                                                                        {getTipoPagoBadge(pago.tipo_pago)}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs text-gray-500 block">Fecha</span>
                                                                        <span className="text-sm font-medium text-gray-900">
                                                                            {formatDate(pago.fecha)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs text-gray-500 block">Monto Cobrado</span>
                                                                        <span className="text-sm font-semibold text-green-700">
                                                                            {formatCurrency(pago.monto)} {pago.moneda}
                                                                        </span>
                                                                        {pago.moneda !== 'USD' && (
                                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                                Tasa: {pago.tasa_cambio} → {formatCurrency(pago.monto_usd)} USD
                                                                            </div>
                                                                        )}
                                                                        {pago.moneda === 'USD' && (
                                                                            <div className="text-xs text-green-600 mt-0.5">
                                                                                = {formatCurrency(pago.monto_usd)} USD
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs text-gray-500 block">Pendiente después</span>
                                                                        <span className="text-sm font-semibold text-orange-700">
                                                                            {formatCurrency(pendienteDespuesPago)} USD
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Columna 2: Método de Pago */}
                                                                <div className="space-y-2">
                                                                    <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-500 block mb-1">MÉTODO</span>
                                                                        {getMetodoPagoBadge(pago.metodo_pago)}
                                                                    </div>
                                                                    {pago.metodo_pago === 'efectivo' && pago.recibido_por && (
                                                                        <div>
                                                                            <span className="text-xs text-gray-500 block">Recibido por</span>
                                                                            <span className="text-sm font-medium text-gray-900">
                                                                                {pago.recibido_por}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {(pago.metodo_pago === 'transferencia_bancaria' || pago.metodo_pago === 'stripe') && pago.comprobante_transferencia && (
                                                                        <div>
                                                                            <span className="text-xs text-gray-500 block">Comprobante</span>
                                                                            <a
                                                                                href={pago.comprobante_transferencia}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                Ver documento
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                                </svg>
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Columna 3: Pagador */}
                                                                <div className="space-y-2">
                                                                    <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-500 block">PAGADOR</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-900 block">
                                                                            {pago.nombre_pagador || oferta.contacto.nombre || 'No especificado'}
                                                                        </span>
                                                                        {!pago.pago_cliente && (
                                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs mt-1">
                                                                                Pago por tercero
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {pago.carnet_pagador && (
                                                                        <div>
                                                                            <span className="text-xs text-gray-500 block">CI</span>
                                                                            <span className="text-sm text-gray-700">
                                                                                {pago.carnet_pagador}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Columna 4: Desglose de Billetes */}
                                                                <div className="space-y-2">
                                                                    {pago.metodo_pago === 'efectivo' && pago.desglose_billetes && Object.keys(pago.desglose_billetes).length > 0 && (
                                                                        <div>
                                                                            <span className="text-xs font-semibold text-gray-500 block mb-2">DESGLOSE DE BILLETES</span>
                                                                            <div className="space-y-1 bg-gray-50 rounded p-2 border border-gray-200">
                                                                                {Object.entries(pago.desglose_billetes)
                                                                                    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                                                                                    .map(([denominacion, cantidad]) => (
                                                                                        <div key={denominacion} className="flex justify-between text-xs">
                                                                                            <span className="text-gray-600">
                                                                                                {cantidad}x {denominacion} {pago.moneda}
                                                                                            </span>
                                                                                            <span className="font-medium text-gray-900">
                                                                                                {formatCurrency(parseFloat(denominacion) * cantidad)}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {pago.notas && (
                                                                        <div>
                                                                            <span className="text-xs text-gray-500 block">Notas</span>
                                                                            <span className="text-xs text-gray-700 italic">
                                                                                {pago.notas}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Botón de exportar comprobante */}
                                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleExportarComprobante(oferta, pago)
                                                                            }}
                                                                            className="w-full"
                                                                        >
                                                                            <FileText className="h-4 w-4 mr-2" />
                                                                            Exportar Comprobante
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        )
                                                    })}
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
