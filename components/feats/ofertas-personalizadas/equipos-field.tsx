"use client"

import { useState, useEffect } from 'react'
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
import { Card } from '@/components/shared/molecule/card'
import { MaterialService } from '@/lib/services/feats/materials/material-service'
import { MarcaSelectorField } from './marca-selector-field'
import { useToast } from '@/hooks/use-toast'
import type {
  InversorItem,
  BateriaItem,
  PanelItem,
} from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'
import type { Material } from '@/lib/material-types'

type EquipoType = 'inversor' | 'bateria' | 'panel'

interface EquiposFieldProps {
  type: EquipoType
  value: (InversorItem | BateriaItem | PanelItem)[]
  onChange: (value: (InversorItem | BateriaItem | PanelItem)[]) => void
  label: string
}

export function EquiposField({ type, value, onChange, label }: EquiposFieldProps) {
  const { toast } = useToast()
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMaterialCodigo, setSelectedMaterialCodigo] = useState<string>('')
  const [cantidad, setCantidad] = useState<string>('')
  const [potencia, setPotencia] = useState<string>('')
  const [marca, setMarca] = useState<string>('')
  const [codigoEquipo, setCodigoEquipo] = useState<string>('')

  // Mapear tipo a categoría
  const getCategoriaByType = (t: EquipoType): string => {
    if (t === 'inversor') return 'Inversor'
    if (t === 'bateria') return 'Batería'
    return 'Panel'
  }

  // Cargar materiales de la categoría correspondiente
  useEffect(() => {
    const loadMateriales = async () => {
      setLoading(true)
      try {
        const categoria = getCategoriaByType(type)
        const data = await MaterialService.getMaterialsByCategory(categoria)
        setMateriales(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading materiales:', error)
        setMateriales([])
      } finally {
        setLoading(false)
      }
    }
    loadMateriales()
  }, [type])

  const handleAddEquipo = () => {
    const cantidadNum = parseInt(cantidad)
    const potenciaNum = parseFloat(potencia)

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa una cantidad válida',
        variant: 'destructive',
      })
      return
    }

    if (isNaN(potenciaNum) || potenciaNum <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa una potencia válida',
        variant: 'destructive',
      })
      return
    }

    if (!marca.trim()) {
      toast({
        title: 'Error',
        description: 'Selecciona o crea una marca',
        variant: 'destructive',
      })
      return
    }

    // Obtener descripción del material seleccionado
    let descripcion = ''
    if (selectedMaterialCodigo) {
      const material = materiales.find((m) => m.codigo === selectedMaterialCodigo)
      descripcion = material?.descripcion || ''
    }

    const newItem: InversorItem | BateriaItem | PanelItem = {
      cantidad: cantidadNum,
      potencia: potenciaNum,
      marca: marca.trim(),
      descripcion: descripcion,
      ...(type === 'inversor' && codigoEquipo.trim() && { codigo_equipo: codigoEquipo.trim() }),
    }

    onChange([...value, newItem])

    // Limpiar formulario
    setSelectedMaterialCodigo('')
    setCantidad('')
    setPotencia('')
    setMarca('')
    setCodigoEquipo('')
  }

  const handleRemoveEquipo = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">{label}</Label>

      {/* Formulario para agregar equipo */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Selector de material */}
          <div className="col-span-2">
            <Label>Material de la categoría</Label>
            <Select
              value={selectedMaterialCodigo}
              onValueChange={setSelectedMaterialCodigo}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading
                      ? 'Cargando materiales...'
                      : 'Selecciona un material (opcional)'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {materiales.map((material) => (
                  <SelectItem key={material.codigo} value={material.codigo}>
                    {material.descripcion} ({material.codigo})
                  </SelectItem>
                ))}
                {materiales.length === 0 && !loading && (
                  <SelectItem value="no-materiales" disabled>
                    No hay materiales en esta categoría
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad */}
          <div>
            <Label>
              Cantidad <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Ej: 2"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="1"
            />
          </div>

          {/* Potencia */}
          <div>
            <Label>
              Potencia (W) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Ej: 5000"
              value={potencia}
              onChange={(e) => setPotencia(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Marca */}
          <div className="col-span-2">
            <MarcaSelectorField
              value={marca}
              onChange={setMarca}
              label="Marca"
              placeholder="Selecciona o crea una marca"
            />
          </div>

          {/* Código de equipo (solo para inversores) */}
          {type === 'inversor' && (
            <div className="col-span-2">
              <Label>Código de Equipo (opcional)</Label>
              <Input
                placeholder="Ej: SUN2000-5KTL-M1"
                value={codigoEquipo}
                onChange={(e) => setCodigoEquipo(e.target.value)}
              />
            </div>
          )}
        </div>

        <Button type="button" onClick={handleAddEquipo} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar {label}
        </Button>
      </Card>

      {/* Lista de equipos agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {label} agregados ({value.length})
          </Label>
          {value.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm">
                    {item.descripcion || 'Sin descripción'} - {item.marca}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Cantidad: {item.cantidad} | Potencia: {item.potencia}W
                    </p>
                    {'codigo_equipo' in item && item.codigo_equipo && (
                      <p>Código: {item.codigo_equipo}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveEquipo(index)}
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
        <p className="text-sm text-muted-foreground">
          No se han agregado {label.toLowerCase()}
        </p>
      )}
    </div>
  )
}
