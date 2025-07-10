"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import {Eye, FileText, Calendar, MapPin, Users, FileCheck, Wrench, Zap, Sun} from "lucide-react"
import type { FormData } from "@/lib/types"

interface ReportsTableProps<T = any> {
  data: T[]
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[]
  actions?: (row: T) => React.ReactNode
  getRowId?: (row: T, idx: number) => string | number
  loading?: boolean
}

export function ReportsTable<T = any>({ data, columns, actions, getRowId, loading }: ReportsTableProps<T>) {
  const getServiceTypeLabel = (value: string) => {
    const types = {
      inversion: "Inversión",
      mantenimiento: "Mantenimiento",
      averia: "Avería",
    }
    return types[value as keyof typeof types] || value
  }

  const getServiceTypeBadgeColor = (value: string) => {
    const colors = {
      inversion: "bg-blue-100 text-blue-800 border-blue-200",
      mantenimiento: "bg-yellow-100 text-yellow-800 border-yellow-200",
      averia: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[value as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getServiceTypeIcon = (value: string) => {
    switch (value) {
      case "inversion":
        return <Sun className="h-5 w-5 text-blue-500 inline-block mr-1" />;
      case "mantenimiento":
        return <Wrench className="h-5 w-5 text-yellow-600 inline-block mr-1" />;
      case "averia":
        return <Zap className="h-5 w-5 text-red-500 inline-block mr-1" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-orange-600 font-medium">Cargando reportes...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron resultados</h3>
        <p className="text-gray-600">No hay datos que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-separate border-spacing-y-2">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-4 px-6 font-semibold text-gray-900 bg-orange-50 rounded-t-lg">{col.label}</th>
            ))}
            {actions && <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={getRowId ? getRowId(row, idx) : idx} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="py-4 px-6 bg-white rounded-lg shadow-sm">
                  {col.key === "tipo_reporte" ? (
                    <span className="flex items-center gap-2 font-semibold">
                      {getServiceTypeIcon((row as any)[col.key])}
                      {getServiceTypeLabel((row as any)[col.key])}
                    </span>
                  ) : (
                    col.render ? col.render(row) : (row as any)[col.key]
                  )}
                </td>
              ))}
              {actions && <td className="py-4 px-4">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
