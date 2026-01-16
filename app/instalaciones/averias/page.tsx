"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ClienteService } from "@/lib/api-services"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { AveriasTable } from "@/components/feats/instalaciones/averias-table"
import type { Cliente } from "@/lib/api-types"

export default function AveriasPage() {
  const [clients, setClients] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { toast } = useToast()
  
  // Estado para capturar los filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    fechaDesde: "",
    fechaHasta: "",
    estadoAveria: "pendientes" as "todas" | "pendientes" | "solucionadas",
  })

  // Cargar clientes con averías
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const clientsWithAverias = await ClienteService.getClientesConAverias()
      setClients(clientsWithAverias)
    } catch (error: unknown) {
      console.error('Error cargando clientes con averías:', error)
      setClients([])
      toast({
        title: "Error",
        description: "No se pudieron cargar las averías",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true)
    try {
      await fetchClients()
    } catch (error: unknown) {
      console.error('Error cargando datos iniciales:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
    // eslint-disable-next-line
  }, [])

  // Función para parsear fechas
  const parseDateValue = (value?: string) => {
    if (!value) return null
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/").map(Number)
      const parsed = new Date(year, month - 1, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // Función para construir texto de búsqueda
  const buildSearchText = (client: Cliente) => {
    const parts: string[] = []
    const visited = new WeakSet<object>()

    const addValue = (value: unknown) => {
      if (value === null || value === undefined) return
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        parts.push(String(value))
        return
      }
      if (value instanceof Date) {
        parts.push(value.toISOString())
        return
      }
      if (Array.isArray(value)) {
        value.forEach(addValue)
        return
      }
      if (typeof value === "object") {
        if (visited.has(value)) return
        visited.add(value)
        Object.values(value as Record<string, unknown>).forEach(addValue)
      }
    }

    addValue(client)
    return parts.join(" ").toLowerCase()
  }

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase()
    const fechaDesde = parseDateValue(appliedFilters.fechaDesde)
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta)
    const estadoAveria = appliedFilters.estadoAveria

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0)
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999)

    const filtered = clients.filter((client) => {
      // Filtrar según el estado de averías seleccionado
      if (estadoAveria === 'pendientes') {
        const tieneAveriasPendientes = client.averias?.some(a => a.estado === 'Pendiente')
        if (!tieneAveriasPendientes) return false
      } else if (estadoAveria === 'solucionadas') {
        const tieneAveriasSolucionadas = client.averias?.some(a => a.estado === 'Solucionada')
        if (!tieneAveriasSolucionadas) return false
      }
      // Si es 'todas', no filtramos por estado

      if (search) {
        const text = buildSearchText(client)
        if (!text.includes(search)) {
          return false
        }
      }

      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(client.fecha_contacto)
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
      }

      return true
    })

    // Ordenar por número de cliente (descendente)
    return filtered.sort((a, b) => {
      const getLastThreeDigits = (numero: string) => {
        const digits = numero.match(/\d+/g)?.join('') || '0'
        return parseInt(digits.slice(-3)) || 0
      }

      const aNum = getLastThreeDigits(a.numero)
      const bNum = getLastThreeDigits(b.numero)

      return bNum - aNum
    })
  }, [clients, appliedFilters])

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return <PageLoader moduleName="Averías" text="Cargando averías..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Averías"
        subtitle="Reportes de averías y mantenimiento"
        badge={{ text: "Averías", className: "bg-red-100 text-red-800" }}
        backHref="/instalaciones"
        backLabel="Volver a Instalaciones"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <AveriasTable
          clients={filteredClients}
          loading={loading}
          onFiltersChange={setAppliedFilters}
          onRefresh={fetchClients}
        />
      </main>
      <Toaster />
    </div>
  )
}
