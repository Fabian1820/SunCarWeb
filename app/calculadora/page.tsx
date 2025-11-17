"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Slider } from "@/components/shared/molecule/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Calculator, Plus, X, Zap, RotateCcw, ArrowLeft, Battery, Cpu, Lightbulb, Minus } from "lucide-react"
import { equipos, categorias, type EquipoPersonalizado } from "@/components/shared/molecule/consumo-electrico-calculator"

interface EquipoCantidad {
  equipoId: string
  cantidad: number
}

export default function CalculadoraPage() {
  const [equiposCantidad, setEquiposCantidad] = useState<Map<string, number>>(new Map())
  const [equiposPersonalizados, setEquiposPersonalizados] = useState<EquipoPersonalizado[]>([])
  const [showAgregarEquipo, setShowAgregarEquipo] = useState(false)
  const [nuevoEquipoNombre, setNuevoEquipoNombre] = useState("")
  const [nuevoEquipoPotencia, setNuevoEquipoPotencia] = useState([100])
  const [nuevoEquipoConsumo, setNuevoEquipoConsumo] = useState([100])
  const [showRecomendaciones, setShowRecomendaciones] = useState(false)
  const [bateriaKwh, setBateriaKwh] = useState([0])

  // Calcular potencia total en kW (para dimensionar inversor)
  const potenciaTotalKw = useMemo(() => {
    let totalW = 0

    // Sumar equipos seleccionados con sus cantidades
    equiposCantidad.forEach((cantidad, equipoId) => {
      const equipo = equipos.find(e => e.id === equipoId)
      if (equipo) {
        totalW += equipo.potenciaW * cantidad
      }
    })

    // Sumar equipos personalizados (usar potenciaW convertida)
    equiposPersonalizados.forEach(equipo => {
      totalW += equipo.consumoKwh * 1000 // consumoKwh almacena la potencia en kW
    })

    return totalW / 1000
  }, [equiposCantidad, equiposPersonalizados])

  // Calcular consumo REAL en kWh (para dimensionar batería)
  const consumoRealKwh = useMemo(() => {
    let totalKwh = 0

    // Sumar consumo REAL de equipos seleccionados con sus cantidades
    equiposCantidad.forEach((cantidad, equipoId) => {
      const equipo = equipos.find(e => e.id === equipoId)
      if (equipo) {
        totalKwh += equipo.consumoKwh * cantidad // Aquí usamos el consumo REAL
      }
    })

    // Sumar equipos personalizados
    equiposPersonalizados.forEach(equipo => {
      totalKwh += equipo.consumoKwh
    })

    return totalKwh
  }, [equiposCantidad, equiposPersonalizados])

  // Recomendaciones
  const inversorRecomendado = potenciaTotalKw * 1.25
  const bateriaRecomendada5h = consumoRealKwh * 5

  // Calcular duración con batería personalizada
  const duracionConBateria = bateriaKwh[0] > 0 ? bateriaKwh[0] / consumoRealKwh : 0

  // Inicializar batería recomendada cuando se abre el modal
  const handleOpenRecomendaciones = () => {
    setBateriaKwh([parseFloat(bateriaRecomendada5h.toFixed(2))])
    setShowRecomendaciones(true)
  }

  const agregarEquipo = (equipoId: string) => {
    const nuevaCantidad = new Map(equiposCantidad)
    nuevaCantidad.set(equipoId, 1)
    setEquiposCantidad(nuevaCantidad)
  }

  const eliminarEquipo = (equipoId: string) => {
    const nuevaCantidad = new Map(equiposCantidad)
    nuevaCantidad.delete(equipoId)
    setEquiposCantidad(nuevaCantidad)
  }

  const incrementarCantidad = (equipoId: string) => {
    const nuevaCantidad = new Map(equiposCantidad)
    const cantidadActual = nuevaCantidad.get(equipoId) || 0
    nuevaCantidad.set(equipoId, cantidadActual + 1)
    setEquiposCantidad(nuevaCantidad)
  }

  const decrementarCantidad = (equipoId: string) => {
    const nuevaCantidad = new Map(equiposCantidad)
    const cantidadActual = nuevaCantidad.get(equipoId) || 0
    if (cantidadActual > 1) {
      nuevaCantidad.set(equipoId, cantidadActual - 1)
    } else {
      nuevaCantidad.delete(equipoId)
    }
    setEquiposCantidad(nuevaCantidad)
  }

  const agregarEquipoPersonalizado = () => {
    if (nuevoEquipoNombre.trim() && nuevoEquipoPotencia[0] > 0) {
      setEquiposPersonalizados([...equiposPersonalizados, {
        nombre: nuevoEquipoNombre.trim(),
        consumoKwh: nuevoEquipoConsumo[0] / 1000 // Guardar consumo real en kW
      }])
      setNuevoEquipoNombre("")
      setNuevoEquipoPotencia([100])
      setNuevoEquipoConsumo([100])
      setShowAgregarEquipo(false)
    }
  }

  const eliminarEquipoPersonalizado = (index: number) => {
    setEquiposPersonalizados(equiposPersonalizados.filter((_, i) => i !== index))
  }

  const restablecerParametros = () => {
    setEquiposCantidad(new Map())
    setEquiposPersonalizados([])
  }

  const equiposPorCategoria = useMemo(() => {
    const grouped: Record<string, typeof equipos> = {}
    categorias.forEach(cat => {
      grouped[cat] = equipos.filter(e => e.categoria === cat)
    })
    return grouped
  }, [])

  const totalEquipos = equiposCantidad.size + equiposPersonalizados.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-12 w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-10 w-10 object-contain rounded-full"/>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-orange-600" />
                  Calculadora de Consumo Eléctrico
                </h1>
                <p className="text-sm text-gray-600">Calcula el consumo de tus equipos eléctricos.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={restablecerParametros}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                disabled={totalEquipos === 0}
              >
                <RotateCcw className="h-4 w-4 text-orange-600" />
                <span>Restablecer</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Panel de consumo total */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-orange-50 to-yellow-50 pb-6">
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Potencia en kW */}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Potencia Total (Inversor)</p>
                      <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Cpu className="h-8 w-8 text-orange-600" />
                        {potenciaTotalKw.toFixed(2)} kW
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        = {(potenciaTotalKw * 1000).toFixed(0)} Watts
                      </p>
                    </div>

                    {/* Consumo REAL en kWh */}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Consumo Real por Hora (Batería)</p>
                      <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="h-8 w-8 text-orange-600" />
                        {consumoRealKwh.toFixed(3)} kWh
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Consumo diario (24h): {(consumoRealKwh * 24).toFixed(2)} kWh
                      </p>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2 bg-white ml-4">
                  {totalEquipos} {totalEquipos === 1 ? 'equipo' : 'equipos'}
                </Badge>
              </div>

              {/* Botón de recomendaciones */}
              {totalEquipos > 0 && (
                <div className="border-t border-orange-200 pt-4">
                  <Button
                    onClick={handleOpenRecomendaciones}
                    className="w-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2"
                  >
                    <Lightbulb className="h-5 w-5" />
                    Dimensionar Inversor y Batería
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="space-y-6">
          {/* Lista de equipos por categoría */}
          <div className="space-y-4">
            {categorias.map(categoria => {
              const equiposCategoria = equiposPorCategoria[categoria]
              if (equiposCategoria.length === 0) return null

              const iconos: Record<string, string> = {
                "Electrodomésticos de Cocina": "🏠",
                "Equipos de Sala y Entretenimiento": "🛋️",
                "Climatización y Ventilación": "❄️",
                "Iluminación": "💡",
                "Dormitorio y Uso General": "🛏️",
                "Lavandería y Limpieza": "🧺",
                "Agua y Servicios": "💧",
                "Otros Equipos y Herramientas": "🔧"
              }

              return (
                <Card key={categoria} className="border-orange-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{iconos[categoria]}</span>
                      {categoria}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {equiposCategoria.map(equipo => {
                        const cantidad = equiposCantidad.get(equipo.id) || 0
                        const seleccionado = cantidad > 0

                        return (
                          <div
                            key={equipo.id}
                            className={`p-3 rounded-lg border transition-colors ${
                              seleccionado
                                ? "border-orange-300 bg-orange-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {equipo.potenciaW} W • {(equipo.consumoKwh * 1000).toFixed(0)} W real/h
                                </p>
                              </div>
                            </div>

                            {!seleccionado ? (
                              <Button
                                onClick={() => agregarEquipo(equipo.id)}
                                size="sm"
                                variant="outline"
                                className="w-full border-orange-200 hover:bg-orange-100"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => decrementarCantidad(equipo.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <div className="flex-1 text-center">
                                  <span className="text-sm font-semibold">{cantidad}</span>
                                </div>
                                <Button
                                  onClick={() => incrementarCantidad(equipo.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => eliminarEquipo(equipo.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Equipos personalizados */}
          {equiposPersonalizados.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Equipos Personalizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {equiposPersonalizados.map((equipo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
                        <p className="text-xs text-gray-500">{(equipo.consumoKwh * 1000).toFixed(0)} W real/h</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarEquipoPersonalizado(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agregar equipo personalizado */}
          {!showAgregarEquipo ? (
            <Button
              onClick={() => setShowAgregarEquipo(true)}
              variant="outline"
              className="w-full border-orange-200 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Equipo Personalizado
            </Button>
          ) : (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Nuevo Equipo Personalizado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="equipo-nombre">Nombre del Equipo</Label>
                  <Input
                    id="equipo-nombre"
                    placeholder="Ej: Bomba de piscina"
                    value={nuevoEquipoNombre}
                    onChange={(e) => setNuevoEquipoNombre(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="equipo-consumo">
                    Consumo Real por Hora: {nuevoEquipoConsumo[0]} Watts
                  </Label>
                  <Slider
                    id="equipo-consumo"
                    min={1}
                    max={10000}
                    step={10}
                    value={nuevoEquipoConsumo}
                    onValueChange={setNuevoEquipoConsumo}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 W</span>
                    <span>10000 W (10 kW)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Este es el consumo REAL promedio por hora de uso del equipo.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={agregarEquipoPersonalizado}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    disabled={!nuevoEquipoNombre.trim()}
                  >
                    Agregar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAgregarEquipo(false)
                      setNuevoEquipoNombre("")
                      setNuevoEquipoPotencia([100])
                      setNuevoEquipoConsumo([100])
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Modal de Recomendaciones */}
      <Dialog open={showRecomendaciones} onOpenChange={setShowRecomendaciones}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          {/* Header fijo */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-600" />
                Dimensionamiento de Sistema Solar
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Inversor Recomendado */}
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-orange-600" />
                    Inversor Recomendado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Potencia del Inversor</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {inversorRecomendado.toFixed(2)} kW
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Potencia base: {potenciaTotalKw.toFixed(2)} kW + 25% de margen
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    ℹ️ El margen del 25% cubre picos de arranque de motores (aires acondicionados, refrigeradores) y permite expansión futura.
                  </p>
                </CardContent>
              </Card>

              {/* Batería Recomendada */}
              <Card className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Battery className="h-5 w-5 text-orange-600" />
                    Banco de Baterías
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Capacidad Recomendada (5 horas)</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">
                      {bateriaRecomendada5h.toFixed(2)} kWh
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {consumoRealKwh.toFixed(3)} kWh/h × 5 horas de autonomía
                    </p>
                  </div>

                  {/* Ajustar capacidad de batería */}
                  <div className="border-t border-orange-200 pt-4">
                    <Label htmlFor="bateria-kwh" className="text-xs sm:text-sm font-medium">
                      Ajustar Capacidad de Batería: {bateriaKwh[0].toFixed(2)} kWh
                    </Label>
                    <Slider
                      id="bateria-kwh"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={bateriaKwh}
                      onValueChange={setBateriaKwh}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.5 kWh</span>
                      <span>50 kWh</span>
                    </div>
                  </div>

                  {/* Duración calculada */}
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                      ⏱️ Duración con {bateriaKwh[0].toFixed(2)} kWh
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {duracionConBateria.toFixed(1)} horas
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Con {bateriaKwh[0].toFixed(2)} kWh de batería y un consumo real de {consumoRealKwh.toFixed(3)} kWh/h,
                      el sistema funcionará aproximadamente {duracionConBateria.toFixed(1)} horas sin red eléctrica.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer fijo */}
          <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowRecomendaciones(false)} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
