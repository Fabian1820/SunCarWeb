"use client"

import type { CargosResumen } from "@/lib/recursos-humanos-types"
import { Users, Briefcase } from "lucide-react"

interface CargosResumenTableProps {
  cargos: CargosResumen[]
}

export function CargosResumenTable({ cargos }: CargosResumenTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Cargo
              </div>
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Cantidad
              </div>
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">Total Salario Fijo</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">Total % Estímulo Fijo</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">Total % Estímulo Variable</th>
          </tr>
        </thead>
        <tbody>
          {cargos.length > 0 ? (
            cargos.map((cargo, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <span className="font-medium text-gray-900">
                    {cargo.cargo || "No definido"}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {cargo.cantidad_personas} {cargo.cantidad_personas === 1 ? "persona" : "personas"}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-gray-900 font-medium">
                    ${cargo.salario_fijo.toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-gray-900">
                    {cargo.porcentaje_fijo_estimulo.toFixed(1)}%
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-gray-900">
                    {cargo.porcentaje_variable_estimulo.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                No hay datos de cargos disponibles
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="border-t-2 border-gray-200 bg-gray-50">
          <tr>
            <td className="py-3 px-4 font-semibold text-gray-900">
              TOTALES GENERALES
            </td>
            <td className="py-3 px-4 text-center">
              <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                {cargos.reduce((sum, cargo) => sum + cargo.cantidad_personas, 0)} personas
              </span>
            </td>
            <td className="py-3 px-4 text-center">
              <span className="font-bold text-gray-900">
                ${cargos.reduce((sum, cargo) => sum + cargo.salario_fijo, 0).toFixed(2)}
              </span>
            </td>
            <td className="py-3 px-4 text-center">
              <span className="font-bold text-blue-600">
                {cargos.reduce((sum, cargo) => sum + cargo.porcentaje_fijo_estimulo, 0).toFixed(1)}%
              </span>
            </td>
            <td className="py-3 px-4 text-center">
              <span className="font-bold text-purple-600">
                {cargos.reduce((sum, cargo) => sum + cargo.porcentaje_variable_estimulo, 0).toFixed(1)}%
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
