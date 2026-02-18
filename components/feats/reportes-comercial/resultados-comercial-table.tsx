"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/atom/input"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Search, RefreshCw, DollarSign, TrendingUp, Lock } from "lucide-react"
import type { ResultadoComercial, EstadisticaComercial } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"
import { useAuth } from "@/contexts/auth-context"

interface ResultadosComercialTableProps {
  resultados: ResultadoComercial[]
  loading: boolean
  onRefresh: () => void
}

export function ResultadosComercialTable({
  resultados,
  loading,
  onRefresh,
}: ResultadosComercialTableProps) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [comercialFilter, setComercialFilter] = useState<string>("todos")
  const [mesFilter, setMesFilter] = useState<string>("todos")
  const [anioFilter, setAnioFilter] = useState<string>("todos")

  // Usuarios con restricciones (solo ven su propio monto)
  const RESTRICTED_USERS = [
    "Gretel María Mojena Almenares",
    "Ariagna Carballo Gil",
    "Dashel Pinillos Zubiaur"
  ]
  
  const isRestrictedUser = RESTRICTED_USERS.includes(user?.nombre || "")

  // Función para verificar si el usuario puede ver el monto de una tarjeta
  const canViewAmount = (comercial: string) => {
    // Si no es usuario restringido, puede ver todo
    if (!isRestrictedUser) return true
    // Si es usuario restringido, solo ve su propio monto
    return user?.nombre === comercial
  }

  // Obtener lista única de comerciales
  const comerciales = useMemo(() => {
    const uniqueComerciales = new Set(
      resultados
        .map(r => r.contacto.comercial)
        .filter(c => c !== null && c !== undefined)
    )
    return Array.from(uniqueComerciales).sort()
  }, [resultados])

  // Obtener años disponibles
  const anios = useMemo(() => {
    const uniqueAnios = new Set(
      resultados
        .filter(r => r.fecha_primer_pago)
        .map(r => new Date(r.fecha_primer_pago!).getFullYear().toString())
    )
    return Array.from(uniqueAnios).sort().reverse()
  }, [resultados])

  // Filtrar resultados
  const filteredResultados = useMemo(() => {
    return resultados.filter(resultado => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const comercial = resultado.contacto.comercial || ''
        const matchesSearch = 
          resultado.numero_oferta.toLowerCase().includes(search) ||
          resultado.nombre_completo.toLowerCase().includes(search) ||
          (resultado.contacto.nombre?.toLowerCase().includes(search) || false) ||
          comercial.toLowerCase().includes(search)
        
        if (!matchesSearch) return false
      }

      // Filtro de comercial
      if (comercialFilter !== "todos" && resultado.contacto.comercial !== comercialFilter) {
        return false
      }

      // Filtro de mes y año
      if (resultado.fecha_primer_pago) {
        const fechaPago = new Date(resultado.fecha_primer_pago)
        const mes = (fechaPago.getMonth() + 1).toString()
        const anio = fechaPago.getFullYear().toString()

        if (mesFilter !== "todos" && mes !== mesFilter) {
          return false
        }

        if (anioFilter !== "todos" && anio !== anioFilter) {
          return false
        }
      }

      return true
    })
  }, [resultados, searchTerm, comercialFilter, mesFilter, anioFilter])

  // Calcular estadísticas por comercial
  const estadisticas = useMemo(() => {
    const stats = new Map<string, EstadisticaComercial>()

    filteredResultados.forEach(resultado => {
      const comercial = resultado.contacto.comercial || "Sin asignar"
      
      if (!stats.has(comercial)) {
        stats.set(comercial, {
          comercial,
          ofertas_cerradas: 0,
          total_margen: 0,
        })
      }

      const stat = stats.get(comercial)!
      stat.ofertas_cerradas += 1
      stat.total_margen += resultado.margen_dolares
    })

    return Array.from(stats.values()).sort((a, b) => b.total_margen - a.total_margen)
  }, [filteredResultados])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
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

  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas por comercial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {estadisticas.map((stat) => {
          const showAmount = canViewAmount(stat.comercial)
          
          return (
            <Card key={stat.comercial} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.comercial}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Ofertas Cerradas</span>
                  <Badge variant="secondary" className="font-semibold">
                    {stat.ofertas_cerradas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Margen Total</span>
                  {showAmount ? (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(stat.total_margen)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        Restringido
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filtros y tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Resultados por Comercial</CardTitle>
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por oferta, cliente o comercial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={comercialFilter} onValueChange={setComercialFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Comercial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los comerciales</SelectItem>
                {comerciales.map((comercial) => (
                  <SelectItem key={comercial} value={comercial}>
                    {comercial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={mesFilter} onValueChange={setMesFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {meses.map((mes) => (
                  <SelectItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={anioFilter} onValueChange={setAnioFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los años</SelectItem>
                {anios.map((anio) => (
                  <SelectItem key={anio} value={anio}>
                    {anio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Oferta</TableHead>
                  <TableHead className="text-right">Total Materiales</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Precio Final</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Cargando resultados...
                    </TableCell>
                  </TableRow>
                ) : filteredResultados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResultados.map((resultado) => {
                    const comercial = resultado.contacto.comercial || "Sin asignar"
                    
                    return (
                      <TableRow key={resultado.id}>
                        <TableCell className="font-medium">
                          {comercial}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {resultado.numero_oferta}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {resultado.nombre_completo}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(resultado.total_materiales)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-medium text-green-600">
                              {resultado.margen_porcentaje.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(resultado.margen_dolares)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(resultado.precio_final)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {resultado.contacto.nombre}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {resultado.contacto.tipo}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {formatCurrency(resultado.total_pagado)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(resultado.fecha_primer_pago)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={resultado.monto_pendiente > 0 ? "destructive" : "secondary"}
                            className="font-medium"
                          >
                            {formatCurrency(resultado.monto_pendiente)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumen */}
          {!loading && filteredResultados.length > 0 && (
            <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {filteredResultados.length} de {resultados.length} ofertas
              </span>
              <div className="flex gap-6">
                <span className="font-medium">
                  Total Margen: {formatCurrency(
                    filteredResultados.reduce((sum, r) => sum + r.margen_dolares, 0)
                  )}
                </span>
                <span className="font-medium">
                  Total Pagado: {formatCurrency(
                    filteredResultados.reduce((sum, r) => sum + r.total_pagado, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
