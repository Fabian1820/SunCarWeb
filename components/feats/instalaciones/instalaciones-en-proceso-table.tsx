"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Search,
  CheckCircle,
  Edit,
  Phone,
  MapPin,
  Package,
  Camera,
} from "lucide-react";
import type { Cliente } from "@/lib/api-types";
import { ClienteService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { ClienteFotosDialog } from "@/components/feats/instalaciones/cliente-fotos-dialog";

interface InstalacionesEnProcesoTableProps {
  clients: Cliente[];
  loading: boolean;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}

export function InstalacionesEnProcesoTable({
  clients,
  loading,
  onFiltersChange,
  onRefresh,
}: InstalacionesEnProcesoTableProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [isEditFaltaDialogOpen, setIsEditFaltaDialogOpen] = useState(false);
  const [faltaValue, setFaltaValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [clienteFotosSeleccionado, setClienteFotosSeleccionado] =
    useState<Cliente | null>(null);

  // Actualizar filtros cuando cambien
  useEffect(() => {
    onFiltersChange({
      searchTerm,
      fechaDesde,
      fechaHasta,
    });
  }, [searchTerm, fechaDesde, fechaHasta, onFiltersChange]);

  // Formatear ofertas para mostrar
  const formatOfertas = (ofertas: any[]) => {
    if (!ofertas || ofertas.length === 0) return "Sin oferta";

    return ofertas
      .map((oferta: any) => {
        const productos: string[] = [];

        if (oferta.inversor_codigo && oferta.inversor_cantidad > 0) {
          const nombre = oferta.inversor_nombre || oferta.inversor_codigo;
          productos.push(`${oferta.inversor_cantidad}x ${nombre}`);
        }

        if (oferta.bateria_codigo && oferta.bateria_cantidad > 0) {
          const nombre = oferta.bateria_nombre || oferta.bateria_codigo;
          productos.push(`${oferta.bateria_cantidad}x ${nombre}`);
        }

        if (oferta.panel_codigo && oferta.panel_cantidad > 0) {
          const nombre = oferta.panel_nombre || oferta.panel_codigo;
          productos.push(`${oferta.panel_cantidad}x ${nombre}`);
        }

        if (oferta.elementos_personalizados) {
          productos.push(oferta.elementos_personalizados);
        }

        return productos.join(" • ");
      })
      .join(" | ");
  };

  // Cambiar estado a "Equipo Instalado con Éxito"
  const handleCambiarEstado = async (client: Cliente) => {
    setIsUpdating(true);
    try {
      await ClienteService.actualizarCliente(client.numero, {
        estado: "Equipo Instalado con Éxito",
      });
      toast({
        title: "Estado actualizado",
        description: `El cliente ${client.nombre} ahora tiene estado "Equipo Instalado con Éxito"`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Abrir diálogo para editar "Qué falta"
  const handleEditFalta = (client: Cliente) => {
    setSelectedClient(client);
    setFaltaValue(client.falta_instalacion || "");
    setIsEditFaltaDialogOpen(true);
  };

  // Guardar cambios en "Qué falta"
  const handleSaveFalta = async () => {
    if (!selectedClient) return;

    setIsUpdating(true);
    try {
      await ClienteService.actualizarCliente(selectedClient.numero, {
        falta_instalacion: faltaValue,
      });
      toast({
        title: "Actualizado",
        description: "Se actualizó lo que falta para la instalación",
      });
      setIsEditFaltaDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenFotos = (client: Cliente) => {
    setClienteFotosSeleccionado(client);
  };

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre, teléfono, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Instalaciones en Proceso ({clients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay instalaciones en proceso
              </h3>
              <p className="text-gray-600">
                No se encontraron clientes con instalación en proceso
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <Card key={client.numero} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {client.nombre}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{client.telefono}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span>{client.direccion}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                        <p className="text-sm text-gray-700">
                          {formatOfertas(client.ofertas || [])}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qué falta:</p>
                        <p className="text-sm text-gray-700">
                          {client.falta_instalacion || "No especificado"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleCambiarEstado(client)}
                          disabled={isUpdating}
                          title="Marcar como instalado"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleEditFalta(client)}
                          title="Editar qué falta"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-sky-300 text-sky-700 hover:bg-sky-50"
                          onClick={() => handleOpenFotos(client)}
                          title="Ver fotos del cliente"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Teléfonos
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Dirección
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Oferta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Qué Falta
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.numero}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">
                            {client.nombre}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.telefono}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.direccion}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {formatOfertas(client.ofertas || [])}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">
                            {client.falta_instalacion || "No especificado"}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleCambiarEstado(client)}
                              disabled={isUpdating}
                              title="Marcar como instalado"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => handleEditFalta(client)}
                              title="Editar qué falta"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-sky-300 text-sky-700 hover:bg-sky-50"
                              onClick={() => handleOpenFotos(client)}
                              title="Ver fotos del cliente"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para editar "Qué falta" */}
      <Dialog
        open={isEditFaltaDialogOpen}
        onOpenChange={setIsEditFaltaDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Qué Falta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="falta">Cliente: {selectedClient?.nombre}</Label>
            </div>
            <div>
              <Label htmlFor="falta">
                Qué falta para completar la instalación
              </Label>
              <Input
                id="falta"
                value={faltaValue}
                onChange={(e) => setFaltaValue(e.target.value)}
                placeholder="Ej: Falta cable, paneles, etc."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditFaltaDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveFalta}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {isUpdating ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ClienteFotosDialog
        open={!!clienteFotosSeleccionado}
        onOpenChange={(open) => {
          if (!open) setClienteFotosSeleccionado(null);
        }}
        clienteNombre={clienteFotosSeleccionado?.nombre || ""}
        clienteCodigo={clienteFotosSeleccionado?.numero}
        fotos={clienteFotosSeleccionado?.fotos || []}
      />
    </>
  );
}
