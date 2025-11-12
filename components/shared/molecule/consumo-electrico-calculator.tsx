"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { Slider } from "@/components/shared/molecule/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Calculator, Plus, X, Zap, RotateCcw } from "lucide-react"

export interface Equipo {
  id: string
  nombre: string
  potenciaW: number
  consumoKwh: number
  categoria: string
}

export interface EquipoPersonalizado {
  nombre: string
  consumoKwh: number
}

export const equipos: Equipo[] = [
  // Electrodomésticos de Cocina
  { id: "refrigerador", nombre: "Refrigerador (A++)", potenciaW: 150, consumoKwh: 0.15, categoria: "Electrodomésticos de Cocina" },
  { id: "congelador", nombre: "Congelador independiente", potenciaW: 200, consumoKwh: 0.2, categoria: "Electrodomésticos de Cocina" },
  { id: "microondas", nombre: "Microondas", potenciaW: 1200, consumoKwh: 1.2, categoria: "Electrodomésticos de Cocina" },
  { id: "horno", nombre: "Horno eléctrico", potenciaW: 2000, consumoKwh: 2.0, categoria: "Electrodomésticos de Cocina" },
  { id: "cocina-induccion", nombre: "Cocina de inducción (una zona)", potenciaW: 1800, consumoKwh: 1.8, categoria: "Electrodomésticos de Cocina" },
  { id: "extractor", nombre: "Extractor de cocina", potenciaW: 100, consumoKwh: 0.1, categoria: "Electrodomésticos de Cocina" },
  { id: "licuadora", nombre: "Licuadora", potenciaW: 400, consumoKwh: 0.4, categoria: "Electrodomésticos de Cocina" },
  { id: "tostadora", nombre: "Tostadora", potenciaW: 800, consumoKwh: 0.8, categoria: "Electrodomésticos de Cocina" },
  { id: "cafetera", nombre: "Cafetera", potenciaW: 800, consumoKwh: 0.8, categoria: "Electrodomésticos de Cocina" },
  { id: "lavavajillas", nombre: "Lavavajillas", potenciaW: 1500, consumoKwh: 1.5, categoria: "Electrodomésticos de Cocina" },
  
  // Equipos de Sala y Entretenimiento
  { id: "tv-32", nombre: "Televisor LED 32\"", potenciaW: 70, consumoKwh: 0.07, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "tv-50", nombre: "Televisor LED 50\"", potenciaW: 150, consumoKwh: 0.15, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "decodificador", nombre: "Decodificador / TV Box", potenciaW: 25, consumoKwh: 0.025, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "sonido", nombre: "Equipo de sonido", potenciaW: 100, consumoKwh: 0.1, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "consola", nombre: "Consola de videojuegos", potenciaW: 120, consumoKwh: 0.12, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "router", nombre: "Router WiFi", potenciaW: 10, consumoKwh: 0.01, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "laptop", nombre: "Laptop", potenciaW: 60, consumoKwh: 0.06, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "pc", nombre: "PC de escritorio", potenciaW: 250, consumoKwh: 0.25, categoria: "Equipos de Sala y Entretenimiento" },
  { id: "monitor", nombre: "Monitor", potenciaW: 40, consumoKwh: 0.04, categoria: "Equipos de Sala y Entretenimiento" },
  
  // Climatización y Ventilación
  { id: "ac-9000", nombre: "Aire acondicionado 9000 BTU (1 Tn)", potenciaW: 1000, consumoKwh: 1.0, categoria: "Climatización y Ventilación" },
  { id: "ac-12000", nombre: "Aire acondicionado 12000 BTU (1.5 Tn)", potenciaW: 1500, consumoKwh: 1.5, categoria: "Climatización y Ventilación" },
  { id: "ac-inverter", nombre: "Aire acondicionado inverter (eficiente)", potenciaW: 950, consumoKwh: 0.95, categoria: "Climatización y Ventilación" },
  { id: "ventilador", nombre: "Ventilador de pie", potenciaW: 70, consumoKwh: 0.07, categoria: "Climatización y Ventilación" },
  { id: "extractor-aire", nombre: "Extractor de aire", potenciaW: 40, consumoKwh: 0.04, categoria: "Climatización y Ventilación" },
  { id: "deshumidificador", nombre: "Deshumidificador", potenciaW: 300, consumoKwh: 0.3, categoria: "Climatización y Ventilación" },
  { id: "calefactor", nombre: "Calefactor eléctrico pequeño", potenciaW: 1200, consumoKwh: 1.2, categoria: "Climatización y Ventilación" },
  
  // Dormitorio y Uso General
  { id: "lampara-led", nombre: "Lámpara LED 10W", potenciaW: 10, consumoKwh: 0.01, categoria: "Dormitorio y Uso General" },
  { id: "lampara-incandescente", nombre: "Lámpara incandescente", potenciaW: 60, consumoKwh: 0.06, categoria: "Dormitorio y Uso General" },
  { id: "cargador-celular", nombre: "Cargador de celular", potenciaW: 5, consumoKwh: 0.005, categoria: "Dormitorio y Uso General" },
  { id: "despertador", nombre: "Despertador digital", potenciaW: 3, consumoKwh: 0.003, categoria: "Dormitorio y Uso General" },
  { id: "plancha", nombre: "Plancha de ropa", potenciaW: 1200, consumoKwh: 1.2, categoria: "Dormitorio y Uso General" },
  { id: "secadora-cabello", nombre: "Secadora de cabello", potenciaW: 1500, consumoKwh: 1.5, categoria: "Dormitorio y Uso General" },
  
  // Lavandería y Limpieza
  { id: "lavadora", nombre: "Lavadora automática", potenciaW: 500, consumoKwh: 0.5, categoria: "Lavandería y Limpieza" },
  { id: "secadora", nombre: "Secadora eléctrica", potenciaW: 2000, consumoKwh: 2.0, categoria: "Lavandería y Limpieza" },
  { id: "aspiradora", nombre: "Aspiradora", potenciaW: 800, consumoKwh: 0.8, categoria: "Lavandería y Limpieza" },
  { id: "planchadora", nombre: "Planchadora de vapor", potenciaW: 1200, consumoKwh: 1.2, categoria: "Lavandería y Limpieza" },
  
  // Agua y Servicios
  { id: "bomba-1-2", nombre: "Bomba de agua doméstica 1/2 HP", potenciaW: 370, consumoKwh: 0.37, categoria: "Agua y Servicios" },
  { id: "bomba-1", nombre: "Bomba de agua 1 HP", potenciaW: 750, consumoKwh: 0.75, categoria: "Agua y Servicios" },
  { id: "calentador-agua", nombre: "Calentador de agua eléctrico", potenciaW: 2000, consumoKwh: 2.0, categoria: "Agua y Servicios" },
  { id: "calentador-instantaneo", nombre: "Calentador instantáneo (ducha)", potenciaW: 4500, consumoKwh: 4.5, categoria: "Agua y Servicios" },
  { id: "purificador", nombre: "Purificador / Dispensador de agua", potenciaW: 100, consumoKwh: 0.1, categoria: "Agua y Servicios" },
  
  // Otros Equipos y Herramientas
  { id: "cargador-vehiculo", nombre: "Cargador de vehículo eléctrico doméstico", potenciaW: 3600, consumoKwh: 3.6, categoria: "Otros Equipos y Herramientas" },
  { id: "taladro", nombre: "Taladro eléctrico", potenciaW: 600, consumoKwh: 0.6, categoria: "Otros Equipos y Herramientas" },
  { id: "compresor", nombre: "Compresor pequeño", potenciaW: 1000, consumoKwh: 1.0, categoria: "Otros Equipos y Herramientas" },
  { id: "soldadora", nombre: "Soldadora", potenciaW: 3000, consumoKwh: 3.0, categoria: "Otros Equipos y Herramientas" },
]

export const categorias = [
  "Electrodomésticos de Cocina",
  "Equipos de Sala y Entretenimiento",
  "Climatización y Ventilación",
  "Dormitorio y Uso General",
  "Lavandería y Limpieza",
  "Agua y Servicios",
  "Otros Equipos y Herramientas"
]

interface ConsumoElectricoCalculatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEquipos: Set<string>
  onToggleEquipo: (equipoId: string) => void
  equiposPersonalizados: EquipoPersonalizado[]
  onAgregarEquipoPersonalizado: (equipo: EquipoPersonalizado) => void
  onEliminarEquipoPersonalizado: (index: number) => void
  consumoTotal: number
  onRestablecer: () => void
}

export function ConsumoElectricoCalculator({ 
  open, 
  onOpenChange,
  selectedEquipos,
  onToggleEquipo,
  equiposPersonalizados,
  onAgregarEquipoPersonalizado,
  onEliminarEquipoPersonalizado,
  consumoTotal,
  onRestablecer
}: ConsumoElectricoCalculatorProps) {
  const [showAgregarEquipo, setShowAgregarEquipo] = useState(false)
  const [nuevoEquipoNombre, setNuevoEquipoNombre] = useState("")
  const [nuevoEquipoConsumo, setNuevoEquipoConsumo] = useState([1.0])

  const agregarEquipoPersonalizado = () => {
    if (nuevoEquipoNombre.trim() && nuevoEquipoConsumo[0] > 0) {
      onAgregarEquipoPersonalizado({
        nombre: nuevoEquipoNombre.trim(),
        consumoKwh: nuevoEquipoConsumo[0]
      })
      setNuevoEquipoNombre("")
      setNuevoEquipoConsumo([1.0])
      setShowAgregarEquipo(false)
    }
  }

  const equiposPorCategoria = useMemo(() => {
    const grouped: Record<string, Equipo[]> = {}
    categorias.forEach(cat => {
      grouped[cat] = equipos.filter(e => e.categoria === cat)
    })
    return grouped
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        {/* Header fijo */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogHeader className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Calculator className="h-6 w-6 text-orange-600" />
                Calculadora de Consumo Eléctrico
              </DialogTitle>
            </DialogHeader>
            <Button
              onClick={onRestablecer}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
              disabled={selectedEquipos.size === 0 && equiposPersonalizados.length === 0}
            >
              <RotateCcw className="h-4 w-4 text-orange-600" />
              <span>Restablecer</span>
            </Button>
          </div>
        </div>

        {/* Panel de consumo total fijo */}
        <div className="sticky top-[88px] z-10 bg-white border-b border-gray-200 px-6 py-4">
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Consumo Total por Hora</p>
                  <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="h-8 w-8 text-orange-600" />
                    {consumoTotal.toFixed(3)} kWh
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Consumo diario estimado (24h): {(consumoTotal * 24).toFixed(2)} kWh
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2 bg-white">
                  {selectedEquipos.size + equiposPersonalizados.length} {selectedEquipos.size + equiposPersonalizados.length === 1 ? 'equipo' : 'equipos'} seleccionado{selectedEquipos.size + equiposPersonalizados.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6 pt-6">
            {/* Lista de equipos por categoría */}
            <div className="space-y-4">
            {categorias.map(categoria => {
              const equiposCategoria = equiposPorCategoria[categoria]
              if (equiposCategoria.length === 0) return null

              const iconos: Record<string, string> = {
                "Electrodomésticos de Cocina": "🏠",
                "Equipos de Sala y Entretenimiento": "🛋️",
                "Climatización y Ventilación": "❄️",
                "Dormitorio y Uso General": "🛏️",
                "Lavandería y Limpieza": "🧺",
                "Agua y Servicios": "💧",
                "Otros Equipos y Herramientas": "🚗"
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
                      {equiposCategoria.map(equipo => (
                        <label
                          key={equipo.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-orange-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEquipos.has(equipo.id)}
                            onChange={() => onToggleEquipo(equipo.id)}
                            className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {equipo.potenciaW} W • {equipo.consumoKwh} kWh/h
                            </p>
                          </div>
                        </label>
                      ))}
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
                        <p className="text-xs text-gray-500">{equipo.consumoKwh} kWh/h</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEliminarEquipoPersonalizado(index)}
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
                    placeholder="Ej: Ventilador de techo"
                    value={nuevoEquipoNombre}
                    onChange={(e) => setNuevoEquipoNombre(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="equipo-consumo">
                    Consumo por Hora: {nuevoEquipoConsumo[0].toFixed(3)} kWh
                  </Label>
                  <Slider
                    id="equipo-consumo"
                    min={0.001}
                    max={10}
                    step={0.001}
                    value={nuevoEquipoConsumo}
                    onValueChange={setNuevoEquipoConsumo}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.001 kWh</span>
                    <span>10 kWh</span>
                  </div>
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
                      setNuevoEquipoConsumo([1.0])
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

            {/* Botón cerrar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

