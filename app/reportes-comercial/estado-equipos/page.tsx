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
      const response = await apiRequest<EstadoEquiposResponse>(
        '/reportes/estado-equipos'
      )

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar datos')
      }

      setData(response.data)
    } catch (error: any) {
      console.error('Error al cargar estado de equipos:', error)
      
      // Datos mock temporales mientras se implementa el backend
      const mockData: EstadoEquiposData = {
        resumen: {
          total_vendidos: 348,
          total_entregados: 261,
          total_sin_entregar: 87,
          total_en_servicio: 245,
          porcentaje_entregados: 75,
          porcentaje_en_servicio: 70,
          variacion_mensual: 12
        },
        categorias: [
          {
            categoria: "Inversores",
            descripcion: "Monofásicos y trifásicos",
            unidades_vendidas: 96,
            unidades_entregadas: 72,
            unidades_sin_entregar: 24,
            unidades_en_servicio: 68,
            porcentaje_entregado: 75,
            equipos: [
              {
                id: "mat_001",
                codigo: "INV-HW-5K",
                nombre: "Huawei SUN2000 5KW",
                categoria: "Inversores",
                tipo: "Monofásico · Híbrido",
                unidades_vendidas: 32,
                unidades_entregadas: 32,
                unidades_sin_entregar: 0,
                unidades_en_servicio: 30,
                porcentaje_entregado: 100,
                porcentaje_en_servicio: 94,
                clientes: [
                  {
                    id: "cli_001",
                    codigo: "C-2024-001",
                    nombre: "Juan Pérez García",
                    telefono: "+53 5234-5678",
                    direccion: "Calle 23 #456",
                    provincia: "La Habana",
                    estado: "Instalación completada",
                    fecha_instalacion: "2024-01-15",
                    cantidad_equipos: 1
                  },
                  {
                    id: "cli_002",
                    codigo: "C-2024-012",
                    nombre: "María Rodríguez López",
                    telefono: "+53 5345-6789",
                    direccion: "Ave. 5ta #789",
                    provincia: "La Habana",
                    estado: "Instalación completada",
                    fecha_instalacion: "2024-01-20",
                    cantidad_equipos: 1
                  },
                  {
                    id: "cli_003",
                    codigo: "C-2024-023",
                    nombre: "Carlos Fernández Díaz",
                    telefono: "+53 5456-7890",
                    direccion: "Calle 10 #234",
                    provincia: "Artemisa",
                    estado: "Instalación en proceso",
                    cantidad_equipos: 2
                  }
                ]
              },
              {
                id: "mat_002",
                codigo: "INV-SOL-10K",
                nombre: "Solis 10KW Trifásico",
                categoria: "Inversores",
                tipo: "Trifásico · Red",
                unidades_vendidas: 26,
                unidades_entregadas: 26,
                unidades_sin_entregar: 0,
                unidades_en_servicio: 24,
                porcentaje_entregado: 100,
                porcentaje_en_servicio: 92,
                clientes: [
                  {
                    id: "cli_004",
                    codigo: "C-2024-034",
                    nombre: "Ana Martínez Suárez",
                    telefono: "+53 5567-8901",
                    direccion: "Calle 15 #567",
                    provincia: "Mayabeque",
                    estado: "Instalación completada",
                    fecha_instalacion: "2024-02-01",
                    cantidad_equipos: 1
                  },
                  {
                    id: "cli_005",
                    codigo: "C-2024-045",
                    nombre: "Pedro González Ramírez",
                    telefono: "+53 5678-9012",
                    direccion: "Ave. Principal #890",
                    provincia: "Pinar del Río",
                    estado: "Instalación completada",
                    fecha_instalacion: "2024-02-10",
                    cantidad_equipos: 1
                  }
                ]
              },
              {
                id: "mat_003",
                codigo: "INV-SMA-3.6",
                nombre: "SMA Sunny Boy 3.6",
                categoria: "Inversores",
                tipo: "Monofásico · Inyección",
                unidades_vendidas: 14,
                unidades_entregadas: 14,
                unidades_sin_entregar: 0,
                unidades_en_servicio: 14,
                porcentaje_entregado: 100,
                porcentaje_en_servicio: 100,
                clientes: [
                  {
                    id: "cli_006",
                    codigo: "C-2024-056",
                    nombre: "Luis Hernández Castro",
                    telefono: "+53 5789-0123",
                    direccion: "Calle 20 #123",
                    provincia: "Matanzas",
                    estado: "Instalación completada",
                    fecha_instalacion: "2024-02-15",
                    cantidad_equipos: 1
                  }
                ]
              }
            ]
          },
          {
            categoria: "Paneles Solares",
            descripcion: "Monocristalinos de alta eficiencia",
            unidades_vendidas: 1850,
            unidades_entregadas: 1420,
            unidades_sin_entregar: 430,
            unidades_en_servicio: 1380,
            porcentaje_entregado: 77,
            equipos: []
          },
          {
            categoria: "Baterías",
            descripcion: "Litio y AGM para almacenamiento",
            unidades_vendidas: 45,
            unidades_entregadas: 38,
            unidades_sin_entregar: 7,
            unidades_en_servicio: 35,
            porcentaje_entregado: 84,
            equipos: []
          }
        ],
        fecha_actualizacion: new Date().toISOString()
      }
      
      setData(mockData)
      
      toast({
        title: "Modo Demo",
        description: "Mostrando datos de ejemplo. El endpoint backend aún no está implementado.",
        variant: "default",
      })
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
