"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { ArchivoRHService } from "@/lib/services/feats/recursos-humanos/archivo-rh-service"
import type { ArchivoNominaRH } from "@/lib/types/feats/recursos-humanos/archivo-rh-types"

interface NominaNavigationProps {
  mesActual: number
  anioActual: number
  onNavigate: (nomina: ArchivoNominaRH) => void
  onVolverActual: () => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function NominaNavigation({
  mesActual,
  anioActual,
  onNavigate,
  onVolverActual
}: NominaNavigationProps) {
  const [navegacion, setNavegacion] = useState<{ tiene_previo: boolean; tiene_siguiente: boolean }>({
    tiene_previo: false,
    tiene_siguiente: false
  })
  const [cargando, setCargando] = useState(false)
  const [mesVisualizando, setMesVisualizando] = useState(mesActual)
  const [anioVisualizando, setAnioVisualizando] = useState(anioActual)

  const esActual = mesVisualizando === mesActual && anioVisualizando === anioActual

  // Verificar navegación disponible cada vez que cambia el periodo
  useEffect(() => {
    verificarNavegacion(mesVisualizando, anioVisualizando)
  }, [mesVisualizando, anioVisualizando])

  const verificarNavegacion = async (mes: number, anio: number) => {
    try {
      const nav = await ArchivoRHService.verificarNavegacion(mes, anio)
      setNavegacion(nav)
    } catch (error) {
      console.error('Error al verificar navegación:', error)
      setNavegacion({ tiene_previo: false, tiene_siguiente: false })
    }
  }

  const handleAnterior = async () => {
    if (!navegacion.tiene_previo || cargando) return

    setCargando(true)
    try {
      const nominaAnterior = await ArchivoRHService.getNominaPrevio(mesVisualizando, anioVisualizando)
      if (nominaAnterior) {
        setMesVisualizando(nominaAnterior.mes)
        setAnioVisualizando(nominaAnterior.anio)
        onNavigate(nominaAnterior)
      }
    } catch (error) {
      console.error('Error al navegar a periodo anterior:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleSiguiente = async () => {
    if (!navegacion.tiene_siguiente || cargando) return

    setCargando(true)
    try {
      const nominaSiguiente = await ArchivoRHService.getNominaSiguiente(mesVisualizando, anioVisualizando)
      if (nominaSiguiente) {
        setMesVisualizando(nominaSiguiente.mes)
        setAnioVisualizando(nominaSiguiente.anio)
        onNavigate(nominaSiguiente)
      }
    } catch (error) {
      console.error('Error al navegar a periodo siguiente:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleVolverActual = () => {
    setMesVisualizando(mesActual)
    setAnioVisualizando(anioActual)
    onVolverActual()
  }

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      {/* Flecha izquierda */}
      <Button
        variant="outline"
        size="default"
        onClick={handleAnterior}
        disabled={!navegacion.tiene_previo || cargando}
        className="hover:bg-purple-100 hover:border-purple-400 disabled:opacity-30 border-2 border-purple-500 text-purple-700 font-semibold"
        title="Ver nómina anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Indicador de periodo */}
      <div className="flex items-center gap-3 px-6 py-2 bg-purple-50 rounded-lg border-2 border-purple-200">
        <Calendar className="h-5 w-5 text-purple-700" />
        <span className="text-base font-bold text-gray-900">
          {MESES[mesVisualizando - 1]} {anioVisualizando}
        </span>
      </div>

      {/* Flecha derecha */}
      <Button
        variant="outline"
        size="default"
        onClick={handleSiguiente}
        disabled={!navegacion.tiene_siguiente || cargando}
        className="hover:bg-purple-100 hover:border-purple-400 disabled:opacity-30 border-2 border-purple-500 text-purple-700 font-semibold"
        title="Ver nómina siguiente"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Botón volver al actual */}
      {!esActual && (
        <Button
          variant="default"
          size="default"
          onClick={handleVolverActual}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 ml-2"
        >
          Volver al Actual
        </Button>
      )}
    </div>
  )
}
