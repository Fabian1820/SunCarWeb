import { useState } from 'react'
import { UploadFotoService } from '@/lib/services/feats/materials/upload-foto-service'

interface UseUploadFotoReturn {
  uploadFoto: (file: File) => Promise<string>
  uploading: boolean
  error: string | null
  progress: number
  reset: () => void
}

export function useUploadFoto(): UseUploadFotoReturn {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const uploadFoto = async (file: File): Promise<string> => {
    if (!file) {
      throw new Error('No se proporcionó archivo')
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // Simular progreso (ya que apiRequest no soporta onUploadProgress directamente)
      setProgress(30)
      
      const url = await UploadFotoService.uploadFoto(file)
      
      setProgress(100)
      return url
    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir la foto'
      setError(errorMessage)
      console.warn('[useUploadFoto] Error al subir foto (puede ser normal en desarrollo):', errorMessage)
      throw new Error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => {
    setUploading(false)
    setError(null)
    setProgress(0)
  }

  return {
    uploadFoto,
    uploading,
    error,
    progress,
    reset,
  }
}
