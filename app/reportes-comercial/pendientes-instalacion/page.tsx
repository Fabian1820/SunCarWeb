"use client"

import { useState, useEffect, useCallback } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PendientesInstalacionTable } from "@/components/feats/reportes-comercial/pendientes-instalacion-table"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import type { InstalacionPendiente } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"

interface PendientesInstalacionResponse {
  success: boolean
  message: string
  data: {
    clientes: any[]
    leads: any[]
    total_clientes: number
    total_leads: number
    total_general: number
  }
}

export default function PendientesInstalacionPage() {
  const { toast } = useToast()
  const [instalaciones, setInstalaciones] = useState<InstalacionPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Usar el endpoint específico de pendientes de instalación
      const response = await apiRequest<PendientesInstalacionResponse>(
        '/clientes/pendientes-instalacion'
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar datos')
      }

      const { clientes, leads } = response.data

      console.log('📊 Datos cargados desde endpoint:', {
        totalClientes: clientes.length,
        totalLeads: leads.length,
        totalGeneral: response.data.total_general
      })

      // Debug: Ver estados de clientes
      console.log('🔍 Estados de clientes:', clientes.map((c: any) => ({
        nombre: c.nombre,
        estado: c.estado
      })))

      // Debug: Ver estados de leads
      console.log('🔍 Estados de leads:', leads.map((l: any) => ({
        nombre: l.nombre,
        estado: l.estado
      })))

      // Debug: Ver respuesta completa
      console.log('📦 Respuesta completa del backend:', response.data)

      // Transformar a formato unificado
      const instalacionesData: InstalacionPendiente[] = [
        ...clientes.map((c: any) => ({
          id: c.id || c.numero,
          tipo: 'cliente' as const,
          nombre: c.nombre,
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          provincia: c.provincia_montaje || 'Sin especificar',
          estado: c.estado || '',
          oferta: formatOfertas(c.ofertas || []),
          falta: c.falta_instalacion || '',
          comentario: c.comentario || '',
          fuente: c.fuente || '',
          numero: c.numero,
          fecha_contacto: c.fecha_contacto || ''
        })),
        ...leads.map((l: any) => ({
          id: l.id || '',
          tipo: 'lead' as const,
          nombre: l.nombre,
          telefono: l.telefono,
          direccion: l.direccion || '',
          provincia: l.provincia_montaje || 'Sin especificar',
          estado: l.estado,
          oferta: formatOfertas(l.ofertas || []),
          falta: '',
          comentario: l.comentario || '',
          fuente: l.fuente || '',
          fecha_contacto: l.fecha_contacto
        }))
      ]

      console.log('📦 Datos transformados antes de ordenar:', {
        total: instalacionesData.length,
        porEstado: instalacionesData.reduce((acc: any, item) => {
          acc[item.estado] = (acc[item.estado] || 0) + 1
          return acc
        }, {})
      })

      // Ordenar: primero en proceso, luego pendientes
      // Dentro de cada grupo: La Habana primero, luego otras provincias
      // Finalmente por tipo: Clientes primero, luego Leads
      const sorted = instalacionesData.sort((a, b) => {
        // 1. Primero por estado (En Proceso primero - considerar todas las variantes)
        const aEsProceso = a.estado.toLowerCase().includes('proceso')
        const bEsProceso = b.estado.toLowerCase().includes('proceso')
        
        if (aEsProceso && !bEsProceso) return -1
        if (!aEsProceso && bEsProceso) return 1
        
        // 2. Luego por provincia (La Habana primero)
        const aEsHabana = a.provincia.toLowerCase().includes('habana')
        const bEsHabana = b.provincia.toLowerCase().includes('habana')
        
        if (aEsHabana && !bEsHabana) return -1
        if (!aEsHabana && bEsHabana) return 1
        
        // Si ambos son o no son de La Habana, ordenar alfabéticamente por provincia
        if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia)
        
        // 3. Finalmente por tipo (Clientes primero, luego Leads)
        if (a.tipo === 'cliente' && b.tipo === 'lead') return -1
        if (a.tipo === 'lead' && b.tipo === 'cliente') return 1
        
        return 0
      })

      console.log('📦 Datos después de ordenar:', {
        total: sorted.length,
        primeros5: sorted.slice(0, 5).map(i => ({ nombre: i.nombre, estado: i.estado, tipo: i.tipo }))
      })

      setInstalaciones(sorted)
    } catch (error: any) {
      console.error('Error al cargar instalaciones:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las instalaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Pendientes de Instalación"
        subtitle="No iniciadas y en proceso de leads y clientes"
        badge={{ text: "Reporte", className: "bg-blue-100 text-blue-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <PendientesInstalacionTable
          instalaciones={instalaciones}
          loading={loading}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  )
}

// Helper para formatear ofertas
function formatOfertas(ofertas: any[]): string {
  if (!ofertas || ofertas.length === 0) return "Sin oferta"
  
  return ofertas.map((oferta: any) => {
    const productos: string[] = []
    
    if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
      const nombre = oferta.inversor_nombre || oferta.inversor_codigo
      productos.push(`${oferta.inversor_cantidad}x ${nombre}`)
    }
    
    if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
      const nombre = oferta.bateria_nombre || oferta.bateria_codigo
      productos.push(`${oferta.bateria_cantidad}x ${nombre}`)
    }
    
    if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
      const nombre = oferta.panel_nombre || oferta.panel_codigo
      productos.push(`${oferta.panel_cantidad}x ${nombre}`)
    }
    
    if (oferta.elementos_personalizados) {
      productos.push(oferta.elementos_personalizados)
    }
    
    return productos.join(" • ")
  }).join(" | ")
}
