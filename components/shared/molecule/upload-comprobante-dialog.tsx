"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Loader2, UploadCloud } from "lucide-react"

interface UploadComprobanteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityLabel: string
  defaultMetodoPago?: string
  defaultMoneda?: string
  title?: string
  description?: string
  onSubmit: (payload: { file: File; metodo_pago?: string; moneda?: string }) => Promise<void>
}

export function UploadComprobanteDialog({
  open,
  onOpenChange,
  entityLabel,
  defaultMetodoPago,
  defaultMoneda,
  title = "Subir comprobante de pago",
  description = "Selecciona el archivo del comprobante y añade los datos opcionales de pago.",
  onSubmit,
}: UploadComprobanteDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [metodoPago, setMetodoPago] = useState(defaultMetodoPago || "")
  const [moneda, setMoneda] = useState(defaultMoneda || "")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedFile(null)
      setMetodoPago(defaultMetodoPago || "")
      setMoneda(defaultMoneda || "")
      setError(null)
    }
  }, [open, defaultMetodoPago, defaultMoneda])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      setError("Selecciona un archivo para continuar")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        file: selectedFile,
        metodo_pago: metodoPago.trim() ? metodoPago.trim() : undefined,
        moneda: moneda.trim() ? moneda.trim() : undefined,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo subir el comprobante"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="comprobante-file">Comprobante para {entityLabel}</Label>
            <Input
              id="comprobante-file"
              type="file"
              accept="*/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setSelectedFile(file ?? null)
              }}
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 truncate">
                Archivo seleccionado: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Se aceptan todos los formatos. El archivo se descargará posteriormente en lugar de visualizarse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="metodo_pago">Método de pago (opcional)</Label>
              <Input
                id="metodo_pago"
                placeholder="Transferencia, efectivo..."
                value={metodoPago}
                onChange={(event) => setMetodoPago(event.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="moneda">Moneda (opcional)</Label>
              <Input
                id="moneda"
                placeholder="USD, CUP, MLC..."
                value={moneda}
                onChange={(event) => setMoneda(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Subir comprobante
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
