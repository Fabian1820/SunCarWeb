"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Truck, Zap } from "lucide-react";
import type { PlanificacionDiaria } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { apiRequest } from "@/lib/api-config";

interface VerPlanificacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planificacion: PlanificacionDiaria | null;
  onDescargarPDF?: () => void;
}

interface MaterialPrincipal {
  categoria: string;
  descripcion: string;
  cantidad: number;
}

interface TrabajoConMateriales {
  trabajo: PlanificacionDiaria["trabajos"][0];
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

export function VerPlanificacionDialog({
  open,
  onOpenChange,
  planificacion,
  onDescargarPDF,
}: VerPlanificacionDialogProps) {
  const [trabajosConMateriales, setTrabajosConMateriales] = useState<TrabajoConMateriales[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!open || !planificacion) {
      setTrabajosConMateriales([]);
      return;
    }

    const cargarMateriales = async () => {
      setCargando(true);
      try {
        const trabajosConInfo = await Promise.all(
          planificacion.trabajos.map(async (trabajo) => {
            let materiales: MaterialPrincipal[] = [];
            let tieneEntregas = false;
            let tieneEnServicio = false;

            try {
              // Cargar oferta del trabajo
              let response;
              if (trabajo.contacto_tipo === "lead") {
                response = await apiRequest<{ success?: boolean; data?: unknown }>(
                  `/ofertas/confeccion/lead/${trabajo.contacto_id}`
                );
              } else {
                response = await apiRequest<{ success?: boolean; data?: unknown }>(
                  `/ofertas/confeccion/cliente/${trabajo.contacto_id}`
                );
              }

              if (response?.success && response.data) {
                const payload = response.data as Record<string, unknown>;
                const ofertas = Array.isArray(payload.ofertas)
                  ? payload.ofertas
                  : [payload];

                if (ofertas.length > 0) {
                  const oferta = ofertas[0] as Record<string, unknown>;
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
            } catch (error) {
              console.error("Error cargando materiales:", error);
            }

            return {
              trabajo,
              materiales,
              tieneEntregas,
              tieneEnServicio,
            };
          })
        );

        setTrabajosConMateriales(trabajosConInfo);
      } finally {
        setCargando(false);
      }
    };

    void cargarMateriales();
  }, [open, planificacion]);

  if (!planificacion) return null;

  const fecha = new Date(planificacion.fecha);
  const fechaFormateada = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Agrupar por tipo
  const trabajosPorTipo = trabajosConMateriales.reduce((acc, item) => {
    const tipo = item.trabajo.tipo_trabajo;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(item);
    return acc;
  }, {} as Record<string, TrabajoConMateriales[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="capitalize">{fechaFormateada}</span>
            {onDescargarPDF && (
              <Button
                type="button"
                onClick={onDescargarPDF}
                className="bg-purple-700 hover:bg-purple-800"
              >
                Descargar PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Total de trabajos:</strong> {planificacion.trabajos.length}
            </p>
            {planificacion.updated_at && (
              <p className="text-sm text-gray-600">
                <strong>Última actualización:</strong>{" "}
                {new Date(planificacion.updated_at).toLocaleString("es-ES")}
              </p>
            )}
          </div>

          {cargando ? (
            <div className="py-10 text-center text-gray-600">
              Cargando información de materiales...
            </div>
          ) : (
            Object.entries(trabajosPorTipo).map(([tipo, items]) => (
              <div key={tipo} className="border rounded-lg p-4">
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
                      className="border border-gray-200 rounded-md p-3 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.trabajo.contacto_tipo === "cliente"
                              ? "Cliente"
                              : "Lead"}{" "}
                            - {item.trabajo.contacto_id}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            <strong>Tipo:</strong> {item.trabajo.tipo_trabajo}
                          </p>
                          <p className="text-sm text-gray-700">
                            <strong>Brigada:</strong> {item.trabajo.brigada_id}
                          </p>
                          {item.trabajo.comentario && (
                            <p className="text-sm text-blue-700 mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                              <strong>Comentario:</strong> {item.trabajo.comentario}
                            </p>
                          )}

                          {/* Materiales principales */}
                          {item.materiales.length > 0 && (
                            <div className="mt-3 p-2 bg-gray-50 rounded">
                              <p className="text-xs font-medium text-gray-700 mb-1">
                                Materiales principales:
                              </p>
                              <div className="space-y-1">
                                {item.materiales.map((material, idx) => (
                                  <p key={idx} className="text-xs text-gray-600">
                                    • {material.cantidad}x {material.descripcion}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Iconos de estado */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className={`h-8 w-8 ${
                              item.tieneEntregas
                                ? "border-green-600 bg-green-500 text-white"
                                : "border-gray-300 text-gray-400"
                            }`}
                            title={
                              item.tieneEntregas
                                ? "Tiene entregas registradas"
                                : "Sin entregas"
                            }
                            disabled
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className={`h-8 w-8 ${
                              item.tieneEnServicio
                                ? "border-purple-600 bg-purple-500 text-white"
                                : "border-gray-300 text-gray-400"
                            }`}
                            title={
                              item.tieneEnServicio
                                ? "Tiene equipos en servicio"
                                : "Sin equipos en servicio"
                            }
                            disabled
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
