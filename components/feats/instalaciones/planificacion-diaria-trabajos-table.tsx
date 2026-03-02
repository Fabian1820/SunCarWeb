"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { apiRequest } from "@/lib/api-config";
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
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { ClienteFotosDialog } from "@/components/feats/instalaciones/cliente-fotos-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  ClipboardList,
  Eye,
  Save,
  Trash2,
  Truck,
  Zap,
} from "lucide-react";
import type { ClienteFoto } from "@/lib/api-types";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import type {
  BrigadaPlanificacionOption,
  PlanTrabajoItem,
  PlanTrabajoStorage,
  TecnicoPlanificacionOption,
  TipoTrabajoPlanificado,
  TrabajoPlanificable,
} from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";

const STORAGE_KEY = "suncar_planificacion_diaria_trabajos_v1";

const TYPE_LABEL: Record<TipoTrabajoPlanificado, string> = {
  visita: "Visita",
  entrega_equipamiento: "Entrega de Equipamiento",
  instalacion_nueva: "Instalación Nueva",
  instalacion_en_proceso: "Instalación en Proceso",
  averia: "Avería",
};

const TYPE_BADGE_CLASS: Record<TipoTrabajoPlanificado, string> = {
  visita: "bg-orange-100 text-orange-800",
  entrega_equipamiento: "bg-blue-100 text-blue-800",
  instalacion_nueva: "bg-emerald-100 text-emerald-800",
  instalacion_en_proceso: "bg-purple-100 text-purple-800",
  averia: "bg-red-100 text-red-800",
};

const TYPE_ORDER: Record<TipoTrabajoPlanificado, number> = {
  visita: 1,
  entrega_equipamiento: 2,
  instalacion_nueva: 3,
  instalacion_en_proceso: 4,
  averia: 5,
};

const getTomorrowDateInput = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

const readPlansFromStorage = (): PlanTrabajoStorage => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PlanTrabajoStorage;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const writePlansToStorage = (plans: PlanTrabajoStorage) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

const BRIGADA_PREFIX = "brigada:";
const TECNICO_PREFIX = "tecnico:";

interface AsignacionOption {
  id: string;
  nombre: string;
  tipo: "brigada" | "tecnico";
}

interface OfertaTrabajoItem {
  material_codigo?: string;
  descripcion?: string;
  cantidad?: number;
  cantidad_pendiente_por_entregar?: number;
  cantidad_en_servicio?: number;
  en_servicio?: boolean;
  entregas?: Array<{ cantidad?: number; fecha?: string }>;
}

interface OfertaTrabajo {
  id?: string;
  _id?: string;
  oferta_id?: string;
  numero_oferta?: string;
  nombre?: string;
  nombre_automatico?: string;
  items?: OfertaTrabajoItem[];
}

const isPrefixedAsignacion = (value: string) =>
  value.startsWith(BRIGADA_PREFIX) || value.startsWith(TECNICO_PREFIX);

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ofertaTieneEntregas = (oferta: OfertaTrabajo) =>
  Array.isArray(oferta.items) &&
  oferta.items.some((item) =>
    Array.isArray(item.entregas)
      ? item.entregas.some((entrega) => toNumber(entrega.cantidad) > 0)
      : false,
  );

interface PlanificacionDiariaTrabajosTableProps {
  trabajos: TrabajoPlanificable[];
  brigadas: BrigadaPlanificacionOption[];
  tecnicos: TecnicoPlanificacionOption[];
  loading: boolean;
}

export function PlanificacionDiariaTrabajosTable({
  trabajos,
  brigadas,
  tecnicos,
  loading,
}: PlanificacionDiariaTrabajosTableProps) {
  const { toast } = useToast();
  const [fechaPlanificacion, setFechaPlanificacion] = useState(
    getTomorrowDateInput(),
  );
  const [tipoTrabajoActivo, setTipoTrabajoActivo] =
    useState<TipoTrabajoPlanificado>("visita");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [asignacionPorTrabajo, setAsignacionPorTrabajo] = useState<
    Record<string, string>
  >({});
  const [comentarioPorTrabajo, setComentarioPorTrabajo] = useState<
    Record<string, string>
  >({});
  const [planEnCurso, setPlanEnCurso] = useState<PlanTrabajoItem[]>([]);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  const [ofertaCargada, setOfertaCargada] = useState<OfertaConfeccion | null>(
    null,
  );
  const [ofertasCargadas, setOfertasCargadas] = useState<OfertaConfeccion[]>(
    [],
  );
  const [fotosDialogData, setFotosDialogData] = useState<{
    nombre: string;
    codigo?: string;
    fotos: ClienteFoto[];
  } | null>(null);
  const [materialesDialogData, setMaterialesDialogData] = useState<{
    trabajoNombre: string;
    oferta: OfertaTrabajo | null;
  } | null>(null);
  const [servicioDialogData, setServicioDialogData] = useState<{
    trabajoNombre: string;
    itemsEnServicio: OfertaTrabajoItem[];
  } | null>(null);

  const trabajosByUid = useMemo(() => {
    const map = new Map<string, TrabajoPlanificable>();
    trabajos.forEach((trabajo) => {
      map.set(trabajo.uid, trabajo);
    });
    return map;
  }, [trabajos]);

  const brigadasByIdRaw = useMemo(() => {
    const map = new Map<string, BrigadaPlanificacionOption>();
    brigadas.forEach((brigada) => {
      map.set(brigada.id, brigada);
    });
    return map;
  }, [brigadas]);
  const tecnicosByIdRaw = useMemo(() => {
    const map = new Map<string, TecnicoPlanificacionOption>();
    tecnicos.forEach((tecnico) => {
      map.set(tecnico.id, tecnico);
    });
    return map;
  }, [tecnicos]);
  const brigadaOptions = useMemo<AsignacionOption[]>(
    () =>
      brigadas.map((brigada) => ({
        id: `${BRIGADA_PREFIX}${brigada.id}`,
        nombre: brigada.nombre,
        tipo: "brigada",
      })),
    [brigadas],
  );
  const tecnicoOptions = useMemo<AsignacionOption[]>(
    () =>
      tecnicos.map((tecnico) => ({
        id: `${TECNICO_PREFIX}${tecnico.id}`,
        nombre: tecnico.nombre,
        tipo: "tecnico",
      })),
    [tecnicos],
  );
  const asignacionesById = useMemo(() => {
    const map = new Map<string, AsignacionOption>();
    [...brigadaOptions, ...tecnicoOptions].forEach((option) => {
      map.set(option.id, option);
    });
    return map;
  }, [brigadaOptions, tecnicoOptions]);
  const brigadaIds = useMemo(
    () => new Set(brigadaOptions.map((item) => item.id)),
    [brigadaOptions],
  );
  const tecnicoIds = useMemo(
    () => new Set(tecnicoOptions.map((item) => item.id)),
    [tecnicoOptions],
  );

  const normalizeAsignacionId = useCallback(
    (value: string, tipo: TipoTrabajoPlanificado) => {
      void tipo;
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (isPrefixedAsignacion(raw)) return raw;

      if (tecnicosByIdRaw.has(raw)) return `${TECNICO_PREFIX}${raw}`;
      if (brigadasByIdRaw.has(raw)) return `${BRIGADA_PREFIX}${raw}`;
      return raw;
    },
    [brigadasByIdRaw, tecnicosByIdRaw],
  );

  const getOpcionesAsignacion = useCallback(
    (tipo: TipoTrabajoPlanificado) => {
      void tipo;
      return {
        brigadas: brigadaOptions,
        tecnicos: tecnicoOptions,
      };
    },
    [brigadaOptions, tecnicoOptions],
  );

  const getNombreAsignacion = useCallback(
    (asignacionId: string) => {
      const option = asignacionesById.get(asignacionId);
      return option?.nombre || "";
    },
    [asignacionesById],
  );

  const isAsignacionValida = useCallback(
    (tipo: TipoTrabajoPlanificado, asignacionId: string) => {
      void tipo;
      if (!asignacionId) return false;
      return brigadaIds.has(asignacionId) || tecnicoIds.has(asignacionId);
    },
    [brigadaIds, tecnicoIds],
  );

  const cantidadesPorTipo = useMemo(() => {
    const counters: Record<TipoTrabajoPlanificado, number> = {
      visita: 0,
      entrega_equipamiento: 0,
      instalacion_nueva: 0,
      instalacion_en_proceso: 0,
      averia: 0,
    };
    trabajos.forEach((trabajo) => {
      counters[trabajo.tipo] += 1;
    });
    return counters;
  }, [trabajos]);

  const trabajosDelTipoActivo = useMemo(
    () => trabajos.filter((trabajo) => trabajo.tipo === tipoTrabajoActivo),
    [tipoTrabajoActivo, trabajos],
  );

  const planificadosIds = useMemo(
    () => new Set(planEnCurso.map((item) => item.uid)),
    [planEnCurso],
  );

  const resumenPlanPorTipo = useMemo(() => {
    const grouped = new Map<TipoTrabajoPlanificado, PlanTrabajoItem[]>();
    planEnCurso.forEach((item) => {
      const current = grouped.get(item.tipo) || [];
      grouped.set(item.tipo, [...current, item]);
    });

    return Array.from(grouped.entries()).sort(
      (a, b) => TYPE_ORDER[a[0]] - TYPE_ORDER[b[0]],
    );
  }, [planEnCurso]);

  const buildPlanItem = (trabajo: TrabajoPlanificable): PlanTrabajoItem => {
    const brigadaId = normalizeAsignacionId(
      asignacionPorTrabajo[trabajo.uid] || "",
      trabajo.tipo,
    );
    const comentario = (comentarioPorTrabajo[trabajo.uid] || "").trim();

    return {
      uid: trabajo.uid,
      tipo: trabajo.tipo,
      nombre: trabajo.nombre,
      telefono: trabajo.telefono,
      direccion: trabajo.direccion,
      descripcionTrabajo: trabajo.descripcionTrabajo,
      brigadaId,
      brigadaNombre: getNombreAsignacion(brigadaId),
      comentario: comentario || undefined,
      fechaReferencia: trabajo.fechaReferencia,
    };
  };

  useEffect(() => {
    const plans = readPlansFromStorage();
    const saved = plans[fechaPlanificacion] || null;

    if (!saved) {
      setPlanEnCurso([]);
      setActualizadoEn(null);
      setSeleccionados(new Set());
      setAsignacionPorTrabajo({});
      setComentarioPorTrabajo({});
      return;
    }

    const itemsRaw = Array.isArray(saved.items) ? saved.items : [];
    const items = itemsRaw.map((item) => {
      const normalizedId = normalizeAsignacionId(
        item.brigadaId || "",
        item.tipo,
      );
      return {
        ...item,
        brigadaId: normalizedId,
        brigadaNombre: getNombreAsignacion(normalizedId) || item.brigadaNombre,
      };
    });
    const seleccionadosSet = new Set<string>();
    const asignaciones: Record<string, string> = {};
    const comentarios: Record<string, string> = {};

    items.forEach((item) => {
      seleccionadosSet.add(item.uid);
      if (item.brigadaId) asignaciones[item.uid] = item.brigadaId;
      if (item.comentario) comentarios[item.uid] = item.comentario;
    });

    setPlanEnCurso(items);
    setActualizadoEn(saved.actualizadoEn || null);
    setSeleccionados(seleccionadosSet);
    setAsignacionPorTrabajo(asignaciones);
    setComentarioPorTrabajo(comentarios);
  }, [fechaPlanificacion, getNombreAsignacion, normalizeAsignacionId]);

  const syncPlanItem = (
    uid: string,
    overrides?: { brigadaId?: string; comentario?: string },
  ) => {
    const trabajo = trabajosByUid.get(uid);
    if (!trabajo) return;

    const brigadaId = normalizeAsignacionId(
      overrides?.brigadaId ?? asignacionPorTrabajo[uid] ?? "",
      trabajo.tipo,
    );
    const comentario = (
      overrides?.comentario ??
      comentarioPorTrabajo[uid] ??
      ""
    ).trim();
    const brigadaNombre = getNombreAsignacion(brigadaId);

    setPlanEnCurso((prev) => {
      const exists = prev.some((item) => item.uid === uid);
      const updated: PlanTrabajoItem = {
        uid: trabajo.uid,
        tipo: trabajo.tipo,
        nombre: trabajo.nombre,
        telefono: trabajo.telefono,
        direccion: trabajo.direccion,
        descripcionTrabajo: trabajo.descripcionTrabajo,
        brigadaId,
        brigadaNombre,
        comentario: comentario || undefined,
        fechaReferencia: trabajo.fechaReferencia,
      };

      if (!exists) return [...prev, updated];
      return prev.map((item) => (item.uid === uid ? updated : item));
    });
  };

  const toggleSeleccion = (uid: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(uid);

      if (isSelected) {
        next.delete(uid);
        setPlanEnCurso((current) => current.filter((item) => item.uid !== uid));
      } else {
        next.add(uid);
        const trabajo = trabajosByUid.get(uid);
        if (trabajo) {
          setPlanEnCurso((current) => {
            if (current.some((item) => item.uid === uid)) return current;
            return [...current, buildPlanItem(trabajo)];
          });
        }
      }

      return next;
    });
  };

  const handleAsignacionChange = (uid: string, brigadaId: string) => {
    const trabajo = trabajosByUid.get(uid);
    if (!trabajo) return;
    const normalizedId = normalizeAsignacionId(brigadaId, trabajo.tipo);
    setAsignacionPorTrabajo((prev) => ({ ...prev, [uid]: normalizedId }));
    if (seleccionados.has(uid) || planificadosIds.has(uid)) {
      syncPlanItem(uid, { brigadaId: normalizedId });
    }
  };

  const handleComentarioChange = (uid: string, comentario: string) => {
    setComentarioPorTrabajo((prev) => ({ ...prev, [uid]: comentario }));
    if (seleccionados.has(uid) || planificadosIds.has(uid)) {
      syncPlanItem(uid, { comentario });
    }
  };

  const quitarDelPlan = (uid: string) => {
    setPlanEnCurso((prev) => prev.filter((item) => item.uid !== uid));
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.delete(uid);
      return next;
    });
  };

  const getVisitaFotos = (trabajo: TrabajoPlanificable): ClienteFoto[] => {
    if (!Array.isArray(trabajo.fotos)) return [];
    return trabajo.fotos as ClienteFoto[];
  };

  const handleVerFotos = (trabajo: TrabajoPlanificable) => {
    setFotosDialogData({
      nombre: trabajo.nombre,
      codigo:
        trabajo.contactoTipo === "cliente"
          ? trabajo.contactoNumero || trabajo.contactoId
          : undefined,
      fotos: getVisitaFotos(trabajo),
    });
  };

  const extractOfertasFromResponse = (
    response: { success?: boolean; data?: unknown } | null,
  ): OfertaTrabajo[] => {
    if (!response?.success || !response.data) return [];
    const payload = response.data as Record<string, unknown>;
    if (Array.isArray(payload.ofertas)) {
      return payload.ofertas as OfertaTrabajo[];
    }
    if (payload && typeof payload === "object") {
      return [payload as OfertaTrabajo];
    }
    return [];
  };

  const loadOfertasTrabajo = async (
    trabajo: TrabajoPlanificable,
  ): Promise<OfertaTrabajo[]> => {
    let response: { success?: boolean; data?: unknown } | null = null;
    if (trabajo.contactoTipo === "lead") {
      response = await apiRequest<{ success?: boolean; data?: unknown }>(
        `/ofertas/confeccion/lead/${trabajo.contactoId}`,
      );
    } else {
      const clienteId = trabajo.contactoNumero || trabajo.contactoId;
      response = await apiRequest<{ success?: boolean; data?: unknown }>(
        `/ofertas/confeccion/cliente/${clienteId}`,
      );
    }
    return extractOfertasFromResponse(response);
  };

  const handleVerOferta = async (trabajo: TrabajoPlanificable) => {
    try {
      setOfertaCargada(null);
      setOfertasCargadas([]);
      setOfertaDialogOpen(false);

      const ofertas = await loadOfertasTrabajo(trabajo);
      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description: "No hay oferta disponible para este trabajo.",
        });
        return;
      }

      const ofertasTyped = ofertas as unknown as OfertaConfeccion[];
      setOfertaCargada(ofertasTyped[0]);
      setOfertasCargadas(ofertasTyped);
      setOfertaDialogOpen(true);
    } catch {
      toast({
        title: "Sin oferta",
        description: "No se pudo cargar la oferta de este trabajo.",
      });
    }
  };

  const handleVerMaterialesEntregados = async (
    trabajo: TrabajoPlanificable,
  ) => {
    try {
      const ofertas = await loadOfertasTrabajo(trabajo);
      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description: "No hay oferta disponible para ver materiales.",
        });
        return;
      }
      const withEntregas = ofertas.find((oferta) =>
        ofertaTieneEntregas(oferta),
      );
      setMaterialesDialogData({
        trabajoNombre: trabajo.nombre,
        oferta: withEntregas || ofertas[0],
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales entregados.",
        variant: "destructive",
      });
    }
  };

  const handleVerEnServicio = async (trabajo: TrabajoPlanificable) => {
    try {
      const ofertas = await loadOfertasTrabajo(trabajo);
      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description: "No hay oferta disponible para ver equipos en servicio.",
        });
        return;
      }
      const oferta = ofertas[0];
      const items = Array.isArray(oferta.items) ? oferta.items : [];
      const itemsEnServicio = items.filter(
        (item) =>
          item.en_servicio === true || toNumber(item.cantidad_en_servicio) > 0,
      );
      setServicioDialogData({
        trabajoNombre: trabajo.nombre,
        itemsEnServicio,
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los equipos en servicio.",
        variant: "destructive",
      });
    }
  };

  const guardarPlan = () => {
    if (planEnCurso.length === 0) {
      toast({
        title: "Plan vacío",
        description: "Selecciona al menos un trabajo para guardar.",
        variant: "destructive",
      });
      return;
    }

    const faltanAsignaciones = planEnCurso.filter(
      (item) => !isAsignacionValida(item.tipo, item.brigadaId),
    );

    if (faltanAsignaciones.length > 0) {
      toast({
        title: "Faltan asignaciones",
        description: `${faltanAsignaciones.length} trabajo(s) no tienen brigada o técnico asignado.`,
        variant: "destructive",
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const plans = readPlansFromStorage();
    plans[fechaPlanificacion] = {
      fecha: fechaPlanificacion,
      actualizadoEn: nowIso,
      items: planEnCurso,
    };
    writePlansToStorage(plans);
    setActualizadoEn(nowIso);

    toast({
      title: "Planificación guardada",
      description: `Plan guardado para ${fechaPlanificacion}.`,
    });
  };

  const nuevaPlanificacion = () => {
    const plans = readPlansFromStorage();
    delete plans[fechaPlanificacion];
    writePlansToStorage(plans);

    setPlanEnCurso([]);
    setActualizadoEn(null);
    setSeleccionados(new Set());
    setAsignacionPorTrabajo({});
    setComentarioPorTrabajo({});

    toast({
      title: "Nueva planificación",
      description: "Se limpió el plan del día seleccionado.",
    });
  };

  const materialesEntregadosRows = useMemo(() => {
    const items = materialesDialogData?.oferta?.items;
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const entregas = Array.isArray(item.entregas) ? item.entregas : [];
        const entregado = entregas.reduce(
          (sum, entrega) => sum + toNumber(entrega.cantidad),
          0,
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
      .filter((row) => row.total > 0 || row.entregado > 0 || row.pendiente > 0);
  }, [materialesDialogData]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start min-h-0">
      <div className="xl:col-span-9 min-h-0">
        <div className="space-y-6 max-h-[62vh] sm:max-h-[68vh] xl:max-h-[calc(100vh-var(--module-header-height,96px)-2.25rem)] overflow-y-auto overscroll-contain pr-1">
          <Card className="border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>Planificación para el día {fechaPlanificacion}</span>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={fechaPlanificacion}
                    onChange={(event) =>
                      setFechaPlanificacion(event.target.value)
                    }
                    className="w-[190px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={nuevaPlanificacion}
                  >
                    Nueva planificación
                  </Button>
                  <Button
                    type="button"
                    className="bg-purple-700 hover:bg-purple-800"
                    onClick={guardarPlan}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              </CardTitle>
              {actualizadoEn ? (
                <p className="text-sm text-gray-500">
                  Última actualización:{" "}
                  {new Date(actualizadoEn).toLocaleString("es-ES")}
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Selecciona el tipo de trabajo tocando una tarjeta:
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoTrabajoActivo("visita")}
                  className={`rounded-md border p-2 text-left transition-all ${
                    tipoTrabajoActivo === "visita"
                      ? "border-orange-500 bg-orange-100 ring-1 ring-orange-300"
                      : "border-orange-200 bg-orange-50 hover:bg-orange-100"
                  }`}
                >
                  <p className="text-[11px] font-medium text-orange-700">
                    Visitas
                  </p>
                  <p className="text-lg leading-tight font-bold text-orange-900">
                    {cantidadesPorTipo.visita}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoTrabajoActivo("entrega_equipamiento")}
                  className={`rounded-md border p-2 text-left transition-all ${
                    tipoTrabajoActivo === "entrega_equipamiento"
                      ? "border-blue-500 bg-blue-100 ring-1 ring-blue-300"
                      : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  <p className="text-[11px] font-medium text-blue-700">
                    Entrega Equip.
                  </p>
                  <p className="text-lg leading-tight font-bold text-blue-900">
                    {cantidadesPorTipo.entrega_equipamiento}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoTrabajoActivo("instalacion_nueva")}
                  className={`rounded-md border p-2 text-left transition-all ${
                    tipoTrabajoActivo === "instalacion_nueva"
                      ? "border-emerald-500 bg-emerald-100 ring-1 ring-emerald-300"
                      : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  <p className="text-[11px] font-medium text-emerald-700">
                    Instal. Nuevas
                  </p>
                  <p className="text-lg leading-tight font-bold text-emerald-900">
                    {cantidadesPorTipo.instalacion_nueva}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoTrabajoActivo("instalacion_en_proceso")}
                  className={`rounded-md border p-2 text-left transition-all ${
                    tipoTrabajoActivo === "instalacion_en_proceso"
                      ? "border-purple-500 bg-purple-100 ring-1 ring-purple-300"
                      : "border-purple-200 bg-purple-50 hover:bg-purple-100"
                  }`}
                >
                  <p className="text-[11px] font-medium text-purple-700">
                    Instal. Proceso
                  </p>
                  <p className="text-lg leading-tight font-bold text-purple-900">
                    {cantidadesPorTipo.instalacion_en_proceso}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoTrabajoActivo("averia")}
                  className={`rounded-md border p-2 text-left transition-all ${
                    tipoTrabajoActivo === "averia"
                      ? "border-red-500 bg-red-100 ring-1 ring-red-300"
                      : "border-red-200 bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <p className="text-[11px] font-medium text-red-700">
                    Averías
                  </p>
                  <p className="text-lg leading-tight font-bold text-red-900">
                    {cantidadesPorTipo.averia}
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-600">
            <CardHeader>
              <CardTitle>
                Trabajos de {TYPE_LABEL[tipoTrabajoActivo]} (
                {trabajosDelTipoActivo.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-gray-600">
                  Cargando trabajos...
                </div>
              ) : trabajosDelTipoActivo.length === 0 ? (
                <div className="py-10 text-center text-gray-600">
                  No hay trabajos para este tipo.
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="w-full table-fixed text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 w-10">Sel.</th>
                          <th className="text-left py-2 px-2">Nombre</th>
                          <th className="text-left py-2 px-2">Teléfono</th>
                          <th className="text-left py-2 px-2">Dirección</th>
                          {tipoTrabajoActivo === "visita" ? (
                            <>
                              <th className="text-left py-2 px-2">
                                Motivo de visita
                              </th>
                              <th className="text-left py-2 px-2">Comercial</th>
                            </>
                          ) : null}
                          {tipoTrabajoActivo === "instalacion_en_proceso" ? (
                            <th className="text-left py-2 px-2">Qué falta</th>
                          ) : null}
                          <th className="text-left py-2 px-2">Acciones</th>
                          <th className="text-left py-2 px-2">
                            Brigada / Técnico
                          </th>
                          <th className="text-left py-2 px-2">
                            Comentario de planificación
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trabajosDelTipoActivo.map((trabajo) => {
                          const selected = seleccionados.has(trabajo.uid);
                          const opciones = getOpcionesAsignacion(trabajo.tipo);
                          const asignacionActual = normalizeAsignacionId(
                            asignacionPorTrabajo[trabajo.uid] || "",
                            trabajo.tipo,
                          );
                          const comentarioPlaceholder =
                            trabajo.tipo === "entrega_equipamiento" ||
                            trabajo.tipo === "instalacion_nueva" ||
                            trabajo.tipo === "instalacion_en_proceso"
                              ? "Ej: Entregar paneles + inversor a las 9:30 AM"
                              : "Comentario...";

                          return (
                            <tr
                              key={trabajo.uid}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-2 px-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSeleccion(trabajo.uid)}
                                />
                              </td>
                              <td className="py-2 px-2 align-top">
                                <p className="font-medium text-gray-900 break-words">
                                  {trabajo.nombre}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {trabajo.contactoTipo === "cliente"
                                    ? "Cliente"
                                    : "Lead"}
                                  {trabajo.contactoNumero
                                    ? ` • ${trabajo.contactoNumero}`
                                    : ""}
                                </p>
                              </td>
                              <td className="py-2 px-2 align-top text-gray-700 break-words">
                                {trabajo.telefono || "Sin teléfono"}
                              </td>
                              <td className="py-2 px-2 align-top text-gray-700 break-words">
                                {trabajo.direccion || "Sin dirección"}
                              </td>

                              {tipoTrabajoActivo === "visita" ? (
                                <>
                                  <td className="py-2 px-2 align-top text-gray-700 break-words">
                                    {trabajo.motivo || "N/A"}
                                  </td>
                                  <td className="py-2 px-2 align-top text-gray-700 break-words">
                                    {trabajo.comercial || "N/A"}
                                  </td>
                                </>
                              ) : null}

                              {tipoTrabajoActivo ===
                              "instalacion_en_proceso" ? (
                                <td className="py-2 px-2 align-top text-gray-700 break-words">
                                  {trabajo.faltaInstalacion ||
                                    "No especificado"}
                                </td>
                              ) : null}

                              <td className="py-2 px-2 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                  {(trabajo.tipo === "visita" ||
                                    trabajo.tipo === "entrega_equipamiento" ||
                                    trabajo.tipo === "instalacion_nueva" ||
                                    trabajo.tipo ===
                                      "instalacion_en_proceso") && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] border-sky-300 text-sky-700 hover:bg-sky-50"
                                      onClick={() => handleVerFotos(trabajo)}
                                    >
                                      <Camera className="h-3 w-3 mr-1" />
                                      Fotos
                                    </Button>
                                  )}

                                  {(trabajo.tipo === "visita" ||
                                    trabajo.tipo === "entrega_equipamiento" ||
                                    trabajo.tipo === "instalacion_nueva" ||
                                    trabajo.tipo ===
                                      "instalacion_en_proceso") && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px]"
                                      onClick={() => handleVerOferta(trabajo)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Oferta
                                    </Button>
                                  )}

                                  {(trabajo.tipo === "entrega_equipamiento" ||
                                    trabajo.tipo === "instalacion_nueva" ||
                                    trabajo.tipo ===
                                      "instalacion_en_proceso") && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                      onClick={() =>
                                        handleVerMaterialesEntregados(trabajo)
                                      }
                                    >
                                      <Truck className="h-3 w-3 mr-1" />
                                      Entregados
                                    </Button>
                                  )}

                                  {trabajo.tipo ===
                                    "instalacion_en_proceso" && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] border-purple-300 text-purple-700 hover:bg-purple-50"
                                      onClick={() =>
                                        handleVerEnServicio(trabajo)
                                      }
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      En servicio
                                    </Button>
                                  )}
                                </div>
                              </td>

                              <td className="py-2 px-2 align-top">
                                <select
                                  className="w-full border rounded-md h-9 px-2 bg-white text-xs"
                                  value={asignacionActual}
                                  onChange={(event) =>
                                    handleAsignacionChange(
                                      trabajo.uid,
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">Sin asignar</option>
                                  <optgroup label="Brigadas">
                                    {opciones.brigadas.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.nombre}
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Técnicos">
                                    {opciones.tecnicos.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.nombre}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </td>

                              <td className="py-2 px-2 align-top">
                                <Input
                                  value={
                                    comentarioPorTrabajo[trabajo.uid] || ""
                                  }
                                  placeholder={comentarioPlaceholder}
                                  onChange={(event) =>
                                    handleComentarioChange(
                                      trabajo.uid,
                                      event.target.value,
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {trabajosDelTipoActivo.map((trabajo) => {
                      const selected = seleccionados.has(trabajo.uid);
                      const opciones = getOpcionesAsignacion(trabajo.tipo);
                      const asignacionActual = normalizeAsignacionId(
                        asignacionPorTrabajo[trabajo.uid] || "",
                        trabajo.tipo,
                      );
                      const comentarioPlaceholder =
                        trabajo.tipo === "entrega_equipamiento" ||
                        trabajo.tipo === "instalacion_nueva" ||
                        trabajo.tipo === "instalacion_en_proceso"
                          ? "Equipos + horario"
                          : "Comentario...";

                      return (
                        <div
                          key={trabajo.uid}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={selected}
                              onChange={() => toggleSeleccion(trabajo.uid)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 break-words">
                                {trabajo.nombre}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 break-words">
                                {trabajo.telefono || "Sin teléfono"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 break-words">
                                {trabajo.direccion || "Sin dirección"}
                              </p>
                            </div>
                          </div>

                          {trabajo.tipo === "visita" ? (
                            <>
                              <p className="text-xs text-gray-600">
                                Motivo de visita: {trabajo.motivo || "N/A"}
                              </p>
                              <p className="text-xs text-gray-600">
                                Comercial: {trabajo.comercial || "N/A"}
                              </p>
                            </>
                          ) : null}

                          {trabajo.tipo === "instalacion_en_proceso" ? (
                            <p className="text-xs text-gray-600">
                              Qué falta:{" "}
                              {trabajo.faltaInstalacion || "No especificado"}
                            </p>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2">
                            {(trabajo.tipo === "visita" ||
                              trabajo.tipo === "entrega_equipamiento" ||
                              trabajo.tipo === "instalacion_nueva" ||
                              trabajo.tipo === "instalacion_en_proceso") && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-sky-300 text-sky-700 hover:bg-sky-50"
                                onClick={() => handleVerFotos(trabajo)}
                              >
                                <Camera className="h-3.5 w-3.5 mr-1" />
                                Fotos
                              </Button>
                            )}

                            {(trabajo.tipo === "visita" ||
                              trabajo.tipo === "entrega_equipamiento" ||
                              trabajo.tipo === "instalacion_nueva" ||
                              trabajo.tipo === "instalacion_en_proceso") && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => handleVerOferta(trabajo)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Oferta
                              </Button>
                            )}

                            {(trabajo.tipo === "entrega_equipamiento" ||
                              trabajo.tipo === "instalacion_nueva" ||
                              trabajo.tipo === "instalacion_en_proceso") && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() =>
                                  handleVerMaterialesEntregados(trabajo)
                                }
                              >
                                <Truck className="h-3.5 w-3.5 mr-1" />
                                Entregados
                              </Button>
                            )}

                            {trabajo.tipo === "instalacion_en_proceso" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => handleVerEnServicio(trabajo)}
                              >
                                <Zap className="h-3.5 w-3.5 mr-1" />
                                Servicio
                              </Button>
                            )}
                          </div>

                          <select
                            className="w-full border rounded-md h-10 px-3 bg-white"
                            value={asignacionActual}
                            onChange={(event) =>
                              handleAsignacionChange(
                                trabajo.uid,
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Sin asignar</option>
                            <optgroup label="Brigadas">
                              {opciones.brigadas.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.nombre}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Técnicos">
                              {opciones.tecnicos.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.nombre}
                                </option>
                              ))}
                            </optgroup>
                          </select>

                          <Input
                            value={comentarioPorTrabajo[trabajo.uid] || ""}
                            placeholder={comentarioPlaceholder}
                            onChange={(event) =>
                              handleComentarioChange(
                                trabajo.uid,
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="xl:col-span-3 min-h-0">
        <div className="max-h-[52vh] sm:max-h-[56vh] xl:max-h-[calc(100vh-var(--module-header-height,96px)-2.25rem)] overflow-y-auto overscroll-contain pr-1">
          <Card className="border-l-4 border-l-emerald-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                  Planificación en curso ({planEnCurso.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {planEnCurso.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Aún no has seleccionado trabajos para la planificación.
                </p>
              ) : (
                <div className="space-y-4">
                  {resumenPlanPorTipo.map(([tipo, items]) => (
                    <div key={tipo} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={TYPE_BADGE_CLASS[tipo]}>
                          {TYPE_LABEL[tipo]}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {items.length} trabajo(s)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.uid}
                            className="border border-gray-100 rounded-md p-3 bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.nombre}
                                </p>
                                <p className="text-sm text-gray-700">
                                  {item.descripcionTrabajo}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.direccion}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Asignado a:{" "}
                                  <span className="font-medium">
                                    {item.brigadaNombre || "Sin asignar"}
                                  </span>
                                </p>
                                {item.comentario ? (
                                  <p className="text-xs text-blue-700 mt-1">
                                    Comentario: {item.comentario}
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => quitarDelPlan(item.uid)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <VerOfertaClienteDialog
        open={ofertaDialogOpen}
        onOpenChange={setOfertaDialogOpen}
        oferta={ofertaCargada}
        ofertas={ofertasCargadas}
      />

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

      <ClienteFotosDialog
        open={!!fotosDialogData}
        onOpenChange={(open) => {
          if (!open) setFotosDialogData(null);
        }}
        clienteNombre={fotosDialogData?.nombre || ""}
        clienteCodigo={fotosDialogData?.codigo}
        fotos={fotosDialogData?.fotos || []}
      />
    </div>
  );
}
