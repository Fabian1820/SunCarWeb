"use client"

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
import { Loader2, FileText } from "lucide-react"
import type { OfertaConPagos, Pago } from "@/lib/services/feats/pagos/pago-service"
import { ExportComprobanteService } from "@/lib/services/feats/pagos/export-comprobante-service"

interface TodosPagosPlanosTableProps {
    ofertasConPagos: OfertaConPagos[]
    loading: boolean
}

interface PagoConOferta extends Pago {
    oferta: {
        numero_oferta: string
        nombre_completo: string
        precio_final: number
        monto_pendiente: number
    }
    contacto: {
        nombre: string | null
        telefono: string | null
        carnet: string | null
        codigo: string | null
        tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar' | null
        direccion: string | null
    }
    pendienteDespuesPago?: number
}

export function TodosPagosPlanosTable({ ofertasConPagos, loading }: TodosPagosPlanosTableProps) {
    // Aplanar todos los pagos de todas las ofertas
    const todosPagos: PagoConOferta[] = ofertasConPagos.flatMap(oferta => 
        oferta.pagos.map(pago => ({
            ...pago,
            oferta: {
                numero_oferta: oferta.numero_oferta,
                nombre_completo: oferta.nombre_completo,
                precio_final: oferta.precio_final,
                monto_pendiente: oferta.monto_pendiente
            },
            contacto: {
                ...oferta.contacto,
                direccion: oferta.contacto.direccion || null
            }
        }))
    )

    // Ordenar por fecha más reciente primero
    const pagosOrdenados = [...todosPagos].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )
    
    // Calcular el pendiente después de cada pago
    const pagosConPendiente = pagosOrdenados.map(pago => {
        // Encontrar la oferta original
        const ofertaOriginal = ofertasConPagos.find(o => o.numero_oferta === pago.oferta.numero_oferta)
        if (!ofertaOriginal) return { ...pago, pendienteDespuesPago: 0 }
        
        // Ordenar los pagos de la oferta por fecha
        const pagosOfertaOrdenados = [...ofertaOriginal.pagos].sort((a, b) => 
            new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        )
        
        // Encontrar el índice de este pago
        const indicePago = pagosOfertaOrdenados.findIndex(p => p.id === pago.id)
        
        // Calcular total pagado hasta este pago (inclusive)
        const totalPagadoHastaAqui = pagosOfertaOrdenados
            .slice(0, indicePago + 1)
            .reduce((sum, p) => sum + p.monto_usd, 0)
        
        // Calcular pendiente después de este pago
        const pendienteDespuesPago = ofertaOriginal.precio_final - totalPagadoHastaAqui
        
        return { ...pago, pendienteDespuesPago }
    })

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
            day: 'numeric'
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

    const handleExportarComprobante = (pago: PagoConOferta) => {
        console.log('Datos del contacto (planos):', pago.contacto)
        console.log('Carnet del contacto (planos):', pago.contacto.carnet)
        console.log('Pago completo (planos):', pago)
        
        ExportComprobanteService.generarComprobantePDF({
            pago: pago,
            oferta: {
                numero_oferta: pago.oferta.numero_oferta,
                nombre_completo: pago.oferta.nombre_completo,
                precio_final: pago.oferta.precio_final
            },
            contacto: {
                nombre: pago.contacto.nombre || 'No especificado',
                carnet: pago.contacto.carnet || undefined,
                telefono: pago.contacto.telefono || undefined,
                direccion: pago.contacto.direccion || undefined
            }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        )
    }

    if (pagosOrdenados.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No hay cobros registrados</p>
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="w-[100px]">Fecha</TableHead>
                        <TableHead className="w-[130px]">N° Oferta</TableHead>
                        <TableHead>Oferta</TableHead>
                        <TableHead className="text-right w-[90px]">Monto Cobrado</TableHead>
                        <TableHead className="text-right w-[90px]">Pendiente</TableHead>
                        <TableHead className="w-[120px]">Tipo/Método</TableHead>
                        <TableHead className="w-[130px]">Cliente/Pagador</TableHead>
                        <TableHead className="w-[70px]">Recibido</TableHead>
                        <TableHead className="w-[80px] text-center">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pagosConPendiente.map((pago) => (
                        <TableRow key={pago.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-xs py-3">
                                {pago.id.slice(-8)}
                            </TableCell>
                            <TableCell className="text-sm py-3 whitespace-nowrap">
                                {formatDate(pago.fecha)}
                            </TableCell>
                            <TableCell className="font-medium text-sm py-3">
                                {pago.oferta.numero_oferta}
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="text-sm text-gray-700">
                                    {pago.oferta.nombre_completo}
                                </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                                {pago.moneda !== 'USD' ? (
                                    <div className="text-sm">
                                        <div className="text-gray-600">
                                            {formatCurrency(pago.monto)} {pago.moneda}
                                        </div>
                                        <div className="font-semibold text-green-700">
                                            {formatCurrency(pago.monto_usd)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="font-semibold text-sm text-green-700">
                                        {formatCurrency(pago.monto_usd)}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right py-3">
                                <div className="font-semibold text-sm text-orange-700">
                                    {formatCurrency(pago.pendienteDespuesPago ?? 0)}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {getTipoPagoBadge(pago.tipo_pago)}
                                        {getMetodoPagoBadge(pago.metodo_pago)}
                                    </div>
                                    {pago.metodo_pago === 'efectivo' && pago.desglose_billetes && Object.keys(pago.desglose_billetes).length > 0 && (
                                        <details className="text-xs text-gray-600">
                                            <summary className="cursor-pointer text-blue-600 hover:underline">
                                                Ver desglose
                                            </summary>
                                            <div className="mt-1.5 space-y-1 bg-gray-50 rounded p-2 border border-gray-200">
                                                {Object.entries(pago.desglose_billetes)
                                                    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                                                    .map(([denominacion, cantidad]) => (
                                                        <div key={denominacion} className="flex justify-between text-xs">
                                                            <span>{cantidad}x {denominacion}</span>
                                                            <span className="font-medium">
                                                                {formatCurrency(parseFloat(denominacion) * (cantidad as number))}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-sm">
                                        {pago.nombre_pagador || pago.contacto.nombre || 'No especificado'}
                                    </span>
                                    {!pago.pago_cliente && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 w-fit text-xs">
                                            Tercero
                                        </Badge>
                                    )}
                                    {pago.carnet_pagador && (
                                        <span className="text-xs text-gray-500">
                                            CI: {pago.carnet_pagador}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="text-sm">
                                    {pago.metodo_pago === 'efectivo' && pago.recibido_por && (
                                        <span className="text-gray-700">{pago.recibido_por}</span>
                                    )}
                                    {(pago.metodo_pago === 'transferencia_bancaria' || pago.metodo_pago === 'stripe') && pago.comprobante_transferencia && (
                                        <a
                                            href={pago.comprobante_transferencia}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            Ver
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    )}
                                    {!pago.recibido_por && !pago.comprobante_transferencia && '-'}
                                </div>
                            </TableCell>
                            <TableCell className="text-center py-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportarComprobante(pago)}
                                    className="h-8 w-8 p-0"
                                    title="Exportar comprobante"
                                >
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
