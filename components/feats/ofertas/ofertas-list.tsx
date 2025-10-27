"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import {
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  DollarSign,
  Image as ImageIcon,
  Package,
  CreditCard,
  Percent,
  Tag,
  FileText,
  Loader2
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/shared/atom/alert-dialog"
import type { Oferta } from "@/lib/api-types"
import { Loader } from "@/components/shared/atom/loader"
import { Switch } from "@/components/shared/molecule/switch"

interface OfertasListProps {
  ofertas: Oferta[]
  loading: boolean
  onCreateNew: () => void
  onViewDetails: (oferta: Oferta) => void
  onEdit: (oferta: Oferta) => void
  onManageElements: (oferta: Oferta) => void
  onDelete: (ofertaId: string) => void
  onToggleVisibility: (oferta: Oferta, nextStatus: boolean) => Promise<boolean>
  searchTerm?: string
  minPrice?: number
  maxPrice?: number
  selectedBrands?: string[]
}

export default function OfertasList({
  ofertas,
  loading,
  onCreateNew,
  onViewDetails,
  onEdit,
  onManageElements,
  onDelete,
  onToggleVisibility,
  searchTerm = "",
  minPrice,
  maxPrice,
  selectedBrands = []
}: OfertasListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})

  const handleToggleVisibility = async (oferta: Oferta, checked: boolean) => {
    setUpdatingStatus(prev => ({ ...prev, [oferta.id]: true }))
    try {
      await onToggleVisibility(oferta, checked)
    } finally {
      setUpdatingStatus(prev => {
        const { [oferta.id]: _omit, ...rest } = prev
        return rest
      })
    }
  }

  // Filtrar ofertas por término de búsqueda avanzada y precios
  const filteredOfertas = ofertas.filter(oferta => {
    const matchesSearch = !searchTerm ||
      oferta.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oferta.garantias?.some(garantia => garantia.toLowerCase().includes(searchTerm.toLowerCase())) ||
      oferta.elementos?.some(elemento =>
        elemento.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        elemento.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      )

    const matchesMinPrice = !minPrice || oferta.precio >= minPrice
    const matchesMaxPrice = !maxPrice || oferta.precio <= maxPrice
    const normalizedMarca = oferta.marca?.trim() || "Sin marca"
    const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(normalizedMarca)

    return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesBrand
  })

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Loader label="Cargando ofertas..." />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">

      {/* Lista de ofertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOfertas.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No se encontraron ofertas" : "No hay ofertas disponibles"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? `No hay ofertas que coincidan con "${searchTerm}"`
                    : "Comienza creando tu primera oferta"}
                </p>
                {!searchTerm && (
                  <Button onClick={onCreateNew} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Oferta
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredOfertas.map((oferta) => (
            <Card key={oferta.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 flex flex-wrap items-center gap-2">
                      <span className="break-words">{oferta.descripcion}</span>
                      <Badge
                        variant="secondary"
                        className={
                          oferta.is_active
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-200 text-gray-700 border-gray-300"
                        }
                      >
                        {oferta.is_active ? "Visible" : "Oculta"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag className="h-4 w-4 text-orange-500" />
                        <span>{oferta.marca?.trim() || "Sin marca"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-lg font-bold text-green-600">
                          {oferta.precio.toLocaleString()} {oferta.moneda?.toUpperCase() || 'USD'}
                        </span>
                      </div>
                      {oferta.precio_cliente && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <span className="text-xs font-medium">Cliente:</span>
                          <span className="text-sm font-semibold">
                            {oferta.precio_cliente.toLocaleString()} {oferta.moneda?.toUpperCase() || 'USD'}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-1 mt-2">
                        {oferta.financiamiento && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Financiamiento
                          </Badge>
                        )}
                        {oferta.descuentos && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            <Percent className="h-3 w-3 mr-1" />
                            Descuentos
                          </Badge>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {oferta.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        )}
                        <span>{oferta.is_active ? "Visible" : "Oculta"}</span>
                      </div>
                      <Switch
                        checked={oferta.is_active}
                        onCheckedChange={(checked) => handleToggleVisibility(oferta, checked)}
                        disabled={!!updatingStatus[oferta.id]}
                        aria-label={`Alternar visibilidad de ${oferta.descripcion}`}
                      />
                      {updatingStatus[oferta.id] && (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. La oferta "{oferta.descripcion}" será eliminada permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(oferta.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Imagen de la oferta */}
                {oferta.imagen ? (
                  <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={oferta.imagen}
                      alt={oferta.descripcion}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {oferta.pdf && (
                  <a
                    href={oferta.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 underline mb-4"
                  >
                    <FileText className="h-4 w-4" />
                    Ver ficha técnica (PDF)
                  </a>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(oferta)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(oferta)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageElements(oferta)}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Elementos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Información adicional */}
      {filteredOfertas.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Mostrando {filteredOfertas.length} de {ofertas.length} oferta{ofertas.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
