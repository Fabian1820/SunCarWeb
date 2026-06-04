"use client"

import { useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shared/atom/avatar"
import { Button } from "@/components/shared/atom/button"
import { useToast } from "@/hooks/use-toast"
import { TrabajadorService } from "@/lib/api-services"
import { Camera, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

function initials(nombre?: string): string {
  if (!nombre) return "?"
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface WorkerAvatarProps {
  src?: string | null
  nombre?: string
  className?: string
  fallbackClassName?: string
}

export function WorkerAvatar({ src, nombre, className, fallbackClassName }: WorkerAvatarProps) {
  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {src ? <AvatarImage src={src} alt={nombre || "Avatar"} className="object-cover" /> : null}
      <AvatarFallback className={cn("bg-emerald-100 text-sm font-semibold text-emerald-700", fallbackClassName)}>
        {initials(nombre)}
      </AvatarFallback>
    </Avatar>
  )
}

interface WorkerAvatarUploaderProps {
  ci: string
  fotoPerfil?: string | null
  nombre?: string
  onChange?: (fotoPerfil: string | null) => void
  size?: "md" | "lg"
}

export function WorkerAvatarUploader({
  ci,
  fotoPerfil,
  nombre,
  onChange,
  size = "lg",
}: WorkerAvatarUploaderProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const busy = uploading || deleting
  const avatarSize = size === "lg" ? "h-24 w-24" : "h-16 w-16"
  const fallbackText = size === "lg" ? "text-2xl" : "text-lg"

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen.", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "El máximo permitido es 5 MB.", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const url = await TrabajadorService.subirFotoTrabajador(ci, file)
      onChange?.(url)
      toast({ title: "Foto actualizada", description: "La foto de perfil se subió correctamente." })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo subir la foto.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await TrabajadorService.eliminarFotoTrabajador(ci)
      onChange?.(null)
      toast({ title: "Foto eliminada", description: "Se eliminó la foto de perfil." })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la foto.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <WorkerAvatar
          src={fotoPerfil}
          nombre={nombre}
          className={avatarSize}
          fallbackClassName={fallbackText}
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          <Camera className="mr-2 h-4 w-4" />
          {fotoPerfil ? "Cambiar" : "Subir foto"}
        </Button>
        {fotoPerfil && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={busy}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Quitar
          </Button>
        )}
      </div>
    </div>
  )
}
