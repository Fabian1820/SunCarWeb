"use client"

import { Button } from "@/components/shared/atom/button"
import { RefreshCw } from "lucide-react"

interface KpiMonthSelectorProps {
    año: number
    mes: number
    onChangeAño: (año: number) => void
    onChangeMes: (mes: number) => void
    onConsultar: () => void
    loading?: boolean
}

const MESES = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
]

export function KpiMonthSelector({
    año,
    mes,
    onChangeAño,
    onChangeMes,
    onConsultar,
    loading,
}: KpiMonthSelectorProps) {
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Mes */}
            <div className="flex-1 sm:flex-initial">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    Mes
                </label>
                <select
                    value={mes}
                    onChange={(e) => onChangeMes(Number(e.target.value))}
                    className="w-full sm:w-36 h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
                    disabled={loading}
                >
                    {MESES.map((m) => (
                        <option key={m.value} value={m.value}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Año */}
            <div className="flex-1 sm:flex-initial">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    Año
                </label>
                <select
                    value={año}
                    onChange={(e) => onChangeAño(Number(e.target.value))}
                    className="w-full sm:w-24 h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
                    disabled={loading}
                >
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            {/* Botón Consultar */}
            <div className="flex items-end">
                <Button
                    onClick={onConsultar}
                    disabled={loading}
                    size="sm"
                    className="h-9 px-4 bg-orange-600 hover:bg-orange-700 text-white"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Consultar
                </Button>
            </div>
        </div>
    )
}
