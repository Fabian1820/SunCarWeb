"use client"

import { Button } from "@/components/shared/atom/button"
import { BarChart3, RefreshCw } from "lucide-react"
import { CardTitle, CardDescription } from "@/components/shared/molecule/card"

interface TimelinePeriodSelectorProps {
    cantidadMeses: number
    onChangeCantidadMeses: (cantidad: number) => void
    onConsultar: () => void
    loading?: boolean
}

const OPCIONES_PERIODO = [
    { value: 3, label: "3 meses" },
    { value: 6, label: "6 meses" },
    { value: 9, label: "9 meses" },
    { value: 12, label: "1 año" },
    { value: 24, label: "2 años" },
]

export function TimelinePeriodSelector({
    cantidadMeses,
    onChangeCantidadMeses,
    onConsultar,
    loading,
}: TimelinePeriodSelectorProps) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Título de la sección */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                    <CardTitle className="text-lg">Evolución Histórica</CardTitle>
                    <CardDescription>Tendencias a lo largo del tiempo</CardDescription>
                </div>
            </div>

            {/* Selector de período */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Período rápido - Botones (visible en desktop) */}
                <div className="hidden lg:flex items-center bg-gray-100 p-1 rounded-lg">
                    {OPCIONES_PERIODO.map((opcion) => (
                        <button
                            key={opcion.value}
                            onClick={() => onChangeCantidadMeses(opcion.value)}
                            disabled={loading}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${cantidadMeses === opcion.value
                                    ? 'bg-white text-orange-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {opcion.label}
                        </button>
                    ))}
                </div>

                {/* Selector dropdown (visible en mobile/tablet) */}
                <div className="lg:hidden flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Período
                    </label>
                    <select
                        value={cantidadMeses}
                        onChange={(e) => onChangeCantidadMeses(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
                        disabled={loading}
                    >
                        {OPCIONES_PERIODO.map((opcion) => (
                            <option key={opcion.value} value={opcion.value}>
                                Últimos {opcion.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Botón Aplicar */}
                <Button
                    onClick={onConsultar}
                    disabled={loading}
                    className="h-9 bg-orange-600 hover:bg-orange-700 text-white"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Aplicar
                </Button>
            </div>
        </div>
    )
}
