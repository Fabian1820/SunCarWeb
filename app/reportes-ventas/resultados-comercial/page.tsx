"use client"

import { useState, useEffect, useCallback } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { VentasPorComercialTable } from "@/components/feats/reportes-ventas/resultados-comercial-table"
import { ClientesPorComercialTable } from "@/components/feats/reportes-ventas/clientes-por-comercial-table"
import { ResultadosVentasService } from "@/lib/services/feats/reportes-ventas/resultados-comercial-service"
import { useToast } from "@/hooks/use-toast"
import { Receipt, Users } from "lucide-react"
import type {
  FacturaVentaConComercial,
  ClienteVentaConResumen,
} from "@/lib/types/feats/reportes-ventas/reportes-ventas-types"

type TabId = "ventas" | "clientes"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "ventas", label: "Ventas por Comercial", icon: Receipt },
  { id: "clientes", label: "Clientes por Comercial", icon: Users },
]

export default function ResultadosComercialVentasPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>("ventas")

  const [facturas, setFacturas] = useState<FacturaVentaConComercial[]>([])
  const [loadingFacturas, setLoadingFacturas] = useState(true)

  const [clientes, setClientes] = useState<ClienteVentaConResumen[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clientesLoaded, setClientesLoaded] = useState(false)

  const fetchFacturas = useCallback(async () => {
    setLoadingFacturas(true)
    try {
      const data = await ResultadosVentasService.getFacturasConComercial({ limit: 1000 })
      setFacturas(data)
    } catch (error: any) {
      console.error('Error al cargar facturas:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las ventas",
        variant: "destructive",
      })
    } finally {
      setLoadingFacturas(false)
    }
  }, [toast])

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true)
    try {
      const data = await ResultadosVentasService.getClientesConResumen({ limit: 1000 })
      setClientes(data)
      setClientesLoaded(true)
    } catch (error: any) {
      console.error('Error al cargar clientes:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setLoadingClientes(false)
    }
  }, [toast])

  useEffect(() => {
    fetchFacturas()
  }, [fetchFacturas])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    if (tab === "clientes" && !clientesLoaded) {
      fetchClientes()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Resultados por Comercial - Ventas"
        subtitle="Facturas emitidas y clientes asignados por vendedor"
        badge={{ text: "Reporte", className: "bg-green-100 text-green-800" }}
      />

      <main className="content-with-fixed-header max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <div className="mb-6">
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === "ventas" && (
          <VentasPorComercialTable
            facturas={facturas}
            loading={loadingFacturas}
            onRefresh={fetchFacturas}
          />
        )}

        {activeTab === "clientes" && (
          <ClientesPorComercialTable
            clientes={clientes}
            loading={loadingClientes}
            onRefresh={fetchClientes}
          />
        )}
      </main>
    </div>
  )
}
