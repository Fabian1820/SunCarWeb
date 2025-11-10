"use client"

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atom/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/molecule/dialog'
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
  const [selectedServicioId, setSelectedServicioId] = useState<string>('')
  const [costo, setCosto] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newServicioDescripcion, setNewServicioDescripcion] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleAddServicio = () => {
    if (!selectedServicioId) {
      toast({
        title: 'Error',
        description: 'Selecciona un servicio',
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

    const servicio = serviciosSimplificados.find((s) => s.id === selectedServicioId)
    if (!servicio) return

    // Verificar si ya existe este servicio
    const existeServicio = value.some((s) => s.descripcion === servicio.descripcion)
    if (existeServicio) {
      toast({
        title: 'Advertencia',
        description: 'Este servicio ya está agregado',
        variant: 'destructive',
      })
      return
    }

    const newServicio: ServicioOfertaItem = {
      descripcion: servicio.descripcion,
      costo: costoNumerico,
    }

    onChange([...value, newServicio])
    setSelectedServicioId('')
    setCosto('')
  }

  const handleRemoveServicio = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleCreateServicio = async () => {
    if (!newServicioDescripcion.trim()) {
      toast({
        title: 'Error',
        description: 'La descripción del servicio es requerida',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const success = await createServicio({
        descripcion: newServicioDescripcion.trim(),
        is_active: true,
      })

      if (success) {
        toast({
          title: 'Éxito',
          description: 'Servicio creado exitosamente',
        })
        setIsCreateDialogOpen(false)
        setNewServicioDescripcion('')
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear el servicio',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating servicio:', error)
      toast({
        title: 'Error',
        description: 'Error al crear el servicio',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      {/* Formulario para agregar servicio */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Select
            value={selectedServicioId}
            onValueChange={setSelectedServicioId}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loading ? 'Cargando...' : 'Selecciona un servicio'}
              />
            </SelectTrigger>
            <SelectContent>
              {serviciosSimplificados.map((servicio) => (
                <SelectItem key={servicio.id} value={servicio.id}>
                  {servicio.descripcion}
                </SelectItem>
              ))}
              {serviciosSimplificados.length === 0 && !loading && (
                <SelectItem value="no-servicios" disabled>
                  No hay servicios disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="number"
          placeholder="Costo"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          className="w-32"
          min="0"
          step="0.01"
        />
        <Button type="button" onClick={handleAddServicio} size="icon" variant="default">
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCreateDialogOpen(true)}
          title="Crear nuevo servicio"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de servicios agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
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

      {/* Dialog para crear nuevo servicio */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="servicio-descripcion">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Input
                id="servicio-descripcion"
                value={newServicioDescripcion}
                onChange={(e) => setNewServicioDescripcion(e.target.value)}
                placeholder="Ej: Instalación de paneles solares"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                El costo se define por oferta, no aquí
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateServicio} disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Servicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
