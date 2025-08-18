"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { ArrowLeft, MessageCircle, TrendingUp, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import MessagesList from "@/components/feats/customer-service/messages-list"
import MessageDetail from "@/components/feats/customer-service/message-detail"
import { useAtencionCliente } from "@/hooks/use-atencion-cliente"
import { toast } from "sonner"
import type { MensajeCliente } from "@/lib/api-types"
import { PageLoader } from "@/components/shared/atom/page-loader"

export default function AtencionClientePage() {
  const [selectedMessage, setSelectedMessage] = useState<MensajeCliente | null>(null)
  const {
    mensajes,
    loading,
    error,
    estadisticas,
    actualizarEstado,
    actualizarPrioridad,
    crearRespuesta,
    filtrarMensajes
  } = useAtencionCliente()

  const handleSelectMessage = (mensaje: MensajeCliente) => {
    setSelectedMessage(mensaje)
  }

  const handleUpdateStatus = async (estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado') => {
    if (!selectedMessage) return
    
    try {
      await actualizarEstado(selectedMessage._id, estado)
      toast.success('Estado actualizado correctamente')
      
      const updatedMessage = { ...selectedMessage, estado }
      setSelectedMessage(updatedMessage)
    } catch (error) {
      toast.error('Error al actualizar el estado')
      console.error('Error actualizando estado:', error)
    }
  }

  const handleUpdatePriority = async (prioridad: 'baja' | 'media' | 'alta' | 'urgente') => {
    if (!selectedMessage) return
    
    try {
      await actualizarPrioridad(selectedMessage._id, prioridad)
      toast.success('Prioridad actualizada correctamente')
      
      const updatedMessage = { ...selectedMessage, prioridad }
      setSelectedMessage(updatedMessage)
    } catch (error) {
      toast.error('Error al actualizar la prioridad')
      console.error('Error actualizando prioridad:', error)
    }
  }

  const handleSendResponse = async (contenido: string, esPublica: boolean) => {
    if (!selectedMessage) return
    
    try {
      await crearRespuesta(selectedMessage._id, contenido, "12345678", "Administrador", esPublica)
      toast.success('Respuesta enviada correctamente')
      
      if (esPublica && selectedMessage.estado === 'nuevo') {
        await actualizarEstado(selectedMessage._id, 'respondido')
      }
    } catch (error) {
      toast.error('Error al enviar la respuesta')
      console.error('Error enviando respuesta:', error)
    }
  }

  // Mostrar loader mientras se cargan los datos iniciales
  if (loading) {
    return <PageLoader moduleName="Atención al Cliente" text="Cargando mensajes y estadísticas..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        <header className="fixed-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Volver al Dashboard</span>
                  </Button>
                </Link>
                <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-12 w-12">
                  <img src="/logo.png" alt="Logo SunCar" className="h-10 w-10 object-contain rounded-full" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Atención al Cliente</h1>
                  <p className="text-sm text-gray-600">Sistema de gestión de mensajes de clientes</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-800">Error al cargar los datos</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Atención al Cliente
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Soporte
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Sistema de gestión de mensajes de clientes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-8">
        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600">Total</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                  </div>
                  <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600">Nuevos</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-600">{estadisticas.nuevos}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0">
                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600">En Proceso</p>
                    <p className="text-lg md:text-2xl font-bold text-yellow-600">{estadisticas.en_proceso}</p>
                  </div>
                  <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-500 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600">Respondidos</p>
                    <p className="text-lg md:text-2xl font-bold text-green-600">{estadisticas.respondidos}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-gray-600">Cerrados</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-600">{estadisticas.cerrados}</p>
                  </div>
                  <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Panel principal dividido */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 min-h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
          {/* Lista de mensajes */}
          <div className="lg:col-span-2 order-1">
            <MessagesList
              mensajes={mensajes}
              loading={loading}
              onSelectMessage={handleSelectMessage}
              selectedMessageId={selectedMessage?._id}
              onFilterChange={filtrarMensajes}
            />
          </div>

          {/* Detalle del mensaje */}
          <div className="lg:col-span-3 order-2">
            <MessageDetail
              mensaje={selectedMessage}
              loading={loading}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePriority={handleUpdatePriority}
              onSendResponse={handleSendResponse}
            />
          </div>
        </div>
      </main>
    </div>
  )
}