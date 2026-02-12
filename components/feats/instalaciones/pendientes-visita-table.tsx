"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { PriorityDot } from "@/components/shared/atom/priority-dot";
import {
  Search,
  Phone,
  MapPin,
  Package,
  User,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-config";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { CompletarVisitaDialog } from "@/components/feats/instalaciones/completar-visita-dialog";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";

interface PendientesVisitaTableProps {
  pendientes: PendienteVisita[];
  loading: boolean;
  onRefresh: () => void;
}

export function PendientesVisitaTable({
  pendientes,
  loading,
  onRefresh,
}: PendientesVisitaTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "leads" | "clientes">(
    "todos",
  );
  const [provinciaFilter, setProvinciaFilter] = useState("todas");
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  const [completarVisitaDialogOpen, setCompletarVisitaDialogOpen] =
    useState(false);
  const [pendienteSeleccionado, setPendienteSeleccionado] =
    useState<PendienteVisita | null>(null);
  const [ofertaCargada, setOfertaCargada] = useState<OfertaConfeccion | null>(
    null,
  );
  const { toast } = useToast();

  // Filtrar pendientes
  const pendientesFiltrados = useMemo(() => {
    return pendientes.filter((pendiente) => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          pendiente.nombre.toLowerCase().includes(search) ||
          pendiente.telefono.toLowerCase().includes(search) ||
          pendiente.direccion.toLowerCase().includes(search) ||
          pendiente.comentario.toLowerCase().includes(search) ||
          pendiente.fuente.toLowerCase().includes(search);

        if (!matchesSearch) return false;
      }

      // Filtro de tipo
      if (
        tipoFilter !== "todos" &&
        pendiente.tipo !== tipoFilter.slice(0, -1)
      ) {
        return false;
      }

      // Filtro de provincia
      if (
        provinciaFilter !== "todas" &&
        pendiente.provincia !== provinciaFilter
      ) {
        return false;
      }

      return true;
    });
  }, [pendientes, searchTerm, tipoFilter, provinciaFilter]);

  // Obtener lista de provincias únicas
  const provincias = useMemo(() => {
    const uniqueProvincias = new Set(pendientes.map((p) => p.provincia));
    return Array.from(uniqueProvincias).sort((a, b) => {
      // La Habana primero
      if (a.toLowerCase().includes("habana")) return -1;
      if (b.toLowerCase().includes("habana")) return 1;
      return a.localeCompare(b);
    });
  }, [pendientes]);

  // Contar por tipo
  const countLeads = pendientesFiltrados.filter(
    (p) => p.tipo === "lead",
  ).length;
  const countClientes = pendientesFiltrados.filter(
    (p) => p.tipo === "cliente",
  ).length;

  const handleCompletarVisita = (pendiente: PendienteVisita) => {
    setPendienteSeleccionado(pendiente);
    setCompletarVisitaDialogOpen(true);
  };

  const handleVisitaCompletada = () => {
    // Recargar los datos después de completar la visita
    onRefresh();
  };

  const handleVerOferta = async (pendiente: PendienteVisita) => {
    try {
      setPendienteSeleccionado(pendiente);
      setOfertaCargada(null);
      setOfertaDialogOpen(false);

      // Cargar oferta según el tipo
      let response;
      if (pendiente.tipo === "lead") {
        response = await apiRequest<any>(
          `/ofertas/confeccion/lead/${pendiente.id}`,
        );
      } else {
        response = await apiRequest<any>(
          `/ofertas/confeccion/cliente/${pendiente.numero}`,
        );
      }

      if (!response?.success || !response.data) {
        toast({
          title: "Sin oferta",
          description: `Este ${pendiente.tipo === "lead" ? "lead" : "cliente"} no tiene oferta asignada.`,
          variant: "default",
        });
        return;
      }

      // Guardar la oferta y abrir el diálogo solo si realmente existe
      let ofertaEncontrada: OfertaConfeccion | null = null;
      if (
        pendiente.tipo === "lead" &&
        response.data.ofertas &&
        response.data.ofertas.length > 0
      ) {
        ofertaEncontrada = response.data.ofertas[0];
      } else if (pendiente.tipo === "cliente") {
        ofertaEncontrada = response.data;
      }

      if (!ofertaEncontrada) {
        toast({
          title: "Sin oferta",
          description: `Este ${pendiente.tipo === "lead" ? "lead" : "cliente"} no tiene oferta asignada.`,
          variant: "default",
        });
        return;
      }

      setOfertaCargada(ofertaEncontrada);
      setOfertaDialogOpen(true);
    } catch (error: any) {
      console.error("Error al cargar oferta:", error);
      setOfertaCargada(null);
      setOfertaDialogOpen(false);
      toast({
        title: "Sin oferta",
        description: `Este ${pendiente.tipo === "lead" ? "lead" : "cliente"} no tiene oferta asignada.`,
        variant: "default",
      });
    }
  };

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-orange-600">
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
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="w-full border rounded px-3 py-2"
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="leads">Leads</option>
                <option value="clientes">Clientes</option>
              </select>
            </div>
            <div>
              <Label htmlFor="provincia">Provincia</Label>
              <select
                id="provincia"
                className="w-full border rounded px-3 py-2"
                value={provinciaFilter}
                onChange={(e) => setProvinciaFilter(e.target.value)}
              >
                <option value="todas">Todas</option>
                {provincias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pendientes de Visita ({pendientesFiltrados.length})</span>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-blue-50">
                <User className="h-3 w-3 mr-1" />
                {countLeads} Leads
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <FileText className="h-3 w-3 mr-1" />
                {countClientes} Clientes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendientesFiltrados.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay pendientes de visita
              </h3>
              <p className="text-gray-600">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {pendientesFiltrados.map((pendiente) => (
                  <Card key={pendiente.id} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {pendiente.nombre}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{pendiente.telefono}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span>{pendiente.direccion}</span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            pendiente.tipo === "lead" ? "default" : "secondary"
                          }
                          className={
                            pendiente.tipo === "lead"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {pendiente.tipo === "lead" ? "Lead" : "Cliente"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Provincia:</p>
                          <p className="text-gray-700">{pendiente.provincia}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Municipio:</p>
                          <p className="text-gray-700">
                            {pendiente.municipio || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Comercial:</p>
                          <p className="text-gray-700">
                            {pendiente.comercial || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Prioridad:</p>
                          <Badge
                            variant="outline"
                            className={
                              pendiente.prioridad === "Alta"
                                ? "bg-red-50 text-red-700"
                                : pendiente.prioridad === "Media"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-gray-50 text-gray-700"
                            }
                          >
                            {pendiente.prioridad}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fuente:</p>
                        <p className="text-sm text-gray-700">
                          {pendiente.fuente || "N/A"}
                        </p>
                      </div>

                      {pendiente.comentario && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Comentario:
                          </p>
                          <p className="text-sm text-gray-700">
                            {pendiente.comentario}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={() => handleCompletarVisita(pendiente)}
                        size="sm"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-xs h-8"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-16">
                        Tipo
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-32">
                        Nombre
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-28">
                        Teléfono
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-64">
                        Dirección
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-32">
                        Ubicación
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-20">
                        Com.
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-56">
                        Comentario
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-900 w-12">
                        P
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-900 w-48">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesFiltrados.map((pendiente) => (
                      <tr
                        key={pendiente.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-2 px-2">
                          <Badge
                            variant={
                              pendiente.tipo === "lead"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              pendiente.tipo === "lead"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {pendiente.tipo === "lead" ? "L" : "C"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          <p className="font-semibold text-gray-900">
                            {pendiente.nombre}
                          </p>
                          {pendiente.numero && (
                            <p className="text-xs text-gray-500">
                              #{pendiente.numero}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <p className="text-gray-700">{pendiente.telefono}</p>
                        </td>
                        <td className="py-2 px-2">
                          <p className="text-gray-700">
                            {pendiente.direccion || "N/A"}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <p className="text-gray-900 font-medium">
                            {pendiente.provincia}
                          </p>
                          <p className="text-xs text-gray-500">
                            {pendiente.municipio || "N/A"}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <p className="text-xs text-gray-700 truncate">
                            {pendiente.comercial
                              ? pendiente.comercial.split(" ")[0]
                              : "N/A"}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <p className="text-xs text-gray-700 whitespace-normal break-words">
                            {pendiente.comentario || "N/A"}
                          </p>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center h-7 w-7 justify-center mx-auto">
                            <PriorityDot
                              prioridad={
                                pendiente.prioridad as "Alta" | "Media" | "Baja"
                              }
                              onChange={(prioridad) =>
                                console.log(
                                  "Cambiar prioridad:",
                                  pendiente.id,
                                  prioridad,
                                )
                              }
                              disabled={false}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => handleVerOferta(pendiente)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                            >
                              Ver Oferta
                            </Button>
                            <Button
                              onClick={() => handleCompletarVisita(pendiente)}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-xs h-7 px-2"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completar
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

      {/* Diálogo para ver oferta */}
      <VerOfertaClienteDialog
        open={ofertaDialogOpen}
        onOpenChange={setOfertaDialogOpen}
        oferta={ofertaCargada}
        ofertas={[]}
      />

      {/* Diálogo para completar visita */}
      <CompletarVisitaDialog
        open={completarVisitaDialogOpen}
        onOpenChange={setCompletarVisitaDialogOpen}
        pendiente={pendienteSeleccionado}
        onSuccess={handleVisitaCompletada}
      />
    </>
  );
}
