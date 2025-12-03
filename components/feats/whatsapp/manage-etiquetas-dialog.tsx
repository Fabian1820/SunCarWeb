"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Plus, X, Check } from "lucide-react"
import type { Chat, Etiqueta } from "@/lib/types/feats/whatsapp/whatsapp-types"
import { useToast } from "@/hooks/use-toast"

interface ManageEtiquetasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chat: Chat | null
  todasLasEtiquetas: Etiqueta[]
  onActualizarEtiquetas: (chatId: string, etiquetas: Etiqueta[]) => void
  onCrearEtiqueta: (nombre: string, color: string) => void
}

const COLORES_PREDEFINIDOS = [
  { nombre: 'Verde', valor: '#10b981' },
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Rojo', valor: '#ef4444' },
  { nombre: 'Amarillo', valor: '#f59e0b' },
  { nombre: 'Morado', valor: '#8b5cf6' },
  { nombre: 'Cyan', valor: '#06b6d4' },
  { nombre: 'Rosa', valor: '#ec4899' },
  { nombre: 'Verde Claro', valor: '#22c55e' },
  { nombre: 'Índigo', valor: '#6366f1' },
  { nombre: 'Naranja', valor: '#f97316' },
]

export function ManageEtiquetasDialog({
  open,
  onOpenChange,
  chat,
  todasLasEtiquetas,
  onActualizarEtiquetas,
  onCrearEtiqueta,
}: ManageEtiquetasDialogProps) {
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<Etiqueta[]>(
    chat?.etiquetas || []
  )
  const [mostrarCrearNueva, setMostrarCrearNueva] = useState(false)
  const [nuevaEtiquetaNombre, setNuevaEtiquetaNombre] = useState("")
  const [nuevaEtiquetaColor, setNuevaEtiquetaColor] = useState(COLORES_PREDEFINIDOS[0].valor)
  const { toast } = useToast()

  // Actualizar etiquetas seleccionadas cuando cambia el chat
  useState(() => {
    if (chat) {
      setEtiquetasSeleccionadas(chat.etiquetas)
    }
  })

  const toggleEtiqueta = (etiqueta: Etiqueta) => {
    const yaSeleccionada = etiquetasSeleccionadas.some(e => e.id === etiqueta.id)

    if (yaSeleccionada) {
      setEtiquetasSeleccionadas(etiquetasSeleccionadas.filter(e => e.id !== etiqueta.id))
    } else {
      setEtiquetasSeleccionadas([...etiquetasSeleccionadas, etiqueta])
    }
  }

  const handleCrearEtiqueta = () => {
    if (!nuevaEtiquetaNombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la etiqueta no puede estar vacío",
        variant: "destructive",
      })
      return
    }

    onCrearEtiqueta(nuevaEtiquetaNombre.trim(), nuevaEtiquetaColor)

    toast({
      title: "Éxito",
      description: "Etiqueta creada correctamente",
    })

    setNuevaEtiquetaNombre("")
    setNuevaEtiquetaColor(COLORES_PREDEFINIDOS[0].valor)
    setMostrarCrearNueva(false)
  }

  const handleGuardar = () => {
    if (chat) {
      onActualizarEtiquetas(chat.id, etiquetasSeleccionadas)
      toast({
        title: "Éxito",
        description: "Etiquetas actualizadas correctamente",
      })
      onOpenChange(false)
    }
  }

  if (!chat) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar Etiquetas - {chat.contactoNombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Etiquetas seleccionadas */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Etiquetas actuales ({etiquetasSeleccionadas.length})
            </Label>
            {etiquetasSeleccionadas.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                {etiquetasSeleccionadas.map((etiqueta) => (
                  <Badge
                    key={etiqueta.id}
                    variant="secondary"
                    className="text-sm px-3 py-1.5 cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: `${etiqueta.color}25`,
                      color: etiqueta.color,
                      borderColor: etiqueta.color,
                    }}
                    onClick={() => toggleEtiqueta(etiqueta)}
                  >
                    {etiqueta.nombre}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                No hay etiquetas seleccionadas
              </p>
            )}
          </div>

          {/* Lista de etiquetas disponibles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">
                Etiquetas disponibles
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarCrearNueva(!mostrarCrearNueva)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva etiqueta
              </Button>
            </div>

            {/* Formulario para crear nueva etiqueta */}
            {mostrarCrearNueva && (
              <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">Nombre de la etiqueta</Label>
                  <Input
                    type="text"
                    placeholder="Ej: Cliente VIP"
                    value={nuevaEtiquetaNombre}
                    onChange={(e) => setNuevaEtiquetaNombre(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Color</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLORES_PREDEFINIDOS.map((color) => (
                      <button
                        key={color.valor}
                        type="button"
                        onClick={() => setNuevaEtiquetaColor(color.valor)}
                        className={`h-10 rounded-md border-2 transition-all ${
                          nuevaEtiquetaColor === color.valor
                            ? 'border-gray-900 scale-105'
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.valor }}
                        title={color.nombre}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCrearEtiqueta}
                    size="sm"
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Crear etiqueta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarCrearNueva(false)
                      setNuevaEtiquetaNombre("")
                      setNuevaEtiquetaColor(COLORES_PREDEFINIDOS[0].valor)
                    }}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Grid de etiquetas disponibles */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {todasLasEtiquetas.map((etiqueta) => {
                const yaSeleccionada = etiquetasSeleccionadas.some(e => e.id === etiqueta.id)

                return (
                  <button
                    key={etiqueta.id}
                    onClick={() => toggleEtiqueta(etiqueta)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      yaSeleccionada
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: etiqueta.color }}
                    />
                    <span className="text-sm font-medium text-gray-900 truncate flex-1 text-left">
                      {etiqueta.nombre}
                    </span>
                    {yaSeleccionada && (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} className="bg-green-500 hover:bg-green-600">
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
