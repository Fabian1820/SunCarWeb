"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { cn } from "@/lib/utils"
import { Upload, Image as ImageIcon, X, FileImage, Clipboard } from "lucide-react"
import { toast } from "sonner"

interface FileUploadProps {
  id?: string
  label?: string
  accept?: string
  value?: File | null
  onChange: (file: File | null) => void
  className?: string
  disabled?: boolean
  maxSizeInMB?: number
  showPreview?: boolean
  currentImageUrl?: string
}

export function FileUpload({
  id = "file-upload",
  label = "Seleccionar archivo",
  accept = "image/*",
  value,
  onChange,
  className,
  disabled = false,
  maxSizeInMB = 10,
  showPreview = true,
  currentImageUrl
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPasteMode, setIsPasteMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    // Validar tipo de archivo
    if (accept && !file.type.match(accept.replace(/\*/g, ".*"))) {
      toast.error("Tipo de archivo no válido")
      return false
    }

    // Validar tamaño
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`El archivo es demasiado grande. Máximo ${maxSizeInMB}MB`)
      return false
    }

    return true
  }, [accept, maxSizeInMB])

  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      onChange(file)
      toast.success("Archivo seleccionado correctamente")
    }
  }, [validateFile, onChange])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return

    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    
    if (imageItem) {
      const file = imageItem.getAsFile()
      if (file) {
        handleFileSelect(file)
        setIsPasteMode(false)
      }
    }
  }

  const handleRemoveFile = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      
      <div
        ref={dropZoneRef}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragOver && "border-primary bg-primary/10",
          disabled && "opacity-50 cursor-not-allowed",
          value && "border-green-500 bg-green-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={handleClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center text-center space-y-3">
          {value ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <FileImage className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">{value.name}</p>
                <p className="text-xs text-green-600">{formatFileSize(value.size)}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveFile()
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            </>
          ) : (
            <>
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                isDragOver ? "bg-primary/20" : "bg-gray-100"
              )}>
                <Upload className={cn(
                  "w-6 h-6 transition-colors",
                  isDragOver ? "text-primary" : "text-gray-400"
                )} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  {isDragOver ? "Suelta el archivo aquí" : "Arrastra y suelta un archivo"}
                </p>
                <p className="text-xs text-gray-500">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400">
                  Máximo {maxSizeInMB}MB
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClick()
                  }}
                  disabled={disabled}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Seleccionar archivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPasteMode(!isPasteMode)
                  }}
                  disabled={disabled}
                  className={isPasteMode ? "bg-primary/10 border-primary" : ""}
                >
                  <Clipboard className="w-4 h-4 mr-1" />
                  Pegar
                </Button>
              </div>
            </>
          )}
        </div>

        {isPasteMode && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-primary border-dashed rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Clipboard className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-medium text-primary">Pega una imagen (Ctrl+V)</p>
              <p className="text-xs text-gray-500">Presiona Escape para cancelar</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview de imagen actual (solo en modo edición) */}
      {showPreview && currentImageUrl && !value && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
          <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border">
            <img
              src={currentImageUrl}
              alt="Imagen actual"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Preview de nueva imagen */}
      {showPreview && value && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
          <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-100 border">
            <img
              src={URL.createObjectURL(value)}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  )
}
