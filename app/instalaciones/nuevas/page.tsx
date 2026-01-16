"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { InstalacionesService } from "@/lib/services/feats/instalaciones/instalaciones-service"
import type { InstalacionNueva } from "@/lib/types/feats/instalaciones/instalaciones-types"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { InstalacionesNuevasTable } from "@/components/feats/instalaciones/instalaciones-nuevas-table"

export default function InstalacionesNuevasPage() {
  const [instalaciones, setInstalaciones] = useState<InstalacionNueva[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { toast } = useToast()
  
  // Estado para capturar los filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    tipo: "todos" as "todos" | "leads" | "clientes",
    fechaDesde: "",
    fechaHasta: "",
  })

  // Cargar leads y clientes pendientes de instalación desde el endpoint unificado
  const fetchInstalaciones = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔄 Intentando cargar pendientes de instalación...')
      
      // Obtener pendientes de instalación desde el endpoint del backend
      const data = await InstalacionesService.getPendientesInstalacion()
      
      console.log('✅ Datos recibidos del backend:', data)

      // Convertir leads a formato unificado
      const leadsUnificados: InstalacionNueva[] = (data.leads || []).map((lead) => ({
        tipo: 'lead' as const,
        id: lead.id,
        nombre: lead.nombre,
        telefono: lead.telefono,
        direccion: lead.direccion || 'No especificada',
        ofertas: lead.ofertas || [],
        estado: lead.estado,
        fecha_contacto: lead.fecha_contacto,
        original: lead
      }))

      // Convertir clientes a formato unificado
      const clientesUnificados: InstalacionNueva[] = (data.clientes || []).map((cliente) => ({
        tipo: 'cliente' as const,
        id: cliente.id,
        numero: cliente.numero,
        nombre: cliente.nombre,
        telefono: cliente.telefono || 'No especificado',
        direccion: cliente.direccion,
        ofertas: cliente.ofertas || [],
        estado: cliente.estado || 'Pendiente de Instalación',
        fecha_contacto: cliente.fecha_contacto || undefined,
        falta_instalacion: cliente.falta_instalacion || undefined,
        original: cliente
      }))

      // Combinar y ordenar por fecha (más recientes primero)
      const todasInstalaciones = [...leadsUnificados, ...clientesUnificados].sort((a, b) => {
        const fechaA = a.fecha_contacto ? new Date(a.fecha_contacto).getTime() : 0
        const fechaB = b.fecha_contacto ? new Date(b.fecha_contacto).getTime() : 0
        return fechaB - fechaA
      })

      console.log(`✅ Total instalaciones procesadas: ${todasInstalaciones.length}`)
      setInstalaciones(todasInstalaciones)
      
      if (todasInstalaciones.length > 0) {
        toast({
          title: "Datos cargados",
          description: `${data.total_leads || 0} leads y ${data.total_clientes || 0} clientes pendientes`,
        })
      }
    } catch (error: unknown) {
      console.error('❌ Error cargando instalaciones desde endpoint unificado:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Mensaje de error:', errorMessage)
      
      // Si el endpoint no existe (404), mostrar mensaje específico
      if (errorMessage.includes('404')) {
        toast({
          title: "Endpoint no disponible",
          description: "El endpoint /api/pendientes-instalacion/ no está implementado en el backend. Por favor, implementa el endpoint según la documentación.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al cargar datos",
          description: `Error: ${errorMessage}`,
          variant: "destructive",
        })
      }
      
      setInstalaciones([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setInitialLoading(true)
    try {
      await fetchInstalaciones()
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
  const buildSearchText = (instalacion: InstalacionNueva) => {
    const parts: string[] = []
    parts.push(instalacion.nombre)
    parts.push(instalacion.telefono)
    parts.push(instalacion.direccion)
    parts.push(instalacion.estado)
    if (instalacion.numero) parts.push(instalacion.numero)
    return parts.join(" ").toLowerCase()
  }

  // Instalaciones filtradas
  const filteredInstalaciones = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase()
    const fechaDesde = parseDateValue(appliedFilters.fechaDesde)
    const fechaHasta = parseDateValue(appliedFilters.fechaHasta)

    if (fechaDesde) fechaDesde.setHours(0, 0, 0, 0)
    if (fechaHasta) fechaHasta.setHours(23, 59, 59, 999)

    return instalaciones.filter((instalacion) => {
      // Filtro por tipo
      if (appliedFilters.tipo !== 'todos') {
        if (appliedFilters.tipo === 'leads' && instalacion.tipo !== 'lead') return false
        if (appliedFilters.tipo === 'clientes' && instalacion.tipo !== 'cliente') return false
      }

      // Filtro por búsqueda
      if (search) {
        const text = buildSearchText(instalacion)
        if (!text.includes(search)) {
          return false
        }
      }

      // Filtro por fecha
      if (fechaDesde || fechaHasta) {
        const fecha = parseDateValue(instalacion.fecha_contacto)
        if (!fecha) return false
        if (fechaDesde && fecha < fechaDesde) return false
        if (fechaHasta && fecha > fechaHasta) return false
      }

      return true
    })
  }, [instalaciones, appliedFilters])

  // Mostrar loader mientras se cargan los datos iniciales
  if (initialLoading) {
    return <PageLoader moduleName="Instalaciones Nuevas" text="Cargando instalaciones..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Instalaciones Nuevas"
        subtitle="Leads y clientes pendientes de instalación"
        badge={{ text: "Nuevas", className: "bg-green-100 text-green-800" }}
        backHref="/instalaciones"
        backLabel="Volver a Instalaciones"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <InstalacionesNuevasTable
          instalaciones={filteredInstalaciones}
          loading={loading}
          onFiltersChange={setAppliedFilters}
          onRefresh={fetchInstalaciones}
        />
      </main>
      <Toaster />
    </div>
  )
}
