"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/shared/atom/input"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { ArrowLeft, Send, MoreVertical, Phone, Video, Search, Paperclip, Smile, Tag } from "lucide-react"
import type { Chat, Mensaje } from "@/lib/types/feats/whatsapp/whatsapp-types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/molecule/dropdown-menu"

interface ChatConversationProps {
  chat: Chat
  onEnviarMensaje: (chatId: string, contenido: string) => void
  onGestionarEtiquetas: (chat: Chat) => void
  onBack?: () => void
}

export function ChatConversation({ chat, onEnviarMensaje, onGestionarEtiquetas, onBack }: ChatConversationProps) {
  const [nuevoMensaje, setNuevoMensaje] = useState("")
  const mensajesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat.mensajes])

  const handleEnviar = () => {
    if (nuevoMensaje.trim()) {
      onEnviarMensaje(chat.id, nuevoMensaje)
      setNuevoMensaje("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const formatearHora = (date: Date) => {
    return format(date, "HH:mm", { locale: es })
  }

  const formatearFecha = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es })
  }

  const agruparMensajesPorFecha = (mensajes: Mensaje[]) => {
    const grupos: { fecha: string; mensajes: Mensaje[] }[] = []

    mensajes.forEach((mensaje) => {
      const fechaStr = format(mensaje.timestamp, "yyyy-MM-dd")
      const grupoExistente = grupos.find(g => g.fecha === fechaStr)

      if (grupoExistente) {
        grupoExistente.mensajes.push(mensaje)
      } else {
        grupos.push({ fecha: fechaStr, mensajes: [mensaje] })
      }
    })

    return grupos
  }

  const gruposMensajes = agruparMensajesPorFecha(chat.mensajes)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header de conversación */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="md:hidden touch-manipulation"
                aria-label="Volver a chats"
                title="Volver a chats"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
                <span className="sr-only">Volver a chats</span>
              </Button>
            ) : null}

            {/* Avatar */}
            {chat.contactoAvatar ? (
              <img
                src={chat.contactoAvatar}
                alt={chat.contactoNombre}
                className="w-10 h-10 rounded-full shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold shrink-0">
                {chat.contactoNombre.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info del contacto */}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{chat.contactoNombre}</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{chat.contactoTelefono}</p>
            </div>

            {/* Etiquetas */}
            {chat.etiquetas.length > 0 && (
              <div className="hidden sm:flex flex-wrap gap-1 ml-4">
                {chat.etiquetas.map((etiqueta) => (
                  <Badge
                    key={etiqueta.id}
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${etiqueta.color}15`,
                      color: etiqueta.color,
                      borderColor: etiqueta.color,
                    }}
                  >
                    {etiqueta.nombre}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="touch-manipulation"
              aria-label="Buscar"
              title="Buscar"
            >
              <Search className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Buscar</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex touch-manipulation"
              aria-label="Llamar"
              title="Llamar"
            >
              <Phone className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Llamar</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex touch-manipulation"
              aria-label="Videollamar"
              title="Videollamar"
            >
              <Video className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Videollamar</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation"
                  aria-label="Más opciones"
                  title="Más opciones"
                >
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                  <span className="sr-only">Más opciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onGestionarEtiquetas(chat)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Gestionar etiquetas
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Ver información del contacto
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  Eliminar chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
        {gruposMensajes.map((grupo) => (
          <div key={grupo.fecha}>
            {/* Separador de fecha */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-white px-3 py-1 rounded-full shadow-sm text-xs text-gray-600">
                {formatearFecha(new Date(grupo.fecha))}
              </div>
            </div>

            {/* Mensajes del día */}
            <div className="space-y-2">
              {grupo.mensajes.map((mensaje) => (
                <div
                  key={mensaje.id}
                  className={`flex ${mensaje.enviado ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-4 py-2 ${
                      mensaje.enviado
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {mensaje.contenido}
                    </p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                      mensaje.enviado ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span>{formatearHora(mensaje.timestamp)}</span>
                      {mensaje.enviado && (
                        <span className="text-xs">
                          {mensaje.leido ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={mensajesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 touch-manipulation"
            aria-label="Emojis"
            title="Emojis"
          >
            <Smile className="h-5 w-5 text-gray-600" />
            <span className="sr-only">Emojis</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 touch-manipulation"
            aria-label="Adjuntar"
            title="Adjuntar"
          >
            <Paperclip className="h-5 w-5 text-gray-600" />
            <span className="sr-only">Adjuntar</span>
          </Button>

          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 min-w-0"
          />

          <Button
            onClick={handleEnviar}
            disabled={!nuevoMensaje.trim()}
            size="icon"
            className="flex-shrink-0 touch-manipulation bg-green-500 hover:bg-green-600"
            aria-label="Enviar mensaje"
            title="Enviar mensaje"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Enviar mensaje</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
