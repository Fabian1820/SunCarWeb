"use client"

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import { Card } from '@/components/shared/molecule/card'
import { useServicios } from '@/hooks/use-servicios'
import { useToast } from '@/hooks/use-toast'
import type { ServicioOfertaItem } from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

interface ServicioSelectorFieldProps {
  value: ServicioOfertaItem[]
  onChange: (value: ServicioOfertaItem[]) => void
  label?: string
}

export function ServicioSelectorField({
  value,
  onChange,
  label = 'Servicios',
}: ServicioSelectorFieldProps) {
  const { serviciosSimplificados, loading, createServicio } = useServicios()
  const { toast } = useToast()
  const [descripcion, setDescripcion] = useState('')
  const [costo, setCosto] = useState<string>('')
  const [suggestions, setSuggestions] = useState<typeof serviciosSimplificados>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar sugerencias según lo escrito
  useEffect(() => {
    if (descripcion.trim()) {
      const filtered = serviciosSimplificados.filter((s) =>
        s.descripcion.toLowerCase().includes(descripcion.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions(serviciosSimplificados)
      setShowSuggestions(false)
    }
  }, [descripcion, serviciosSimplificados])

  const handleSelectSuggestion = (servicioDescripcion: string) => {
    setDescripcion(servicioDescripcion)
    setShowSuggestions(false)
  }

  const handleAddServicio = async () => {
    const descripcionTrimmed = descripcion.trim()

    if (!descripcionTrimmed) {
      toast({
        title: 'Error',
        description: 'Ingresa una descripción del servicio',
        variant: 'destructive',
      })
      return
    }

    const costoNumerico = parseFloat(costo)
    if (isNaN(costoNumerico) || costoNumerico <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un costo válido mayor a 0',
        variant: 'destructive',
      })
      return
    }

    // Verificar si ya existe este servicio en la lista de la oferta
    const existeEnOferta = value.some(
      (s) => s.descripcion.toLowerCase() === descripcionTrimmed.toLowerCase()
    )
    if (existeEnOferta) {
      toast({
        title: 'Advertencia',
        description: 'Este servicio ya está agregado a la oferta',
        variant: 'destructive',
      })
      return
    }

    // Verificar si el servicio existe en el catálogo
    const existeEnCatalogo = serviciosSimplificados.some(
      (s) => s.descripcion.toLowerCase() === descripcionTrimmed.toLowerCase()
    )

    // Si no existe en el catálogo, crearlo automáticamente
    if (!existeEnCatalogo) {
      setIsCreatingNew(true)
      try {
        const success = await createServicio({
          descripcion: descripcionTrimmed,
          is_active: true,
        })

        if (!success) {
          toast({
            title: 'Error',
            description: 'No se pudo crear el servicio en el catálogo',
            variant: 'destructive',
          })
          setIsCreatingNew(false)
          return
        }

        toast({
          title: 'Servicio creado',
          description: `"${descripcionTrimmed}" se agregó al catálogo`,
        })
      } catch (error) {
        console.error('Error creating servicio:', error)
        toast({
          title: 'Error',
          description: 'Error al crear el servicio',
          variant: 'destructive',
        })
        setIsCreatingNew(false)
        return
      } finally {
        setIsCreatingNew(false)
      }
    }

    // Agregar servicio a la oferta
    const newServicio: ServicioOfertaItem = {
      descripcion: descripcionTrimmed,
      costo: costoNumerico,
    }

    onChange([...value, newServicio])
    setDescripcion('')
    setCosto('')
    setShowSuggestions(false)
  }

  const handleRemoveServicio = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      {/* Formulario para agregar servicio */}
      <div className="flex gap-2" ref={wrapperRef}>
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Escribe o selecciona un servicio"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onFocus={() => {
              if (serviciosSimplificados.length > 0) {
                setSuggestions(serviciosSimplificados)
                setShowSuggestions(true)
              }
            }}
            disabled={loading || isCreatingNew}
          />

          {/* Lista de sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((servicio) => (
                <button
                  key={servicio.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSelectSuggestion(servicio.descripcion)}
                >
                  <span>{servicio.descripcion}</span>
                  {descripcion.toLowerCase() === servicio.descripcion.toLowerCase() && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          type="number"
          placeholder="Costo"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          className="w-32"
          min="0"
          step="0.01"
          disabled={isCreatingNew}
        />

        <Button
          type="button"
          onClick={handleAddServicio}
          size="icon"
          variant="default"
          disabled={loading || isCreatingNew}
          title="Agregar servicio (se creará si no existe)"
        >
          {isCreatingNew ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Escribe para buscar servicios existentes o crea uno nuevo automáticamente
      </p>

      {/* Lista de servicios agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Servicios agregados ({value.length})
          </Label>
          {value.map((servicio, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{servicio.descripcion}</p>
                  <p className="text-sm text-muted-foreground">
                    Costo: ${servicio.costo?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveServicio(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No se han agregado servicios</p>
      )}
    </div>
  )
}
