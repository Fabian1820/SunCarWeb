"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { DollarSign, FileText, CheckCircle, XCircle, Clock } from "lucide-react"
import type { FacturaStats } from "@/lib/types/feats/facturas/factura-types"

interface FacturaStatsCardsProps {
    stats: FacturaStats | null
    loading?: boolean
}

export function FacturaStatsCards({ stats, loading }: FacturaStatsCardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-gray-200 rounded w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-gray-200 rounded w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!stats) return null

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    const statsData = [
        {
            title: "Total Facturado",
            value: formatCurrency(stats.total_facturado),
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Total Facturas",
            value: stats.total_facturas.toString(),
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
        {
            title: "Pagadas",
            value: stats.terminadas_pagadas.toString(),
            icon: CheckCircle,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Pendientes de Pago",
            value: stats.terminadas_no_pagadas.toString(),
            icon: XCircle,
            color: "text-red-600",
            bgColor: "bg-red-100",
        },
        {
            title: "No Terminadas",
            value: stats.no_terminadas.toString(),
            icon: Clock,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {statsData.map((stat, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            {stat.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
