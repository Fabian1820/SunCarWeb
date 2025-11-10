"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
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
import { useMarcas } from '@/hooks/use-marcas'
import { useToast } from '@/hooks/use-toast'

interface MarcaSelectorFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function MarcaSelectorField({
  value,
  onChange,
  label = 'Marca',
  placeholder = 'Selecciona una marca',
}: MarcaSelectorFieldProps) {
  const { marcasSimplificadas, loading, createMarca } = useMarcas()
  const { toast } = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newMarcaNombre, setNewMarcaNombre] = useState('')
  const [newMarcaDescripcion, setNewMarcaDescripcion] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateMarca = async () => {
    if (!newMarcaNombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la marca es requerido',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const success = await createMarca({
        nombre: newMarcaNombre.trim(),
        descripcion: newMarcaDescripcion.trim() || undefined,
        is_active: true,
      })

      if (success) {
        toast({
          title: 'Éxito',
          description: 'Marca creada exitosamente',
        })
        // Seleccionar la marca recién creada
        onChange(newMarcaNombre.trim())
        setIsCreateDialogOpen(false)
        setNewMarcaNombre('')
        setNewMarcaDescripcion('')
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear la marca',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating marca:', error)
      toast({
        title: 'Error',
        description: 'Error al crear la marca',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={loading}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {marcasSimplificadas.map((marca) => (
              <SelectItem key={marca.id} value={marca.nombre}>
                {marca.nombre}
              </SelectItem>
            ))}
            {marcasSimplificadas.length === 0 && !loading && (
              <SelectItem value="no-marcas" disabled>
                No hay marcas disponibles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCreateDialogOpen(true)}
          title="Crear nueva marca"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialog para crear nueva marca */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Marca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="marca-nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="marca-nombre"
                value={newMarcaNombre}
                onChange={(e) => setNewMarcaNombre(e.target.value)}
                placeholder="Ej: Canadian Solar"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="marca-descripcion">Descripción (opcional)</Label>
              <Input
                id="marca-descripcion"
                value={newMarcaDescripcion}
                onChange={(e) => setNewMarcaDescripcion(e.target.value)}
                placeholder="Ej: Fabricante de paneles solares"
                disabled={isCreating}
              />
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
            <Button onClick={handleCreateMarca} disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Marca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
