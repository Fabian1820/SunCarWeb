"use client"

import { useState, useEffect, useCallback } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { ResultadosComercialTable } from "@/components/feats/reportes-comercial/resultados-comercial-table"
import { apiRequest } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import type { ResultadoComercial } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"

interface ResultadosComercialResponse {
  success: boolean
  message: string
  data: ResultadoComercial[]
}

export default function ResultadosComercialPage() {
  const { toast } = useToast()
  const [resultados, setResultados] = useState<ResultadoComercial[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiRequest<ResultadosComercialResponse>(
        '/ofertas/confeccion/personalizadas-con-pagos'
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar datos')
      }

      console.log('📊 Resultados cargados:', {
        total: response.data.length,
        comerciales: new Set(response.data.map(r => r.contacto.comercial).filter(Boolean)).size
      })

      setResultados(response.data)
    } catch (error: any) {
      console.error('Error al cargar resultados:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los resultados",
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
        title="Resultados por Comercial"
        subtitle="Ofertas personalizadas cerradas con pagos registrados"
        badge={{ text: "Reporte", className: "bg-green-100 text-green-800" }}
      />

      <main className="content-with-fixed-header max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <ResultadosComercialTable
          resultados={resultados}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  )
}
