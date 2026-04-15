"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Calendar, Plus, Truck, Zap, Pencil, Trash2 } from "lucide-react";
import type { PlanificacionDiaria } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { apiRequest } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { ClienteService, BrigadaService, TrabajadorService } from "@/lib/api-services";
import { EditarTrabajoDialog } from "./editar-trabajo-dialog";

interface ListaPlanificacionesTableProps {
  planificaciones: PlanificacionDiaria[];
  loading: boolean;
  onVerPlanificacion: (planificacion: PlanificacionDiaria) => void;
  onEditarPlanificacion?: (planificacion: PlanificacionDiaria) => void;
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

interface FilaPlanificacionTabla {
  planificacion: PlanificacionDiaria;
  planificacionId: string;
  trabajo: PlanificacionDiaria["trabajos"][0];
  itemInfo: TrabajoConInfo;
  fechaLabel: string;
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
  onEditarPlanificacion,
  onCrearNueva,
  onRecargar,
}: ListaPlanificacionesTableProps) {
  const { toast } = useToast();
  const [trabajosPorPlanificacion, setTrabajosPorPlanificacion] = useState<
    Record<string, TrabajoConInfo[]>
  >({});
  const [cargandoTrabajos, setCargandoTrabajos] = useState<Set<string>>(new Set());
  const [trabajoEditando, setTrabajoEditando] = useState<PlanificacionDiaria["trabajos"][0] | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [eliminandoPlanificacionId, setEliminandoPlanificacionId] = useState<string | null>(null);
  const [materialesDialogData, setMaterialesDialogData] = useState<{
    trabajoNombre: string;
    oferta: OfertaTrabajo | null;
  } | null>(null);
  const [servicioDialogData, setServicioDialogData] = useState<{
    trabajoNombre: string;
    itemsEnServicio: OfertaItem[];
  } | null>(null);

  const cargarTrabajosConInfo = useCallback(async (planificacionId: string) => {
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
          const materiales: MaterialPrincipal[] = [];
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
                items.forEach((itemRaw) => {
                  const item = itemRaw as Record<string, unknown>;
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

            // 3. Cargar información de la brigada o trabajador usando el ID de MongoDB
            try {
              // Primero intentar cargar como brigada usando el ID de MongoDB
              const brigada = await BrigadaService.getBrigadaById(trabajo.brigada_id);
              
              console.log(`Brigada ${trabajo.brigada_id} cargada:`, brigada);
              
              if (brigada && brigada.lider_ci) {
                // Es una brigada, ahora obtener el nombre del líder usando su CI
                const trabajadorLider = await TrabajadorService.getTrabajadorByCI(brigada.lider_ci);
                console.log(`Líder de brigada cargado:`, trabajadorLider);
                
                if (trabajadorLider?.nombre) {
                  brigadaNombre = `Brigada de ${trabajadorLider.nombre}`;
                  console.log(`Brigada nombre asignado: ${brigadaNombre}`);
                } else {
                  brigadaNombre = `Brigada ${brigada.lider_ci}`;
                  console.log(`Brigada sin nombre de líder, usando CI: ${brigadaNombre}`);
                }
              } else {
                // No es una brigada, el ID debe ser de un trabajador
                // Necesitamos obtener todos los trabajadores y buscar por ID de MongoDB
                console.log(`No es brigada, buscando trabajador con ID: ${trabajo.brigada_id}`);
                const todosTrabajadores = await TrabajadorService.getAllTrabajadores();
                const trabajador = todosTrabajadores.find(
                  (t) => t.id === trabajo.brigada_id || t.CI === trabajo.brigada_id
                );
                console.log(`Trabajador encontrado:`, trabajador);
                
                if (trabajador?.nombre) {
                  brigadaNombre = trabajador.nombre;
                  console.log(`Trabajador individual asignado: ${brigadaNombre}`);
                } else {
                  brigadaNombre = `Asignado: ${trabajo.brigada_id}`;
                  console.log(`No se pudo cargar ni brigada ni trabajador, usando ID: ${brigadaNombre}`);
                }
              }
            } catch (error) {
              console.error(`Error cargando brigada/trabajador ${trabajo.brigada_id}:`, error);
              brigadaNombre = `Asignado: ${trabajo.brigada_id}`;
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
  }, [planificaciones]);

  const toNumber = (value: unknown): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    const idsPendientes = planificaciones
      .map((planificacion) => planificacion.id || "")
      .filter(
        (planificacionId) =>
          planificacionId &&
          !trabajosPorPlanificacion[planificacionId] &&
          !cargandoTrabajos.has(planificacionId),
      );

    idsPendientes.forEach((planificacionId) => {
      void cargarTrabajosConInfo(planificacionId);
    });
  }, [
    planificaciones,
    trabajosPorPlanificacion,
    cargandoTrabajos,
    cargarTrabajosConInfo,
  ]);

  const filasTabla = useMemo<FilaPlanificacionTabla[]>(() => {
    const rows: FilaPlanificacionTabla[] = [];

    planificaciones.forEach((planificacion) => {
      const planificacionId = planificacion.id || "";
      if (!planificacionId) return;

      const fechaDate = new Date(planificacion.fecha);
      const fechaLabel = Number.isNaN(fechaDate.getTime())
        ? planificacion.fecha
        : fechaDate.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });

      const trabajosInfo = trabajosPorPlanificacion[planificacionId];
      if (Array.isArray(trabajosInfo) && trabajosInfo.length > 0) {
        trabajosInfo.forEach((itemInfo) => {
          rows.push({
            planificacion,
            planificacionId,
            trabajo: itemInfo.trabajo,
            itemInfo,
            fechaLabel,
          });
        });
        return;
      }

      planificacion.trabajos.forEach((trabajo) => {
        rows.push({
          planificacion,
          planificacionId,
          trabajo,
          itemInfo: {
            trabajo,
            nombre: trabajo.contacto_id,
            telefono: "Sin teléfono",
            direccion: "Sin dirección",
            brigadaNombre: trabajo.brigada_id,
            materiales: [],
            tieneEntregas: false,
            tieneEnServicio: false,
          },
          fechaLabel,
        });
      });
    });

    rows.sort((a, b) => b.planificacion.fecha.localeCompare(a.planificacion.fecha));
    return rows;
  }, [planificaciones, trabajosPorPlanificacion]);

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

  const handleEliminarPlanificacion = async (planificacionId: string) => {
    if (!confirm("¿Deseas borrar toda esta planificación y todos sus trabajos?")) {
      return;
    }

    setEliminandoPlanificacionId(planificacionId);
    try {
      const response = await PlanificacionDiariaService.eliminarPlanificacionDiaria(
        planificacionId,
      );

      if (!response.success) {
        throw new Error(response.message || "Error al eliminar la planificación");
      }

      toast({
        title: "Planificación eliminada",
        description: "La planificación se eliminó correctamente.",
      });

      setTrabajosPorPlanificacion((prev) => {
        const next = { ...prev };
        delete next[planificacionId];
        return next;
      });

      if (onRecargar) {
        await onRecargar();
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la planificación",
        variant: "destructive",
      });
    } finally {
      setEliminandoPlanificacionId(null);
    }
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-left py-2 px-2">Cliente y datos</th>
                  <th className="text-left py-2 px-2">Tipo de trabajo</th>
                  <th className="text-left py-2 px-2">Brigada / Técnico</th>
                  <th className="text-left py-2 px-2">Materiales principales</th>
                  <th className="text-left py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((fila, index) => {
                  const estaCargando = cargandoTrabajos.has(fila.planificacionId);
                  const materialesTexto =
                    fila.itemInfo.materiales.length > 0
                      ? fila.itemInfo.materiales
                          .map((material) => `${material.cantidad}x ${material.descripcion}`)
                          .join(" · ")
                      : "Sin materiales principales";

                  return (
                    <tr
                      key={`${fila.planificacionId}-${fila.trabajo.id || index}`}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="py-2 px-2 whitespace-nowrap">
                        <p className="font-medium text-slate-900">{fila.fechaLabel}</p>
                        <p className="text-xs text-slate-500">
                          {fila.planificacion.trabajos.length} trabajo(s)
                        </p>
                      </td>
                      <td className="py-2 px-2">
                        <p className="font-medium text-slate-900">
                          {estaCargando ? "Cargando..." : fila.itemInfo.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {fila.trabajo.contacto_tipo === "cliente" ? "Cliente" : "Lead"} ·{" "}
                          {fila.trabajo.contacto_id}
                        </p>
                        <p className="text-xs text-slate-700">
                          {estaCargando ? "..." : fila.itemInfo.telefono}
                        </p>
                        <p className="text-xs text-slate-700">
                          {estaCargando ? "..." : fila.itemInfo.direccion}
                        </p>
                      </td>
                      <td className="py-2 px-2">
                        <Badge className={TYPE_BADGE_CLASS[fila.trabajo.tipo_trabajo] || ""}>
                          {TYPE_LABEL[fila.trabajo.tipo_trabajo] || fila.trabajo.tipo_trabajo}
                        </Badge>
                        {fila.trabajo.comentario ? (
                          <p className="text-xs text-blue-700 mt-2">
                            {fila.trabajo.comentario}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-sm text-slate-800">
                          {estaCargando ? "Cargando..." : fila.itemInfo.brigadaNombre}
                        </span>
                      </td>
                      <td className="py-2 px-2 max-w-[320px]">
                        <span
                          className="text-xs text-slate-700 break-words"
                          title={materialesTexto}
                        >
                          {materialesTexto}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleVerMaterialesEntregados(fila.itemInfo)}
                            className={`inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-xs ${
                              fila.itemInfo.tieneEntregas
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            {fila.itemInfo.tieneEntregas ? "Con entregas" : "Sin entregas"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerEnServicio(fila.itemInfo)}
                            className={`inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-xs ${
                              fila.itemInfo.tieneEnServicio
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                            }`}
                          >
                            <Zap className="h-3 w-3" />
                            {fila.itemInfo.tieneEnServicio ? "En servicio" : "Sin servicio"}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => onVerPlanificacion(fila.planificacion)}
                          >
                            Ver
                          </Button>
                          {onEditarPlanificacion && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => onEditarPlanificacion(fila.planificacion)}
                            >
                              Plan
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-red-400 text-red-700 hover:bg-red-50"
                            onClick={() =>
                              handleEliminarPlanificacion(fila.planificacionId)
                            }
                            disabled={eliminandoPlanificacionId === fila.planificacionId}
                          >
                            {eliminandoPlanificacionId === fila.planificacionId
                              ? "Eliminando plan..."
                              : "Borrar plan"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                            onClick={() => setTrabajoEditando(fila.trabajo)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Trabajo
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (fila.trabajo.id) {
                                handleEliminarTrabajo(fila.planificacionId, fila.trabajo.id);
                              }
                            }}
                            disabled={!fila.trabajo.id || eliminando === fila.trabajo.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {eliminando === fila.trabajo.id ? "..." : "Borrar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
