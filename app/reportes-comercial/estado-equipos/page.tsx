"use client"

import { useState, useEffect, useCallback } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { EstadoEquiposStats } from "@/components/feats/reportes-comercial/estado-equipos-stats"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import type { EstadoEquiposData } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"

interface EstadoEquiposResponse {
  success: boolean
  message: string
  data: EstadoEquiposData
}

export default function EstadoEquiposPage() {
  const { toast } = useToast()
  const [data, setData] = useState<EstadoEquiposData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔄 Intentando cargar estado de equipos...')
      
      const response = await apiRequest<EstadoEquiposResponse>(
        '/reportes/estado-equipos'
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar datos')
      }

      console.log('✅ Estado de equipos cargado exitosamente:', {
        total_vendidos: response.data.resumen.total_vendidos,
        categorias: response.data.categorias.length
      })

      setData(response.data)
      
      // Mostrar toast de éxito
      toast({
        title: "Datos cargados",
        description: `${response.data.resumen.total_vendidos} equipos vendidos en ${response.data.categorias.length} categorías`,
      })
    } catch (error: any) {
      console.error('❌ Error al cargar estado de equipos:', error)
      
      // Determinar el tipo de error
      let errorTitle = "Error al cargar datos"
      let errorDescription = "No se pudo conectar con el servidor."
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Load failed')) {
        errorTitle = "Servidor no disponible"
        errorDescription = "Verifica que el backend esté corriendo en http://localhost:8000"
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorTitle = "No autorizado"
        errorDescription = "Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
      } else if (error.message) {
        errorDescription = error.message
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      })
      
      // Dejar data como null para mostrar mensaje de error
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Estado de Equipos"
        subtitle="Seguimiento de equipos vendidos, entregados y en servicio"
        badge={{ text: "Reporte", className: "bg-orange-100 text-orange-800" }}
      />

      <main className="content-with-fixed-header max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <EstadoEquiposStats
          data={data}
          loading={loading}
          onRefresh={fetchData}
        />
      </main>
    </div>
  )
}
