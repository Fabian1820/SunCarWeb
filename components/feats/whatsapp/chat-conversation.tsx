"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/shared/atom/input"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Send, MoreVertical, Phone, Video, Search, Paperclip, Smile, Tag } from "lucide-react"
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
}

export function ChatConversation({ chat, onEnviarMensaje, onGestionarEtiquetas }: ChatConversationProps) {
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {chat.contactoAvatar ? (
              <img
                src={chat.contactoAvatar}
                alt={chat.contactoNombre}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                {chat.contactoNombre.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info del contacto */}
            <div>
              <h3 className="font-semibold text-gray-900">{chat.contactoNombre}</h3>
              <p className="text-sm text-gray-500">{chat.contactoTelefono}</p>
            </div>

            {/* Etiquetas */}
            {chat.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-4">
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
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon">
              <Phone className="h-5 w-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-5 w-5 text-gray-600" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5 text-gray-600" />
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
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
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end gap-3">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Smile className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="h-5 w-5 text-gray-600" />
          </Button>

          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />

          <Button
            onClick={handleEnviar}
            disabled={!nuevoMensaje.trim()}
            className="flex-shrink-0 bg-green-500 hover:bg-green-600"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
