"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Eye, DollarSign, Loader2 } from "lucide-react"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"

interface AnticiposPendientesTableProps {
    ofertas: OfertaConfirmadaSinPago[]
    loading: boolean
    onRegistrarPago?: (oferta: OfertaConfirmadaSinPago) => void
}

export function AnticiposPendientesTable({
    ofertas,
    loading,
    onRegistrarPago,
}: AnticiposPendientesTableProps) {
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
        if (oferta.cliente?.nombre) return oferta.cliente.nombre
        if (oferta.lead?.nombre) return oferta.lead.nombre
        if (oferta.nombre_lead_sin_agregar) return oferta.nombre_lead_sin_agregar
        return 'Sin nombre'
    }

    const getClienteTelefono = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.cliente?.telefono) return oferta.cliente.telefono
        if (oferta.lead?.telefono) return oferta.lead.telefono
        return '-'
    }

    const getClienteDireccion = (oferta: OfertaConfirmadaSinPago) => {
        if (oferta.cliente?.direccion) return oferta.cliente.direccion
        if (oferta.lead?.direccion) return oferta.lead.direccion
        return '-'
    }

    const getClienteCI = (oferta: OfertaConfirmadaSinPago) => {
        // El backend ahora devuelve carnet_identidad en el objeto cliente
        if (oferta.cliente?.carnet_identidad) return oferta.cliente.carnet_identidad
        // Fallback al número de cliente si no tiene carnet
        if (oferta.cliente?.numero) return oferta.cliente.numero
        return '-'
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
                <p className="text-gray-600">No hay anticipos pendientes</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[110px]">N° Oferta</TableHead>
                        <TableHead className="w-[180px]">Nombre Oferta</TableHead>
                        <TableHead className="w-[160px]">Cliente</TableHead>
                        <TableHead className="w-[100px]">CI</TableHead>
                        <TableHead className="w-[160px]">Dirección</TableHead>
                        <TableHead className="text-right w-[110px]">Precio Final</TableHead>
                        <TableHead className="text-right w-[110px]">Pendiente</TableHead>
                        <TableHead className="text-right w-[130px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ofertas.map((oferta) => (
                        <TableRow key={oferta.id} className="align-top">
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
                            <TableCell className="py-3">
                                <div className="max-w-[160px]">
                                    <span className="text-sm block break-words" title={getClienteDireccion(oferta)}>
                                        {getClienteDireccion(oferta)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm py-3">
                                <div className="break-words">
                                    {formatCurrency(oferta.precio_final)}
                                </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                                <div className="break-words">
                                    <span className="font-bold text-red-600 text-sm">
                                        {formatCurrency(oferta.monto_pendiente)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
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
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
