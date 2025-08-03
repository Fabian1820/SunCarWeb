"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Separator } from "@/components/shared/molecule/separator"
import { Avatar, AvatarFallback } from "@/components/shared/atom/avatar"
import { 
  MessageCircle, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  Clock, 
  User, 
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Calendar,
  Edit,
  Save,
  X
} from "lucide-react"
import type { MensajeCliente } from "@/lib/api-types"
import { formatDistanceToNow, format } from "date-fns"
import { es } from "date-fns/locale"

interface MessageDetailProps {
  mensaje: MensajeCliente | null
  loading: boolean
  onUpdateStatus: (estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado') => Promise<void>
  onUpdatePriority: (prioridad: 'baja' | 'media' | 'alta' | 'urgente') => Promise<void>
  onSendResponse: (contenido: string, esPublica: boolean) => Promise<void>
  currentUser?: { ci: string; nombre: string }
}

export default function MessageDetail({ 
  mensaje, 
  loading, 
  onUpdateStatus, 
  onUpdatePriority, 
  onSendResponse,
  currentUser = { ci: "12345678", nombre: "Administrador" }
}: MessageDetailProps) {
  const [respuesta, setRespuesta] = useState("")
  const [esPublica, setEsPublica] = useState(true)
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)
  const [editandoEstado, setEditandoEstado] = useState(false)
  const [editandoPrioridad, setEditandoPrioridad] = useState(false)

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'queja':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'consulta':
        return <HelpCircle className="h-5 w-5 text-blue-500" />
      case 'sugerencia':
        return <MessageCircle className="h-5 w-5 text-green-500" />
      case 'reclamo':
        return <FileText className="h-5 w-5 text-orange-500" />
      default:
        return <MessageCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'nuevo':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'en_proceso':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'respondido':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cerrado':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getTipoLabel = (tipo: string) => {
    const tipos = {
      queja: 'Queja',
      consulta: 'Consulta',
      sugerencia: 'Sugerencia',
      reclamo: 'Reclamo'
    }
    return tipos[tipo as keyof typeof tipos] || tipo
  }

  const getEstadoLabel = (estado: string) => {
    const estados = {
      nuevo: 'Nuevo',
      en_proceso: 'En Proceso',
      respondido: 'Respondido',
      cerrado: 'Cerrado'
    }
    return estados[estado as keyof typeof estados] || estado
  }

  const getPrioridadColor = (prioridad: string) => {
    const colores = {
      baja: 'bg-gray-100 text-gray-800 border-gray-200',
      media: 'bg-blue-100 text-blue-800 border-blue-200',
      alta: 'bg-orange-100 text-orange-800 border-orange-200',
      urgente: 'bg-red-100 text-red-800 border-red-200'
    }
    return colores[prioridad as keyof typeof colores] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPrioridadLabel = (prioridad: string) => {
    const prioridades = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
      urgente: 'Urgente'
    }
    return prioridades[prioridad as keyof typeof prioridades] || prioridad
  }

  const handleSendResponse = async () => {
    if (!respuesta.trim() || !mensaje) return
    
    setEnviandoRespuesta(true)
    try {
      await onSendResponse(respuesta, esPublica)
      setRespuesta("")
    } catch (error) {
      console.error('Error enviando respuesta:', error)
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  const handleUpdateStatus = async (nuevoEstado: string) => {
    try {
      await onUpdateStatus(nuevoEstado as any)
      setEditandoEstado(false)
    } catch (error) {
      console.error('Error actualizando estado:', error)
    }
  }

  const handleUpdatePriority = async (nuevaPrioridad: string) => {
    try {
      await onUpdatePriority(nuevaPrioridad as any)
      setEditandoPrioridad(false)
    } catch (error) {
      console.error('Error actualizando prioridad:', error)
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-gray-500">Cargando mensaje...</div>
        </CardContent>
      </Card>
    )
  }

  if (!mensaje) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center">Selecciona un mensaje para ver los detalles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getTipoIcon(mensaje.tipo)}
            <div>
              <CardTitle className="text-xl mb-1">{mensaje.asunto}</CardTitle>
              <p className="text-sm text-gray-600">
                {getTipoLabel(mensaje.tipo)} • #{mensaje._id.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {editandoEstado ? (
              <div className="flex items-center gap-1">
                <Select onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={getEstadoLabel(mensaje.estado)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="respondido">Respondido</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditandoEstado(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getEstadoIcon(mensaje.estado)}
                  {getEstadoLabel(mensaje.estado)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditandoEstado(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}

            {editandoPrioridad ? (
              <div className="flex items-center gap-1">
                <Select onValueChange={handleUpdatePriority}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder={getPrioridadLabel(mensaje.prioridad)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditandoPrioridad(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={getPrioridadColor(mensaje.prioridad)}>
                  {getPrioridadLabel(mensaje.prioridad)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditandoPrioridad(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Información del Cliente</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span>{mensaje.cliente_nombre}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Número:</span>
                <span>{mensaje.cliente_numero}</span>
              </div>
              {mensaje.cliente_telefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{mensaje.cliente_telefono}</span>
                </div>
              )}
              {mensaje.cliente_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{mensaje.cliente_email}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Información del Mensaje</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{format(new Date(mensaje.fecha_creacion), "PPP", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{formatDistanceToNow(new Date(mensaje.fecha_creacion), { addSuffix: true, locale: es })}</span>
              </div>
              {mensaje.fecha_actualizacion && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Actualizado:</span>
                  <span>{formatDistanceToNow(new Date(mensaje.fecha_actualizacion), { addSuffix: true, locale: es })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Mensaje Original</h4>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{mensaje.mensaje}</p>
            </div>
          </div>

          {mensaje.respuestas && mensaje.respuestas.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Respuestas ({mensaje.respuestas.length})</h4>
              <div className="space-y-3">
                {mensaje.respuestas.map((respuesta) => (
                  <div
                    key={respuesta._id}
                    className={`p-4 rounded-lg ${
                      respuesta.es_publica ? 'bg-blue-50 border-l-4 border-blue-200' : 'bg-yellow-50 border-l-4 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {respuesta.autor_nombre.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{respuesta.autor_nombre}</span>
                        <Badge variant="outline" className={respuesta.es_publica ? 'text-blue-700' : 'text-yellow-700'}>
                          {respuesta.es_publica ? 'Pública' : 'Interna'}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(respuesta.fecha_respuesta), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{respuesta.contenido}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Enviar Respuesta</h4>
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={esPublica ? "publica" : "interna"} onValueChange={(value) => setEsPublica(value === "publica")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publica">Pública</SelectItem>
                  <SelectItem value="interna">Interna</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500">
                {esPublica ? 'Visible para el cliente' : 'Solo para uso interno'}
              </span>
            </div>
            <Button 
              onClick={handleSendResponse}
              disabled={!respuesta.trim() || enviandoRespuesta}
              className="flex items-center gap-2"
            >
              {enviandoRespuesta ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Respuesta
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}