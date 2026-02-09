"use client"

import { useState, useEffect, useCallback } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PendientesVisitaTable } from "@/components/feats/instalaciones/pendientes-visita-table"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types"

interface PendientesVisitaResponse {
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

export default function PendientesVisitaPage() {
  const { toast } = useToast()
  const [pendientes, setPendientes] = useState<PendienteVisita[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // TODO: Reemplazar con el endpoint real cuando esté disponible
      const response = await apiRequest<PendientesVisitaResponse>(
        '/clientes/pendientes-visita'
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar datos')
      }

      const { clientes, leads } = response.data

      // Transformar a formato unificado
      const pendientesData: PendienteVisita[] = [
        ...clientes.map((c: any) => ({
          id: c.id || c.numero,
          tipo: 'cliente' as const,
          nombre: c.nombre,
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          provincia: c.provincia_montaje || 'Sin especificar',
          estado: c.estado || '',
          oferta: formatOfertas(c.ofertas || []),
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
          comentario: l.comentario || '',
          fuente: l.fuente || '',
          fecha_contacto: l.fecha_contacto
        }))
      ]

      // Ordenar: La Habana primero, luego otras provincias
      // Dentro de cada grupo: Clientes primero, luego Leads
      const sorted = pendientesData.sort((a, b) => {
        // 1. Por provincia (La Habana primero)
        const aEsHabana = a.provincia.toLowerCase().includes('habana')
        const bEsHabana = b.provincia.toLowerCase().includes('habana')
        
        if (aEsHabana && !bEsHabana) return -1
        if (!aEsHabana && bEsHabana) return 1
        
        if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia)
        
        // 2. Por tipo (Clientes primero, luego Leads)
        if (a.tipo === 'cliente' && b.tipo === 'lead') return -1
        if (a.tipo === 'lead' && b.tipo === 'cliente') return 1
        
        return 0
      })

      setPendientes(sorted)
    } catch (error: any) {
      console.error('Error al cargar pendientes de visita:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los pendientes de visita",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Pendientes de Visita"
        subtitle="Leads y clientes pendientes de instalación que requieren visita"
        badge={{ text: "Instalaciones", className: "bg-orange-100 text-orange-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <PendientesVisitaTable
          pendientes={pendientes}
          loading={loading}
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
