"use client"

import { useState, useEffect } from "react"
import { MessageSquare } from "lucide-react"
import { ChatList } from "@/components/feats/whatsapp/chat-list"
import { ChatConversation } from "@/components/feats/whatsapp/chat-conversation"
import { ManageEtiquetasDialog } from "@/components/feats/whatsapp/manage-etiquetas-dialog"
import { RouteGuard } from "@/components/auth/route-guard"
import { Toaster } from "@/components/shared/molecule/toaster"
import type { Chat, Etiqueta, Mensaje } from "@/lib/types/feats/whatsapp/whatsapp-types"
import {
  getAllChats,
  getAllEtiquetas,
  searchChats,
  filterChatsByEtiquetas,
} from "@/lib/mock-data/whatsapp-mock"

export default function WhatsAppPage() {
  return (
    <RouteGuard requiredModule="whatsapp">
      <WhatsAppPageContent />
    </RouteGuard>
  )
}

function WhatsAppPageContent() {
  const [todosLosChats, setTodosLosChats] = useState<Chat[]>([])
  const [chatsVisibles, setChatsVisibles] = useState<Chat[]>([])
  const [chatSeleccionado, setChatSeleccionado] = useState<Chat | null>(null)
  const [todasLasEtiquetas, setTodasLasEtiquetas] = useState<Etiqueta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [etiquetasFiltro, setEtiquetasFiltro] = useState<string[]>([])
  const [dialogEtiquetas, setDialogEtiquetas] = useState(false)
  const [chatParaEtiquetas, setChatParaEtiquetas] = useState<Chat | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    const chats = getAllChats()
    const etiquetas = getAllEtiquetas()
    setTodosLosChats(chats)
    setChatsVisibles(chats)
    setTodasLasEtiquetas(etiquetas)
  }, [])

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let resultado = todosLosChats

    // Aplicar búsqueda
    if (busqueda) {
      resultado = searchChats(resultado, busqueda)
    }

    // Aplicar filtro por etiquetas
    if (etiquetasFiltro.length > 0) {
      resultado = filterChatsByEtiquetas(resultado, etiquetasFiltro)
    }

    setChatsVisibles(resultado)
  }, [busqueda, etiquetasFiltro, todosLosChats])

  const handleChatSelect = (chat: Chat) => {
    // Marcar mensajes como leídos
    const chatsActualizados = todosLosChats.map(c => {
      if (c.id === chat.id) {
        return {
          ...c,
          noLeidos: 0,
          mensajes: c.mensajes.map(m => ({ ...m, leido: true })),
        }
      }
      return c
    })

    setTodosLosChats(chatsActualizados)

    // Seleccionar chat
    const chatActualizado = chatsActualizados.find(c => c.id === chat.id)
    setChatSeleccionado(chatActualizado || null)
  }

  const handleEnviarMensaje = (chatId: string, contenido: string) => {
    const nuevoMensaje: Mensaje = {
      id: `msg-${Date.now()}`,
      contenido,
      timestamp: new Date(),
      enviado: true,
      leido: false,
      tipo: 'text',
    }

    const chatsActualizados = todosLosChats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          mensajes: [...chat.mensajes, nuevoMensaje],
          ultimoMensaje: contenido,
          ultimoMensajeTimestamp: new Date(),
        }
      }
      return chat
    })

    setTodosLosChats(chatsActualizados)

    // Actualizar chat seleccionado
    const chatActualizado = chatsActualizados.find(c => c.id === chatId)
    if (chatActualizado) {
      setChatSeleccionado(chatActualizado)
    }
  }

  const handleGestionarEtiquetas = (chat: Chat) => {
    setChatParaEtiquetas(chat)
    setDialogEtiquetas(true)
  }

  const handleActualizarEtiquetas = (chatId: string, etiquetas: Etiqueta[]) => {
    const chatsActualizados = todosLosChats.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, etiquetas }
      }
      return chat
    })

    setTodosLosChats(chatsActualizados)

    // Actualizar chat seleccionado si es el mismo
    if (chatSeleccionado?.id === chatId) {
      setChatSeleccionado({ ...chatSeleccionado, etiquetas })
    }
  }

  const handleCrearEtiqueta = (nombre: string, color: string) => {
    const nuevaEtiqueta: Etiqueta = {
      id: `etq-${Date.now()}`,
      nombre,
      color,
    }

    setTodasLasEtiquetas([...todasLasEtiquetas, nuevaEtiqueta])
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Business</h1>
            <p className="text-green-100 text-sm">
              Gestiona tus conversaciones con clientes
            </p>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Lista de chats */}
        <div className="w-96 flex-shrink-0">
          <ChatList
            chats={chatsVisibles}
            chatSeleccionado={chatSeleccionado}
            onChatSelect={handleChatSelect}
            todasLasEtiquetas={todasLasEtiquetas}
            onBusquedaChange={setBusqueda}
            onEtiquetasFiltroChange={setEtiquetasFiltro}
            etiquetasFiltro={etiquetasFiltro}
          />
        </div>

        {/* Área de conversación */}
        <div className="flex-1">
          {chatSeleccionado ? (
            <ChatConversation
              chat={chatSeleccionado}
              onEnviarMensaje={handleEnviarMensaje}
              onGestionarEtiquetas={handleGestionarEtiquetas}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  WhatsApp Business
                </h2>
                <p className="text-gray-500 max-w-md">
                  Selecciona una conversación de la izquierda para comenzar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de gestión de etiquetas */}
      <ManageEtiquetasDialog
        open={dialogEtiquetas}
        onOpenChange={setDialogEtiquetas}
        chat={chatParaEtiquetas}
        todasLasEtiquetas={todasLasEtiquetas}
        onActualizarEtiquetas={handleActualizarEtiquetas}
        onCrearEtiqueta={handleCrearEtiqueta}
      />

      <Toaster />
    </div>
  )
}
