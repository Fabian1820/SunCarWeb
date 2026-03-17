"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Label } from "@/components/shared/atom/label"
import { Loader2, Package, Calendar, User } from "lucide-react"
import { ValeSalidaService } from "@/lib/services/feats/vales-salida/vale-salida-service"
import type { ValeSalida } from "@/lib/api-types"
import { useToast } from "@/hooks/use-toast"

interface SeleccionarValesSalidaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteId: string | null
  onValesSeleccionados: (vales: ValeSalida[]) => void
}

export function SeleccionarValesSalidaDialog({
  open,
  onOpenChange,
  clienteId,
  onValesSeleccionados,
}: SeleccionarValesSalidaDialogProps) {
  const [valesDisponibles, setValesDisponibles] = useState<ValeSalida[]>([])
  const [valesSeleccionados, setValesSeleccionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && clienteId) {
      cargarValesDisponibles()
    } else {
      setValesDisponibles([])
      setValesSeleccionados(new Set())
    }
  }, [open, clienteId])

  const cargarValesDisponibles = async () => {
    if (!clienteId) return

    setLoading(true)
    try {
      // Obtener todos los vales de salida
      const vales = await ValeSalidaService.getVales({
        estado: "usado",
      })

      // Filtrar vales que cumplan todos los criterios:
      // 1. Pertenecen al cliente
      // 2. Solicitud en estado "facturado"
      // 3. Campo facturado = false (no agregado a otra factura)
      // 4. No están anulados
      const valesFiltrados = vales.filter((vale) => {
        // Verificar que no esté anulado
        if (vale.estado === "anulado") return false

        // Verificar que no esté ya facturado
        if (vale.facturado === true) return false

        // Obtener la solicitud
        const solicitud = vale.solicitud_material || vale.solicitud_venta || vale.solicitud
        if (!solicitud) return false

        // Verificar que pertenezca al cliente
        const cliente = solicitud.cliente || solicitud.cliente_venta
        if (!cliente || cliente.id !== clienteId) return false

        // Verificar que el estado de la solicitud sea "facturado"
        if (solicitud.estado !== "facturado") return false

        return true
      })

      setValesDisponibles(valesFiltrados)

      if (valesFiltrados.length === 0) {
        toast({
          title: "Sin vales disponibles",
          description: "No hay vales de salida disponibles para este cliente que cumplan los criterios (solicitud facturada y vale no facturado).",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error cargando vales disponibles:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los vales disponibles.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleVale = (valeId: string) => {
    const newSet = new Set(valesSeleccionados)
    if (newSet.has(valeId)) {
      newSet.delete(valeId)
    } else {
      newSet.add(valeId)
    }
    setValesSeleccionados(newSet)
  }

  const handleConfirmar = () => {
    const vales = valesDisponibles.filter((vale) => valesSeleccionados.has(vale.id))
    onValesSeleccionados(vales)
    onOpenChange(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const calcularTotalVale = (vale: ValeSalida): number => {
    return vale.materiales.reduce((sum, material) => {
      const precio = material.material?.precio || 0
      const cantidad = material.cantidad || 0
      return sum + precio * cantidad
    }, 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Vales de Salida</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {valesDisponibles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">No hay vales disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">
                    No se encontraron vales de salida para este cliente con solicitudes facturadas.
                  </p>
                </div>
              ) : (
                valesDisponibles.map((vale) => {
                  const solicitud = vale.solicitud_material || vale.solicitud_venta || vale.solicitud
                  const total = calcularTotalVale(vale)
                  const isSelected = valesSeleccionados.has(vale.id)

                  return (
                    <div
                      key={vale.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/50"
                      }`}
                      onClick={() => toggleVale(vale.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleVale(vale.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                Vale {vale.codigo || vale.id.slice(0, 8)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                {solicitud?.estado || "usado"}
                              </span>
                            </div>
                            <span className="font-bold text-orange-600">
                              {formatCurrency(total)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {vale.fecha_creacion && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(vale.fecha_creacion).toLocaleDateString("es-ES")}
                                </span>
                              </div>
                            )}
                            {vale.recogido_por && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <User className="h-4 w-4" />
                                <span>Recogido por: {vale.recogido_por}</span>
                              </div>
                            )}
                          </div>

                          {/* Materiales */}
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">
                              Materiales ({vale.materiales.length})
                            </Label>
                            <div className="space-y-1">
                              {vale.materiales.slice(0, 3).map((material, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm text-gray-700 flex justify-between"
                                >
                                  <span>
                                    {material.material_codigo || material.codigo} -{" "}
                                    {material.material_descripcion || material.descripcion}
                                  </span>
                                  <span className="text-gray-500">
                                    x{material.cantidad}
                                  </span>
                                </div>
                              ))}
                              {vale.materiales.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{vale.materiales.length - 3} más...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-gray-600">
                  {valesSeleccionados.size > 0 && (
                    <span className="font-medium">
                      {valesSeleccionados.size} vale(s) seleccionado(s)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmar}
                    disabled={valesSeleccionados.size === 0}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Agregar {valesSeleccionados.size > 0 && `(${valesSeleccionados.size})`}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
