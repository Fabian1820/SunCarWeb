"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { FileUpload } from "@/components/shared/molecule/file-upload"
import { Loader2, Trash2 } from "lucide-react"
import type { MedioBasico, MedioBasicoCreateData, MedioBasicoUpdateData } from "@/lib/types/feats/asignaciones/asignacion-types"
import { AsignacionService } from "@/lib/api-services"

interface MedioBasicoDialogProps {
  open: boolean
  onClose: () => void
  medio?: MedioBasico | null
  onSave: (data: MedioBasicoCreateData | MedioBasicoUpdateData, id?: string) => Promise<boolean>
  loading?: boolean
}

export function MedioBasicoDialog({ open, onClose, medio, onSave, loading }: MedioBasicoDialogProps) {
  const isEdit = !!medio
  const [nombre, setNombre] = useState(medio?.nombre ?? "")
  const [precio, setPrecio] = useState(medio?.precio != null ? String(medio.precio) : "")
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(medio?.foto ?? null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    setNombre(medio?.nombre ?? "")
    setPrecio(medio?.precio != null ? String(medio.precio) : "")
    setFotoFile(null)
    setFotoUrl(medio?.foto ?? null)
    setEliminarFoto(false)
    setUploadError(null)
  }, [medio, open])

  const handleSave = async () => {
    setUploadError(null)

    // 1. Resolver URL final de foto
    let finalFotoUrl: string | null | undefined = fotoUrl
    if (eliminarFoto) {
      finalFotoUrl = null
    } else if (fotoFile) {
      try {
        setUploadingFoto(true)
        finalFotoUrl = await AsignacionService.uploadFotoMedioBasico(fotoFile)
        setFotoUrl(finalFotoUrl)
      } catch (err: any) {
        setUploadError(err?.message || "Error al subir la foto")
        return
      } finally {
        setUploadingFoto(false)
      }
    }

    const data = {
      nombre: nombre.trim() || undefined,
      precio: precio ? parseFloat(precio) : undefined,
      // Solo enviamos foto si el usuario la cambió/eliminó, no si quedó igual
      ...(fotoFile || eliminarFoto ? { foto: finalFotoUrl } : {}),
    }
    const ok = await onSave(data, medio?.id)
    if (ok) onClose()
  }

  const isBusy = loading || uploadingFoto

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Editar medio básico" : "Crear medio básico"}
            {isEdit && medio?.codigo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-100 text-emerald-700">
                {medio.codigo}
              </span>
            )}
          </DialogTitle>
          {!isEdit && (
            <p className="text-xs text-gray-500">
              El código se genera automáticamente (MB-XXXXXX) al crear el medio básico.
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              placeholder="Ej: Taladro Bosch 500W"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Precio (opcional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
            />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Foto (opcional)</Label>
              {isEdit && fotoUrl && !fotoFile && !eliminarFoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setEliminarFoto(true)}
                  disabled={isBusy}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Eliminar foto
                </Button>
              )}
              {eliminarFoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setEliminarFoto(false)}
                  disabled={isBusy}
                >
                  Cancelar eliminación
                </Button>
              )}
            </div>
            {eliminarFoto ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                La foto se eliminará al guardar.
              </div>
            ) : (
              <FileUpload
                id="medio-basico-foto"
                accept="image/*"
                value={fotoFile}
                onChange={file => setFotoFile(file)}
                maxSizeInMB={5}
                showPreview
                disabled={isBusy}
                currentImageUrl={!fotoFile ? (fotoUrl || undefined) : undefined}
              />
            )}
            {uploadingFoto && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Subiendo foto...</span>
              </div>
            )}
            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!nombre.trim() || isBusy}>
              {uploadingFoto ? "Subiendo..." : loading ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
