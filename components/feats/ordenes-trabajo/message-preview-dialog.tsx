"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Copy, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MessagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
  title?: string
}

export function MessagePreviewDialog({
  open,
  onOpenChange,
  message,
  title = "Mensaje de Orden de Trabajo",
}: MessagePreviewDialogProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "El mensaje ha sido copiado al portapapeles",
      })

      // Resetear el estado de "copiado" después de 2 segundos
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Error al copiar:', error)
      toast({
        title: "Error",
        description: "No se pudo copiar el mensaje",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:w-[800px] h-[600px] max-w-[95vw] sm:max-w-[800px] max-h-[90vh] sm:max-h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-6 py-4">
          {/* Vista previa del mensaje - scrolleable */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex-1 overflow-y-auto min-h-0">
            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 leading-relaxed">
              {message}
            </pre>
          </div>

          {/* Botones e información fijos abajo */}
          <div className="flex-shrink-0 space-y-3 pt-4">
            {/* Botón de copiar */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handleCopyToClipboard}
                className={`${
                  copied
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                } text-white transition-all duration-200`}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar al Portapapeles
                  </>
                )}
              </Button>
            </div>

            {/* Información adicional */}
            <div className="text-xs text-gray-500 text-center">
              Este mensaje se puede compartir por WhatsApp, Telegram o cualquier otra plataforma de mensajería.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
