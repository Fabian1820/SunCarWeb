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
import { Loader2 } from "lucide-react"
import type { PagoConDetalles } from "@/lib/services/feats/pagos/pago-service"

interface TodosPagosTableProps {
    pagos: PagoConDetalles[]
    loading: boolean
}

export function TodosPagosTable({ pagos, loading }: TodosPagosTableProps) {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        )
    }

    if (pagos.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No hay pagos registrados</p>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[110px]">N° Oferta</TableHead>
                        <TableHead className="w-[160px]">Cliente</TableHead>
                        <TableHead className="w-[100px]">CI</TableHead>
                        <TableHead className="text-right w-[110px]">Monto</TableHead>
                        <TableHead className="w-[100px]">Fecha</TableHead>
                        <TableHead className="w-[100px]">Tipo</TableHead>
                        <TableHead className="w-[120px]">Método</TableHead>
                        <TableHead className="w-[140px]">Recibido/Ref</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pagos.map((pago) => (
                        <TableRow key={pago.id} className="align-top">
                            <TableCell className="font-medium text-sm py-3">
                                <div className="break-words">
                                    {pago.oferta.numero_oferta}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="flex flex-col max-w-[160px] gap-0.5">
                                    <span className="font-medium text-sm break-words">
                                        {pago.contacto.nombre}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {pago.contacto.codigo}
                                    </span>
                                    {pago.contacto.telefono && (
                                        <span className="text-xs text-gray-600 break-words">
                                            {pago.contacto.telefono}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <span className="text-sm break-words">
                                    {pago.contacto.carnet || '-'}
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-sm py-3">
                                <div className="break-words">
                                    {formatCurrency(pago.monto)}
                                </div>
                            </TableCell>
                            <TableCell className="py-3">
                                <span className="text-sm">{formatDate(pago.fecha)}</span>
                            </TableCell>
                            <TableCell className="py-3">
                                {getTipoPagoBadge(pago.tipo_pago)}
                            </TableCell>
                            <TableCell className="py-3">
                                {getMetodoPagoBadge(pago.metodo_pago)}
                            </TableCell>
                            <TableCell className="py-3">
                                <div className="text-sm break-words max-w-[140px]">
                                    {pago.metodo_pago === 'efectivo' && pago.recibido_por && (
                                        <span className="text-gray-700">{pago.recibido_por}</span>
                                    )}
                                    {(pago.metodo_pago === 'transferencia_bancaria' || pago.metodo_pago === 'stripe') && pago.comprobante_transferencia && (
                                        <a
                                            href={pago.comprobante_transferencia}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            Ver comprobante
                                        </a>
                                    )}
                                    {!pago.recibido_por && !pago.comprobante_transferencia && '-'}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
