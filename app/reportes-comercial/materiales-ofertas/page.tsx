"use client"

import { useState } from "react"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/molecule/tabs"
import { MaterialesOfertasReport } from "@/components/feats/reportes-comercial/materiales-ofertas-report"
import { MaterialesComprometidosReport } from "@/components/feats/reportes-comercial/materiales-comprometidos-report"

export default function MaterialesOfertasPage() {
  const [pestana, setPestana] = useState("buscar")
  // Comprometidos tarda unos segundos: se calcula al abrir la pestaña y no antes
  const [comprometidosAbierto, setComprometidosAbierto] = useState(false)
  const cambiarPestana = (valor: string) => {
    setPestana(valor)
    if (valor === "comprometidos") setComprometidosAbierto(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Materiales en Ofertas"
        subtitle={
          pestana === "comprometidos"
            ? "Material de clientes que ya pagaron y aún no tienen el equipo, contra el stock"
            : "En qué ofertas está cada material, a qué precio y con qué cliente"
        }
        badge={{ text: "Reporte", className: "bg-blue-100 text-blue-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Tabs value={pestana} onValueChange={cambiarPestana} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="buscar">Buscar por material</TabsTrigger>
            <TabsTrigger value="comprometidos">Comprometidos</TabsTrigger>
          </TabsList>
          {/* forceMount: cambiar de pestaña no pierde los filtros ni vuelve a consultar */}
          <TabsContent value="buscar" forceMount className="mt-0 data-[state=inactive]:hidden">
            <MaterialesOfertasReport />
          </TabsContent>
          <TabsContent value="comprometidos" forceMount className="mt-0 data-[state=inactive]:hidden">
            {comprometidosAbierto && <MaterialesComprometidosReport />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
