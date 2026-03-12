"use client"

import { useParams } from "next/navigation"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { FileOutput } from "lucide-react"

export default function ValesSalidaPage() {
  const params = useParams()
  const almacenId = params.almacenId as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Vales de Salida"
        subtitle="Gestión de vales de salida de materiales"
        badge={{ text: "Almacenes", className: "bg-orange-100 text-orange-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        backButton={{ href: `/almacenes-suncar/${almacenId}`, label: "Volver al Almacén" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="border-0 shadow-md">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="bg-orange-50 p-5 rounded-full mb-4">
              <FileOutput className="h-12 w-12 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Vales de Salida</h3>
            <p className="text-gray-500 max-w-sm">
              Esta sección está en desarrollo. Aquí podrás gestionar los vales de salida de materiales del almacén.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
