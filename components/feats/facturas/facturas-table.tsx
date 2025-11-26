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
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Edit, Trash2, Eye } from "lucide-react"
import { EstadoBadge } from "./estado-badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Factura } from "@/lib/types/feats/facturas/factura-types"
import { ClienteDetallesDialog } from "@/components/feats/customer/cliente-detalles-dialog"
import type { Cliente } from "@/lib/api-types"
import { useAuth } from "@/contexts/auth-context"
import { apiRequest } from "@/lib/api-config"
import { PlusCircle } from "lucide-react"

interface FacturasTableProps {
    facturas: Factura[]
    loading?: boolean
    onEdit: (factura: Factura) => void
    onDelete: (id: string) => void
    onViewDetails: (factura: Factura) => void
    onAddVale?: (factura: Factura) => void
}

export function FacturasTable({
    facturas,
    loading,
    onEdit,
    onDelete,
    onViewDetails,
    onAddVale,
}: FacturasTableProps) {
    const [clienteDialogOpen, setClienteDialogOpen] = useState(false)
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
    const [loadingCliente, setLoadingCliente] = useState(false)
    const { token } = useAuth()

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    const handleClienteClick = async (clienteId: string | undefined) => {
        if (!clienteId || !token) return

        setLoadingCliente(true)
        try {
            const data = await apiRequest<Cliente>(`/clientes/${clienteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setSelectedCliente(data)
            setClienteDialogOpen(true)
        } catch (error) {
            console.error('Error cargando cliente:', error)
        } finally {
            setLoadingCliente(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (facturas.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12">
                        <p className="text-gray-500">No se encontraron facturas</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Número</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {facturas.map((factura) => (
                                    <TableRow key={factura.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{factura.numero_factura}</TableCell>
                                        <TableCell>
                                            {factura.cliente_id ? (
                                                <button
                                                    onClick={() => handleClienteClick(factura.cliente_id)}
                                                    className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
                                                    disabled={loadingCliente}
                                                >
                                                    {factura.nombre_cliente || 'Cliente'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-600">{factura.nombre_cliente || 'N/A'}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {factura.fecha_creacion
                                                ? format(new Date(factura.fecha_creacion), "dd MMM yyyy", { locale: es })
                                                : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(factura.total || 0)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <EstadoBadge pagada={factura.pagada} terminada={factura.terminada} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                {onAddVale && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onAddVale(factura)}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        <span className="sr-only">Agregar vale</span>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onViewDetails(factura)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onEdit(factura)}
                                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onDelete(factura.id!)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de detalles del cliente */}
            <ClienteDetallesDialog
                open={clienteDialogOpen}
                onOpenChange={setClienteDialogOpen}
                cliente={selectedCliente}
            />
        </>
    )
}
