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
import { useToast } from '@/hooks/use-toast'
import type { UtilItem } from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'
import type { Material } from '@/lib/material-types'

interface UtilesFieldProps {
  value: UtilItem[]
  onChange: (value: UtilItem[]) => void
  label?: string
}

export function UtilesField({
  value,
  onChange,
  label = 'Útiles y Materiales',
}: UtilesFieldProps) {
  const { toast } = useToast()
  const [categorias, setCategories] = useState<{ id: string; categoria: string }[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<string>('')
  const [selectedMaterialCodigo, setSelectedMaterialCodigo] = useState<string>('')
  const [cantidad, setCantidad] = useState<string>('')
  const [descripcionManual, setDescripcionManual] = useState<string>('')

  // Cargar categorías al montar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await MaterialService.getCategories()
        // Filtrar categorías de equipos (Inversor, Batería, Panel)
        const categoriasUtiles = data.filter(
          (c) =>
            c.categoria !== 'Inversor' &&
            c.categoria !== 'Batería' &&
            c.categoria !== 'Panel'
        )
        setCategories(categoriasUtiles)
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }
    loadCategories()
  }, [])

  // Cargar materiales cuando se selecciona una categoría
  useEffect(() => {
    if (!selectedCategoria) {
      setMateriales([])
      return
    }

    const loadMateriales = async () => {
      setLoading(true)
      try {
        const data = await MaterialService.getMaterialsByCategory(selectedCategoria)
        setMateriales(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error loading materiales:', error)
        setMateriales([])
      } finally {
        setLoading(false)
      }
    }
    loadMateriales()
  }, [selectedCategoria])

  const handleAddUtil = () => {
    const cantidadNum = parseInt(cantidad)

    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa una cantidad válida',
        variant: 'destructive',
      })
      return
    }

    // Obtener descripción: priorizar material seleccionado, luego manual
    let descripcion = descripcionManual.trim()
    if (selectedMaterialCodigo) {
      const material = materiales.find((m) => m.codigo === selectedMaterialCodigo)
      if (material) {
        descripcion = material.descripcion
      }
    }

    if (!descripcion) {
      toast({
        title: 'Error',
        description: 'Selecciona un material o ingresa una descripción',
        variant: 'destructive',
      })
      return
    }

    const newUtil: UtilItem = {
      cantidad: cantidadNum,
      descripcion: descripcion,
    }

    onChange([...value, newUtil])

    // Limpiar formulario
    setSelectedCategoria('')
    setSelectedMaterialCodigo('')
    setCantidad('')
    setDescripcionManual('')
  }

  const handleRemoveUtil = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">{label}</Label>

      {/* Formulario para agregar útil */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Selector de categoría */}
          <div>
            <Label>Categoría</Label>
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.categoria}>
                    {cat.categoria}
                  </SelectItem>
                ))}
                {categorias.length === 0 && (
                  <SelectItem value="no-cats" disabled>
                    No hay categorías disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de material */}
          <div>
            <Label>Material</Label>
            <Select
              value={selectedMaterialCodigo}
              onValueChange={setSelectedMaterialCodigo}
              disabled={!selectedCategoria || loading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedCategoria
                      ? 'Primero selecciona categoría'
                      : loading
                        ? 'Cargando...'
                        : 'Selecciona material'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {materiales.map((material) => (
                  <SelectItem key={material.codigo} value={material.codigo}>
                    {material.descripcion} ({material.codigo})
                  </SelectItem>
                ))}
                {materiales.length === 0 && !loading && selectedCategoria && (
                  <SelectItem value="no-materials" disabled>
                    No hay materiales en esta categoría
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción manual (alternativa al selector) */}
          <div className="col-span-2">
            <Label>O ingresa descripción manualmente</Label>
            <Input
              placeholder="Ej: Metros de cable solar 6mm"
              value={descripcionManual}
              onChange={(e) => setDescripcionManual(e.target.value)}
              disabled={!!selectedMaterialCodigo}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usa esto si el material no está en el catálogo
            </p>
          </div>

          {/* Cantidad */}
          <div className="col-span-2">
            <Label>
              Cantidad <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              placeholder="Ej: 100"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="1"
            />
          </div>
        </div>

        <Button type="button" onClick={handleAddUtil} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Útil/Material
        </Button>
      </Card>

      {/* Lista de útiles agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Útiles agregados ({value.length})
          </Label>
          {value.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.descripcion}</p>
                  <p className="text-xs text-muted-foreground">Cantidad: {item.cantidad}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveUtil(index)}
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
        <p className="text-sm text-muted-foreground">No se han agregado útiles</p>
      )}
    </div>
  )
}
