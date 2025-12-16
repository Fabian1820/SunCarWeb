"use client"

import { useState } from "react"
import { Input } from "@/components/shared/atom/input"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Search, Filter, Tag } from "lucide-react"
import type { Chat, Etiqueta } from "@/lib/types/feats/whatsapp/whatsapp-types"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/shared/molecule/dropdown-menu"

interface ChatListProps {
  chats: Chat[]
  chatSeleccionado: Chat | null
  onChatSelect: (chat: Chat) => void
  todasLasEtiquetas: Etiqueta[]
  onBusquedaChange: (value: string) => void
  onEtiquetasFiltroChange: (etiquetaIds: string[]) => void
  etiquetasFiltro: string[]
}

export function ChatList({
  chats,
  chatSeleccionado,
  onChatSelect,
  todasLasEtiquetas,
  onBusquedaChange,
  onEtiquetasFiltroChange,
  etiquetasFiltro,
}: ChatListProps) {
  const [busquedaLocal, setBusquedaLocal] = useState("")

  const handleBusquedaChange = (value: string) => {
    setBusquedaLocal(value)
    onBusquedaChange(value)
  }

  const toggleEtiquetaFiltro = (etiquetaId: string) => {
    const nuevasFiltros = etiquetasFiltro.includes(etiquetaId)
      ? etiquetasFiltro.filter(id => id !== etiquetaId)
      : [...etiquetasFiltro, etiquetaId]

    onEtiquetasFiltroChange(nuevasFiltros)
  }

  const formatearTimestamp = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: es })
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Chats</h2>

        {/* Búsqueda */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar contacto..."
            value={busquedaLocal}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros por etiqueta */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar por etiqueta
                {etiquetasFiltro.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {etiquetasFiltro.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Etiquetas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {todasLasEtiquetas.map((etiqueta) => (
                <DropdownMenuCheckboxItem
                  key={etiqueta.id}
                  checked={etiquetasFiltro.includes(etiqueta.id)}
                  onCheckedChange={() => toggleEtiquetaFiltro(etiqueta.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: etiqueta.color }}
                    />
                    <span>{etiqueta.nombre}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {etiquetasFiltro.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEtiquetasFiltroChange([])}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No se encontraron chats</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  chatSeleccionado?.id === chat.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {chat.contactoAvatar ? (
                      <img
                        src={chat.contactoAvatar}
                        alt={chat.contactoNombre}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-lg">
                        {chat.contactoNombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {chat.contactoNombre}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatearTimestamp(chat.ultimoMensajeTimestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 truncate mb-2">
                      {chat.ultimoMensaje}
                    </p>

                    {/* Etiquetas y contador de no leídos */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {chat.etiquetas.slice(0, 2).map((etiqueta) => (
                          <Badge
                            key={etiqueta.id}
                            variant="secondary"
                            className="text-xs px-2 py-0"
                            style={{
                              backgroundColor: `${etiqueta.color}15`,
                              color: etiqueta.color,
                              borderColor: etiqueta.color,
                            }}
                          >
                            {etiqueta.nombre}
                          </Badge>
                        ))}
                        {chat.etiquetas.length > 2 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            +{chat.etiquetas.length - 2}
                          </Badge>
                        )}
                      </div>

                      {chat.noLeidos > 0 && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                          {chat.noLeidos}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
