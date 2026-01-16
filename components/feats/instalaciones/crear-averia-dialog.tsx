"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { AlertTriangle, Search, Package } from "lucide-react"
import { AveriaService, ClienteService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/api-types"

interface CrearAveriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CrearAveriaDialog({
  open,
  onOpenChange,
  onSuccess,
}: CrearAveriaDialogProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  
  // Formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("")
  const [descripcion, setDescripcion] = useState("")
  const [searchCliente, setSearchCliente] = useState("")

  // Filtrar clientes según búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!searchCliente.trim()) return []
    
    const search = searchCliente.toLowerCase()
    return clientes.filter(cliente => 
      cliente.nombre.toLowerCase().includes(search) ||
      cliente.numero.toLowerCase().includes(search) ||
      cliente.telefono?.toLowerCase().includes(search) ||
      cliente.direccion?.toLowerCase().includes(search)
    )
  }, [clientes, searchCliente])

  // Cargar clientes cuando se abre el dialog
  useEffect(() => {
    if (open) {
      cargarClientes()
    }
  }, [open])

  const cargarClientes = async () => {
    setLoadingClientes(true)
    try {
      const data = await ClienteService.getClientes({})
      setClientes(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } finally {
      setLoadingClientes(false)
    }
  }

  const handleCrearAveria = async () => {
    if (!clienteSeleccionado) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    if (!descripcion.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar una descripción de la avería",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      await AveriaService.agregarAveria(clienteSeleccionado, {
        descripcion: descripcion.trim(),
        estado: 'Pendiente',
      })

      toast({
        title: "Avería creada",
        description: "La avería se ha registrado correctamente",
      })

      // Limpiar formulario
      setClienteSeleccionado("")
      setDescripcion("")
      
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la avería",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setClienteSeleccionado("")
    setDescripcion("")
    setSearchCliente("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Crear Nueva Avería
          </DialogTitle>
          <DialogDescription>
            Registra una nueva avería para un cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Buscador de cliente */}
          <div>
            <Label htmlFor="buscar-cliente">Buscar y seleccionar cliente *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="buscar-cliente"
                placeholder="Buscar por nombre, código o teléfono..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                className="pl-10"
                disabled={isCreating || loadingClientes}
              />
            </div>
            
            {/* Cliente seleccionado */}
            {clienteSeleccionado && !searchCliente && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-green-900">
                      {clientes.find(c => c.numero === clienteSeleccionado)?.nombre}
                    </p>
                    <p className="text-xs text-green-700">
                      {clientes.find(c => c.numero === clienteSeleccionado)?.numero} • 
                      {clientes.find(c => c.numero === clienteSeleccionado)?.telefono}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClienteSeleccionado("")
                      setSearchCliente("")
                    }}
                    className="text-green-700 hover:text-green-900 hover:bg-green-100"
                  >
                    Cambiar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Lista filtrada de clientes */}
          {searchCliente && !clienteSeleccionado && (
            <div className="border rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg">
              {loadingClientes ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  Cargando clientes...
                </div>
              ) : clientesFiltrados.length > 0 ? (
                <div className="divide-y">
                  {clientesFiltrados.slice(0, 15).map((cliente) => (
                    <button
                      key={cliente.numero}
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(cliente.numero)
                        setSearchCliente("")
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors focus:bg-blue-50 focus:outline-none"
                    >
                      <p className="font-medium text-gray-900 text-sm">{cliente.nombre}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {cliente.numero} • {cliente.telefono}
                      </p>
                      {cliente.direccion && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{cliente.direccion}</p>
                      )}
                    </button>
                  ))}
                  {clientesFiltrados.length > 15 && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center bg-gray-50">
                      Mostrando 15 de {clientesFiltrados.length} resultados
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No se encontraron clientes</p>
                  <p className="text-xs text-gray-400 mt-1">Intenta con otro término</p>
                </div>
              )}
            </div>
          )}

          {/* Descripción de la avería */}
          <div>
            <Label htmlFor="descripcion">Descripción de la avería *</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Inversor no enciende, panel dañado, batería no carga, etc."
              rows={4}
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Describe el problema de forma clara y detallada
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCrearAveria}
            disabled={isCreating || !clienteSeleccionado || !descripcion.trim()}
            className="bg-gradient-to-r from-red-500 to-red-600"
          >
            {isCreating ? "Creando..." : "Crear Avería"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
