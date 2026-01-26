"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/atom/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Search, User, Building2, Eye, Trash2 } from "lucide-react"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"
import { Loader } from "@/components/shared/atom/loader"
import { Button } from "@/components/shared/atom/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shared/atom/alert-dialog"

export function OfertasGridView() {
  const { ofertas, loading, eliminarOferta } = useOfertasConfeccion()
  const [searchQuery, setSearchQuery] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<string>("todas")
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos")
  const [ofertaAEliminar, setOfertaAEliminar] = useState<string | null>(null)

  const ofertasFiltradas = useMemo(() => {
    return ofertas.filter((oferta) => {
      const matchSearch = 
        oferta.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        oferta.cliente_nombre?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchTipo = tipoFiltro === "todas" || oferta.tipo === tipoFiltro
      const matchEstado = estadoFiltro === "todos" || oferta.estado === estadoFiltro

      return matchSearch && matchTipo && matchEstado
    })
  }, [ofertas, searchQuery, tipoFiltro, estadoFiltro])

  const getEstadoBadge = (estado: string) => {
    const badges = {
      en_revision: { label: "En Revisión", className: "bg-yellow-100 text-yellow-800" },
      aprobada_para_enviar: { label: "Aprobada", className: "bg-blue-100 text-blue-800" },
      enviada_a_cliente: { label: "Enviada", className: "bg-purple-100 text-purple-800" },
      confirmada_por_cliente: { label: "Confirmada", className: "bg-green-100 text-green-800" },
      reservada: { label: "Reservada", className: "bg-orange-100 text-orange-800" },
    }
    return badges[estado as keyof typeof badges] || badges.en_revision
  }

  const getTipoBadge = (tipo: string) => {
    return tipo === "personalizada"
      ? { label: "Personalizada", className: "bg-pink-100 text-pink-800" }
      : { label: "Genérica", className: "bg-slate-100 text-slate-800" }
  }

  const formatCurrency = (value: number) => {
    return `Bs ${new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`
  }

  const handleEliminar = async () => {
    if (ofertaAEliminar) {
      await eliminarOferta(ofertaAEliminar)
      setOfertaAEliminar(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="generica">Genéricas</SelectItem>
            <SelectItem value="personalizada">Personalizadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="en_revision">En Revisión</SelectItem>
            <SelectItem value="aprobada_para_enviar">Aprobada</SelectItem>
            <SelectItem value="enviada_a_cliente">Enviada</SelectItem>
            <SelectItem value="confirmada_por_cliente">Confirmada</SelectItem>
            <SelectItem value="reservada">Reservada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de ofertas */}
      {ofertasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron ofertas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ofertasFiltradas.map((oferta) => {
            const estadoBadge = getEstadoBadge(oferta.estado)
            const tipoBadge = getTipoBadge(oferta.tipo)

            return (
              <Card
                key={oferta.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200 border-2 border-slate-200"
              >
                <CardContent className="p-0">
                  {/* Imagen */}
                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-yellow-100">
                    {oferta.foto_portada ? (
                      <img
                        src={oferta.foto_portada}
                        alt={oferta.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-orange-300" />
                      </div>
                    )}
                    
                    {/* Badges en la imagen */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge className={tipoBadge.className}>
                        {tipoBadge.label}
                      </Badge>
                      <Badge className={estadoBadge.className}>
                        {estadoBadge.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4 space-y-3">
                    {/* Nombre */}
                    <h3 className="font-semibold text-lg text-slate-900 line-clamp-2 min-h-[56px]">
                      {oferta.nombre}
                    </h3>

                    {/* Cliente (solo si es personalizada) */}
                    {oferta.tipo === "personalizada" && oferta.cliente_nombre && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        <span className="truncate">{oferta.cliente_nombre}</span>
                      </div>
                    )}

                    {/* Precio */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-sm text-slate-600">Precio Final</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(oferta.precio_final)}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setOfertaAEliminar(oferta.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!ofertaAEliminar} onOpenChange={() => setOfertaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La oferta será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
