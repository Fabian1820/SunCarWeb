"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Calendar, ChevronDown, ChevronUp, Plus, Truck, Zap, Pencil, Trash2 } from "lucide-react";
import type { PlanificacionDiaria } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { apiRequest } from "@/lib/api-config";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ClienteService, BrigadaService } from "@/lib/api-services";
import { EditarTrabajoDialog } from "./editar-trabajo-dialog";

interface ListaPlanificacionesTableProps {
  planificaciones: PlanificacionDiaria[];
  loading: boolean;
  onVerPlanificacion: (planificacion: PlanificacionDiaria) => void;
  onCrearNueva: () => void;
  onRecargar?: () => Promise<void>;
}

interface MaterialPrincipal {
  categoria: string;
  descripcion: string;
  cantidad: number;
}

interface OfertaItem {
  material_codigo?: string;
  descripcion?: string;
  cantidad?: number;
  entregas?: Array<{ cantidad: number }>;
  cantidad_pendiente_por_entregar?: number;
  en_servicio?: boolean;
  cantidad_en_servicio?: number;
}

interface OfertaTrabajo {
  items?: OfertaItem[];
}

interface TrabajoConInfo {
  trabajo: PlanificacionDiaria["trabajos"][0];
  nombre: string;
  telefono: string;
  direccion: string;
  brigadaNombre: string;
  materiales: MaterialPrincipal[];
  tieneEntregas: boolean;
  tieneEnServicio: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  visita: "Visitas",
  entrega_equipamiento: "Entrega de Equipamiento",
  instalacion_nueva: "Instalaciones Nuevas",
  instalacion_en_proceso: "Instalaciones en Proceso",
  averia: "Averías",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  visita: "bg-orange-100 text-orange-800 border-orange-300",
  entrega_equipamiento: "bg-blue-100 text-blue-800 border-blue-300",
  instalacion_nueva: "bg-emerald-100 text-emerald-800 border-emerald-300",
  instalacion_en_proceso: "bg-purple-100 text-purple-800 border-purple-300",
  averia: "bg-red-100 text-red-800 border-red-300",
};

export function ListaPlanificacionesTable({
  planificaciones,
  loading,
  onVerPlanificacion,
  onCrearNueva,
  onRecargar,
}: ListaPlanificacionesTableProps) {
  const { toast } = useToast();
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [trabajosPorPlanificacion, setTrabajosPorPlanificacion] = useState<
    Record<string, TrabajoConInfo[]>
  >({});
  const [cargandoTrabajos, setCargandoTrabajos] = useState<Set<string>>(new Set());
  const [trabajoEditando, setTrabajoEditando] = useState<PlanificacionDiaria["trabajos"][0] | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [materialesDialogData, setMaterialesDialogData] = useState<{
    trabajoNombre: string;
    oferta: OfertaTrabajo | null;
  } | null>(null);
  const [servicioDialogData, setServicioDialogData] = useState<{
    trabajoNombre: string;
    itemsEnServicio: OfertaItem[];
  } | null>(null);

  const toggleExpanded = async (planificacionId: string) => {
    const newExpandidos = new Set(expandidos);
    
    if (newExpandidos.has(planificacionId)) {
      newExpandidos.delete(planificacionId);
    } else {
      newExpandidos.add(planificacionId);
      
      // Si no hemos cargado los trabajos, cargarlos ahora
      if (!trabajosPorPlanificacion[planificacionId]) {
        await cargarTrabajosConInfo(planificacionId);
      }
    }
    
    setExpandidos(newExpandidos);
  };

  const cargarTrabajosConInfo = async (planificacionId: string) => {
    const planificacion = planificaciones.find((p) => p.id === planificacionId);
    if (!planificacion) return;

    setCargandoTrabajos((prev) => new Set(prev).add(planificacionId));

    try {
      const trabajosConInfo = await Promise.all(
        planificacion.trabajos.map(async (trabajo) => {
          let nombre = "";
          let telefono = "";
          let direccion = "";
          let brigadaNombre = trabajo.brigada_id;
          let materiales: MaterialPrincipal[] = [];
          let tieneEntregas = false;
          let tieneEnServicio = false;

          try {
            // 1. Primero cargar la oferta para obtener el número de cliente real
            let ofertaResponse;
            if (trabajo.contacto_tipo === "lead") {
              ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
                `/ofertas/confeccion/lead/${trabajo.contacto_id}`
              );
            } else {
              ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
                `/ofertas/confeccion/cliente/${trabajo.contacto_id}`
              );
            }

            let numeroCliente = trabajo.contacto_id;

            if (ofertaResponse?.success && ofertaResponse.data) {
              const payload = ofertaResponse.data as Record<string, unknown>;
              const ofertas = Array.isArray(payload.ofertas)
                ? payload.ofertas
                : [payload];

              if (ofertas.length > 0) {
                const oferta = ofertas[0] as Record<string, unknown>;
                
                // Obtener el número de cliente de la oferta
                numeroCliente = String(oferta.numero_cliente || oferta.cliente_numero || trabajo.contacto_id);

                const items = Array.isArray(oferta.items) ? oferta.items : [];

                // Extraer materiales principales (INVERSORES, BATERÍAS, PANELES)
                items.forEach((item: any) => {
                  const categoria = String(item.categoria || "").toUpperCase();
                  if (
                    categoria === "INVERSORES" ||
                    categoria === "BATERÍAS" ||
                    categoria === "PANELES"
                  ) {
                    materiales.push({
                      categoria,
                      descripcion: String(item.descripcion || ""),
                      cantidad: Number(item.cantidad || 0),
                    });
                  }

                  // Verificar entregas
                  const entregas = Array.isArray(item.entregas) ? item.entregas : [];
                  if (entregas.length > 0) {
                    tieneEntregas = true;
                  }

                  // Verificar en servicio
                  if (
                    item.en_servicio === true ||
                    Number(item.cantidad_en_servicio || 0) > 0
                  ) {
                    tieneEnServicio = true;
                  }
                });
              }
            }

            // 2. Ahora cargar información del contacto con el número correcto
            if (trabajo.contacto_tipo === "lead") {
              try {
                const contactoResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
                  `/leads/${trabajo.contacto_id}`
                );
                
                if (contactoResponse?.success && contactoResponse.data) {
                  const contacto = contactoResponse.data as Record<string, unknown>;
                  nombre = String(contacto.nombre || trabajo.contacto_id);
                  telefono = String(contacto.telefono || "Sin teléfono");
                  direccion = String(contacto.direccion || "Sin dirección");
                }
              } catch (error) {
                console.error(`Error cargando lead ${trabajo.contacto_id}:`, error);
                nombre = trabajo.contacto_id;
              }
            } else {
              // Para clientes, usar ClienteService con el número obtenido de la oferta
              try {
                // Buscar el cliente por número usando el servicio
                const clientesResponse = await ClienteService.getClientes({ numero: numeroCliente });
                const clientes = clientesResponse.clients || [];
                
                if (clientes.length > 0) {
                  const cliente = clientes[0];
                  nombre = String(cliente.nombre || numeroCliente);
                  telefono = String(cliente.telefono || "Sin teléfono");
                  direccion = String(cliente.direccion || "Sin dirección");
                  
                  console.log(`Cliente ${numeroCliente} cargado:`, { nombre, telefono, direccion });
                } else {
                  console.warn(`Cliente ${numeroCliente} no encontrado`);
                  nombre = numeroCliente;
                }
              } catch (error) {
                console.error(`Error cargando cliente ${numeroCliente}:`, error);
                nombre = numeroCliente;
              }
            }

            // 3. Cargar información de la brigada
            try {
              const brigada = await BrigadaService.getBrigadaById(trabajo.brigada_id);
              
              console.log(`Brigada ${trabajo.brigada_id} cargada:`, brigada);
              
              if (brigada) {
                const lider = brigada.lider;
                const nombreLider = lider?.nombre ? String(lider.nombre) : "";
                
                if (nombreLider) {
                  brigadaNombre = `Brigada de ${nombreLider}`;
                  console.log(`Brigada nombre asignado: ${brigadaNombre}`);
                } else {
                  brigadaNombre = `Brigada ${trabajo.brigada_id}`;
                  console.log(`Brigada sin líder, usando ID: ${brigadaNombre}`);
                }
              } else {
                console.warn(`No se pudo cargar brigada ${trabajo.brigada_id}`);
                brigadaNombre = `Brigada ${trabajo.brigada_id}`;
              }
            } catch (error) {
              console.error(`Error cargando brigada ${trabajo.brigada_id}:`, error);
              brigadaNombre = `Brigada ${trabajo.brigada_id}`;
            }
          } catch (error) {
            console.error("Error cargando información del trabajo:", error);
            nombre = trabajo.contacto_id;
          }

          return {
            trabajo,
            nombre,
            telefono,
            direccion,
            brigadaNombre,
            materiales,
            tieneEntregas,
            tieneEnServicio,
          };
        })
      );

      setTrabajosPorPlanificacion((prev) => ({
        ...prev,
        [planificacionId]: trabajosConInfo,
      }));
    } finally {
      setCargandoTrabajos((prev) => {
        const next = new Set(prev);
        next.delete(planificacionId);
        return next;
      });
    }
  };

  const toNumber = (value: unknown): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const handleVerMaterialesEntregados = async (item: TrabajoConInfo) => {
    try {
      let ofertaResponse;
      if (item.trabajo.contacto_tipo === "lead") {
        ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
          `/ofertas/confeccion/lead/${item.trabajo.contacto_id}`
        );
      } else {
        ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
          `/ofertas/confeccion/cliente/${item.trabajo.contacto_id}`
        );
      }

      if (ofertaResponse?.success && ofertaResponse.data) {
        const payload = ofertaResponse.data as Record<string, unknown>;
        const ofertas = Array.isArray(payload.ofertas)
          ? payload.ofertas
          : [payload];

        if (ofertas.length > 0) {
          setMaterialesDialogData({
            trabajoNombre: item.nombre,
            oferta: ofertas[0] as OfertaTrabajo,
          });
        } else {
          toast({
            title: "Sin oferta",
            description: "No hay oferta disponible para ver materiales.",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales entregados.",
        variant: "destructive",
      });
    }
  };

  const handleVerEnServicio = async (item: TrabajoConInfo) => {
    try {
      let ofertaResponse;
      if (item.trabajo.contacto_tipo === "lead") {
        ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
          `/ofertas/confeccion/lead/${item.trabajo.contacto_id}`
        );
      } else {
        ofertaResponse = await apiRequest<{ success?: boolean; data?: unknown }>(
          `/ofertas/confeccion/cliente/${item.trabajo.contacto_id}`
        );
      }

      if (ofertaResponse?.success && ofertaResponse.data) {
        const payload = ofertaResponse.data as Record<string, unknown>;
        const ofertas = Array.isArray(payload.ofertas)
          ? payload.ofertas
          : [payload];

        if (ofertas.length > 0) {
          const oferta = ofertas[0] as OfertaTrabajo;
          const items = Array.isArray(oferta.items) ? oferta.items : [];
          const itemsEnServicio = items.filter(
            (item) =>
              item.en_servicio === true || toNumber(item.cantidad_en_servicio) > 0
          );
          setServicioDialogData({
            trabajoNombre: item.nombre,
            itemsEnServicio,
          });
        } else {
          toast({
            title: "Sin oferta",
            description: "No hay oferta disponible para ver equipos en servicio.",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los equipos en servicio.",
        variant: "destructive",
      });
    }
  };

  const handleEliminarTrabajo = async (planificacionId: string, trabajoId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este trabajo de la planificación?")) {
      return;
    }

    setEliminando(trabajoId);
    try {
      const response = await PlanificacionDiariaService.eliminarTrabajoDePlanificacion(
        planificacionId,
        trabajoId
      );

      if (response.success) {
        toast({
          title: "Trabajo eliminado",
          description: "El trabajo se eliminó correctamente de la planificación",
        });
        
        // Recargar planificaciones desde el padre
        if (onRecargar) {
          await onRecargar();
        }
        
        // Recargar los trabajos de esta planificación
        await cargarTrabajosConInfo(planificacionId);
      } else {
        throw new Error(response.message || "Error al eliminar el trabajo");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el trabajo",
        variant: "destructive",
      });
    } finally {
      setEliminando(null);
    }
  };

  const handleTrabajoActualizado = async (planificacionId: string) => {
    setTrabajoEditando(null);
    
    // Recargar planificaciones desde el padre
    if (onRecargar) {
      await onRecargar();
    }
    
    // Recargar los trabajos de esta planificación
    await cargarTrabajosConInfo(planificacionId);
  };

  const materialesEntregadosRows = materialesDialogData?.oferta?.items
    ? materialesDialogData.oferta.items
        .map((item) => {
          const entregas = Array.isArray(item.entregas) ? item.entregas : [];
          const entregado = entregas.reduce(
            (sum, entrega) => sum + toNumber(entrega.cantidad),
            0
          );
          const total = toNumber(item.cantidad);
          const pendiente =
            item.cantidad_pendiente_por_entregar !== undefined
              ? toNumber(item.cantidad_pendiente_por_entregar)
              : Math.max(0, total - entregado);
          return {
            codigo: String(item.material_codigo || "--"),
            descripcion: String(item.descripcion || "Material sin descripción"),
            total,
            entregado,
            pendiente,
          };
        })
        .filter((row) => row.total > 0 || row.entregado > 0 || row.pendiente > 0)
    : [];

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-700" />
            Planificaciones Diarias
          </span>
          <Button
            type="button"
            onClick={onCrearNueva}
            className="bg-purple-700 hover:bg-purple-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Planificación
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-gray-600">
            Cargando planificaciones...
          </div>
        ) : planificaciones.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-600 mb-4">
              No hay planificaciones creadas aún.
            </p>
            <Button
              type="button"
              onClick={onCrearNueva}
              className="bg-purple-700 hover:bg-purple-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Planificación
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {planificaciones.map((planificacion) => {
              const fecha = new Date(planificacion.fecha);
              const fechaFormateada = fecha.toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              const totalTrabajos = planificacion.trabajos?.length || 0;
              const isExpanded = expandidos.has(planificacion.id || "");
              const trabajos = trabajosPorPlanificacion[planificacion.id || ""] || [];
              const estaCargando = cargandoTrabajos.has(planificacion.id || "");

              // Agrupar trabajos por tipo
              const trabajosPorTipo = trabajos.reduce((acc, item) => {
                const tipo = item.trabajo.tipo_trabajo;
                if (!acc[tipo]) {
                  acc[tipo] = [];
                }
                acc[tipo].push(item);
                return acc;
              }, {} as Record<string, TrabajoConInfo[]>);

              return (
                <div
                  key={planificacion.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(planificacion.id || "")}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {fechaFormateada}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="bg-purple-50">
                            {totalTrabajos} trabajo(s)
                          </Badge>
                          {planificacion.updated_at && (
                            <span className="text-sm text-gray-500">
                              Actualizado:{" "}
                              {new Date(
                                planificacion.updated_at
                              ).toLocaleString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      {estaCargando ? (
                        <div className="py-6 text-center text-gray-600">
                          Cargando información de trabajos...
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(trabajosPorTipo).map(([tipo, items]) => (
                            <div key={tipo} className="bg-white rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-3">
                                <Badge className={TYPE_BADGE_CLASS[tipo] || ""}>
                                  {TYPE_LABEL[tipo] || tipo}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {items.length} trabajo(s)
                                </span>
                              </div>

                              <div className="space-y-3">
                                {items.map((item, index) => (
                                  <div
                                    key={`${item.trabajo.contacto_id}-${index}`}
                                    className="border border-gray-200 rounded-md p-3 bg-gray-50"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {/* Columna izquierda: Info del contacto */}
                                      <div className="space-y-2">
                                        <div>
                                          <p className="font-medium text-gray-900">{item.nombre}</p>
                                          <p className="text-xs text-gray-500">
                                            {item.trabajo.contacto_tipo === "cliente"
                                              ? "Cliente"
                                              : "Lead"}{" "}
                                            • {item.trabajo.contacto_id}
                                          </p>
                                        </div>
                                        <div className="text-sm text-gray-700">
                                          <p>📞 {item.telefono}</p>
                                          <p>📍 {item.direccion}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm">
                                            <span className="text-gray-600">Brigada:</span>{" "}
                                            <span className="font-medium text-purple-700">
                                              {item.brigadaNombre}
                                            </span>
                                          </p>
                                          {item.trabajo.comentario && (
                                            <p className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                                              💬 {item.trabajo.comentario}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Columna derecha: Materiales y acciones */}
                                      <div className="space-y-2">
                                        {/* Materiales principales */}
                                        <div className="bg-white rounded p-2 border">
                                          <p className="text-xs font-medium text-gray-700 mb-1">
                                            Materiales principales:
                                          </p>
                                          {item.materiales.length > 0 ? (
                                            <div className="space-y-1">
                                              {item.materiales.map((material, idx) => (
                                                <p key={idx} className="text-xs text-gray-600">
                                                  • <span className="font-medium">{material.cantidad}x</span>{" "}
                                                  {material.descripcion}
                                                </p>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-gray-400">Sin materiales</p>
                                          )}
                                        </div>

                                        {/* Acciones */}
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">Estado:</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleVerMaterialesEntregados(item);
                                              }}
                                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity ${
                                                item.tieneEntregas
                                                  ? "bg-green-100 text-green-800 border border-green-300"
                                                  : "bg-gray-100 text-gray-400 border border-gray-200"
                                              }`}
                                              title={
                                                item.tieneEntregas
                                                  ? "Ver entregas registradas"
                                                  : "Sin entregas"
                                              }
                                            >
                                              <Truck className="h-3 w-3" />
                                              {item.tieneEntregas ? "Con entregas" : "Sin entregas"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleVerEnServicio(item);
                                              }}
                                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity ${
                                                item.tieneEnServicio
                                                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                                                  : "bg-gray-100 text-gray-400 border border-gray-200"
                                              }`}
                                              title={
                                                item.tieneEnServicio
                                                  ? "Ver equipos en servicio"
                                                  : "Sin equipos en servicio"
                                              }
                                            >
                                              <Zap className="h-3 w-3" />
                                              {item.tieneEnServicio ? "En servicio" : "Sin servicio"}
                                            </button>
                                          </div>
                                          
                                          {/* Botones de editar y borrar */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">Acciones:</span>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setTrabajoEditando(item.trabajo);
                                              }}
                                            >
                                              <Pencil className="h-3 w-3 mr-1" />
                                              Editar
                                            </Button>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.trabajo.id && planificacion.id) {
                                                  handleEliminarTrabajo(planificacion.id, item.trabajo.id);
                                                }
                                              }}
                                              disabled={eliminando === item.trabajo.id}
                                            >
                                              <Trash2 className="h-3 w-3 mr-1" />
                                              {eliminando === item.trabajo.id ? "..." : "Borrar"}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Diálogo de materiales entregados */}
    <Dialog
      open={!!materialesDialogData}
      onOpenChange={(open) => {
        if (!open) setMaterialesDialogData(null);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Materiales entregados
            {materialesDialogData?.trabajoNombre
              ? ` - ${materialesDialogData.trabajoNombre}`
              : ""}
          </DialogTitle>
        </DialogHeader>

        {materialesEntregadosRows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            No hay materiales con entregas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2">Código</th>
                  <th className="text-left py-2 px-2">Descripción</th>
                  <th className="text-left py-2 px-2">Total</th>
                  <th className="text-left py-2 px-2">Entregado</th>
                  <th className="text-left py-2 px-2">Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {materialesEntregadosRows.map((row, index) => (
                  <tr
                    key={`${row.codigo}-${index}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2 px-2">{row.codigo}</td>
                    <td className="py-2 px-2">{row.descripcion}</td>
                    <td className="py-2 px-2">{row.total}</td>
                    <td className="py-2 px-2">{row.entregado}</td>
                    <td className="py-2 px-2">{row.pendiente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Diálogo de equipos en servicio */}
    <Dialog
      open={!!servicioDialogData}
      onOpenChange={(open) => {
        if (!open) setServicioDialogData(null);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Equipos en servicio
            {servicioDialogData?.trabajoNombre
              ? ` - ${servicioDialogData.trabajoNombre}`
              : ""}
          </DialogTitle>
        </DialogHeader>

        {!servicioDialogData ||
        servicioDialogData.itemsEnServicio.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            No hay equipos marcados en servicio.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2">Código</th>
                  <th className="text-left py-2 px-2">Descripción</th>
                  <th className="text-left py-2 px-2">
                    Cantidad en servicio
                  </th>
                </tr>
              </thead>
              <tbody>
                {servicioDialogData.itemsEnServicio.map((item, index) => (
                  <tr
                    key={`${String(item.material_codigo || "--")}-${index}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2 px-2">
                      {String(item.material_codigo || "--")}
                    </td>
                    <td className="py-2 px-2">
                      {String(item.descripcion || "Material sin descripción")}
                    </td>
                    <td className="py-2 px-2">
                      {toNumber(item.cantidad_en_servicio) ||
                        (item.en_servicio ? 1 : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Diálogo de editar trabajo */}
    <EditarTrabajoDialog
      open={!!trabajoEditando}
      onOpenChange={(open) => {
        if (!open) setTrabajoEditando(null);
      }}
      trabajo={trabajoEditando}
      onGuardado={() => {
        if (trabajoEditando) {
          // Encontrar la planificación que contiene este trabajo
          const planificacion = planificaciones.find((p) =>
            p.trabajos.some((t) => t.id === trabajoEditando.id)
          );
          if (planificacion?.id) {
            handleTrabajoActualizado(planificacion.id);
          }
        }
      }}
    />
  </>
  );
}
