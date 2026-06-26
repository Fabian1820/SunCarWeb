"use client"

import { Clock, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent } from "@/components/shared/molecule/card"
import type { TrabajadorEnOficina } from "@/lib/types/asistencia-types"

interface QuienEstaPanelProps {
  presentes: TrabajadorEnOficina[]
  total: number
  loading: boolean
  onRefresh: () => void
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function QuienEstaPanel({ presentes, total, loading, onRefresh }: QuienEstaPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            {total} {total === 1 ? "persona" : "personas"} en la oficina
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {presentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nadie en la oficina en este momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presentes.map((t) => (
            <Card key={t.trabajador_ci} className="border border-green-100 bg-green-50/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-semibold">
                  {iniciales(t.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.nombre}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>Entró {t.hora_entrada}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-0.5">{t.tiempo_en_oficina}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
