/**
 * File Upload Section Component
 * 
 * Maneja la subida y visualización de archivos multimedia
 * - Imágenes: vista previa nativa
 * - Videos: vista previa nativa
 * - Audios: grabación desde micrófono
 * - Documentos: vista genérica
 */

'use client'

import { useState, useRef } from 'react'
import { 
  Image, 
  Video, 
  Mic, 
  File as FileIcon, 
  X, 
  Upload,
  Play,
  Pause,
  Trash2,
  Download,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Card } from '@/components/shared/molecule/card'
import type { ArchivoTrabajo } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

interface FileUploadSectionProps {
  archivos: ArchivoTrabajo[]
  onUpload: (files: File[]) => Promise<void>
  onDelete: (archivoId: string) => Promise<void>
  disabled?: boolean
}

/**
 * Determina el tipo de archivo basado en MIME type
 */
function getFileType(mimeType: string): 'imagen' | 'video' | 'audio' | 'documento' {
  if (mimeType.startsWith('image/')) return 'imagen'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'documento'
}

export function FileUploadSection({
  archivos,
  onUpload,
  onDelete,
  disabled = false
}: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [lastUploadedCount, setLastUploadedCount] = useState(0)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  /**
   * Show success feedback
   */
  const showSuccessFeedback = (count: number) => {
    setLastUploadedCount(count)
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 3000)
  }

  /**
   * Handle file selection
   */
  const handleFileSelect = async (files: FileList | null, tipo: string) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setUploadSuccess(false)
    try {
      await onUpload(Array.from(files))
      showSuccessFeedback(files.length)
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setUploading(false)
    }
  }

  /**
   * Start audio recording
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
          type: 'audio/webm'
        })
        
        setUploading(true)
        setUploadSuccess(false)
        try {
          await onUpload([audioFile])
          showSuccessFeedback(1)
        } catch (error) {
          console.error('Error uploading audio:', error)
        } finally {
          setUploading(false)
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('No se pudo acceder al micrófono. Verifica los permisos.')
    }
  }

  /**
   * Stop audio recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  /**
   * Render file preview based on type
   */
  const renderFilePreview = (archivo: ArchivoTrabajo) => {
    switch (archivo.tipo) {
      case 'imagen':
        return (
          <div className="relative group">
            <img
              src={archivo.url}
              alt={archivo.nombre}
              className="w-full h-32 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-white hover:bg-white/20"
                onClick={() => window.open(archivo.url, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-white hover:bg-red-500/80"
                onClick={() => onDelete(archivo.id)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1 truncate">{archivo.nombre}</p>
          </div>
        )

      case 'video':
        return (
          <div className="relative group">
            <video
              src={archivo.url}
              className="w-full h-32 object-cover rounded-lg"
              controls
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="bg-white/80 hover:bg-white"
                onClick={() => window.open(archivo.url, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="bg-white/80 hover:bg-red-500 hover:text-white"
                onClick={() => onDelete(archivo.id)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1 truncate">{archivo.nombre}</p>
          </div>
        )

      case 'audio':
        return (
          <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-full">
                <Mic className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-700">{archivo.nombre}</p>
                <audio src={archivo.url} controls className="w-full mt-2 h-8" />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(archivo.id)}
                disabled={disabled}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        )

      case 'documento':
      default:
        return (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <FileIcon className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{archivo.nombre}</p>
                {archivo.tamano && (
                  <p className="text-xs text-gray-500">
                    {(archivo.tamano / 1024).toFixed(2)} KB
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(archivo.url, '_blank')}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(archivo.id)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Images */}
        <Button
          type="button"
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Image className="h-5 w-5 text-green-600" />
          <span className="text-xs">Imágenes</span>
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'imagen')}
        />

        {/* Videos */}
        <Button
          type="button"
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => videoInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Video className="h-5 w-5 text-purple-600" />
          <span className="text-xs">Videos</span>
        </Button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'video')}
        />

        {/* Audio Recording */}
        <Button
          type="button"
          variant="outline"
          className={`flex flex-col items-center gap-2 h-auto py-3 ${
            recording ? 'bg-red-50 border-red-300' : ''
          }`}
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled || uploading}
        >
          <Mic className={`h-5 w-5 ${recording ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
          <span className="text-xs">{recording ? 'Detener' : 'Grabar'}</span>
        </Button>

        {/* Documents */}
        <Button
          type="button"
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-3"
          onClick={() => documentInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <FileIcon className="h-5 w-5 text-blue-600" />
          <span className="text-xs">Archivos</span>
        </Button>
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'documento')}
        />
      </div>

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center justify-center gap-2 py-2 bg-red-50 rounded-lg border border-red-200">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-600 font-medium">Grabando audio...</span>
        </div>
      )}

      {/* Upload Status */}
      {uploading && (
        <div className="flex items-center justify-center gap-2 py-3 bg-orange-50 rounded-lg border border-orange-200">
          <Upload className="h-4 w-4 text-orange-600 animate-bounce" />
          <span className="text-sm text-orange-600 font-medium">Subiendo archivos...</span>
        </div>
      )}

      {/* Success Feedback */}
      {uploadSuccess && !uploading && (
        <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg border border-green-200 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">
            {lastUploadedCount === 1 
              ? '¡Archivo subido correctamente!' 
              : `¡${lastUploadedCount} archivos subidos correctamente!`}
          </span>
        </div>
      )}

      {/* Files Grid */}
      {archivos && archivos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Archivos adjuntos ({archivos.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivos.map((archivo) => (
              <div key={archivo.id}>
                {renderFilePreview(archivo)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!archivos || archivos.length === 0) && !uploading && !uploadSuccess && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No hay archivos adjuntos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Usa los botones de arriba para agregar archivos
          </p>
        </div>
      )}
    </div>
  )
}

export { getFileType }
