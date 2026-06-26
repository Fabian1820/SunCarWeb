"use client"

import { useState, useEffect } from "react"
import { LogIn, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { TrabajadorService } from "@/lib/api-services"
import type { Trabajador } from "@/lib/types/feats/brigade/brigade-types"

interface MarcarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarcar: (ci: string, comentarios?: string) => Promise<{ ok: boolean; tipo?: string; message?: string }>
}

export function MarcarDialog({ open, onOpenChange, onMarcar }: MarcarDialogProps) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [ciSeleccionado, setCiSeleccionado] = useState("")
  const [comentarios, setComentarios] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [resultado, setResultado] = useState<{ tipo: string; message: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingWorkers(true)
    TrabajadorService.getAllTrabajadores()
      .then((data) => setTrabajadores(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingWorkers(false))
  }, [open])

  const handleClose = () => {
    setCiSeleccionado("")
    setComentarios("")
    setResultado(null)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!ciSeleccionado) return
    setLoading(true)
    try {
      const res = await onMarcar(ciSeleccionado, comentarios || undefined)
      if (res.ok) {
        setResultado({ tipo: res.tipo ?? "entrada", message: res.message ?? "Marcaje registrado" })
        setCiSeleccionado("")
        setComentarios("")
      } else {
        setResultado({ tipo: "error", message: res.message ?? "Error al marcar" })
      }
    } finally {
      setLoading(false)
    }
  }

  const opciones = trabajadores.map((t) => ({
    value: t.CI,
    label: `${t.nombre} (${t.CI})`,
  }))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar asistencia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {resultado && (
            <div className={`rounded-md px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              resultado.tipo === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : resultado.tipo === "entrada"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {resultado.tipo === "entrada" ? <LogIn className="h-4 w-4" /> : resultado.tipo === "salida" ? <LogOut className="h-4 w-4" /> : null}
              {resultado.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Trabajador</Label>
            {loadingWorkers ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando trabajadores...
              </div>
            ) : (
              <SearchableSelect
                options={opciones}
                value={ciSeleccionado}
                onValueChange={setCiSeleccionado}
                placeholder="Buscar trabajador..."
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Comentario <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <Textarea
              placeholder="Ej: llegó tarde por tráfico..."
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cerrar
            </Button>
            <Button onClick={handleSubmit} disabled={!ciSeleccionado || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Marcar entrada / salida
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
