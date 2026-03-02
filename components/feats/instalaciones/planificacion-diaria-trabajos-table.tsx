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
  TecnicoPlanificacionOption,
  TipoTrabajoPlanificado,
  TrabajoPlanificable,
} from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";
import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";

// Imports de módulos locales
import {
  TYPE_LABEL,
  TYPE_BADGE_CLASS,
  TYPE_ORDER,
  SUMMARY_VISIBLE_LIMIT,
  BRIGADA_PREFIX,
  TECNICO_PREFIX,
} from "./planificacion/constants";
import {
  getTomorrowDateInput,
  readPlansFromStorage,
  writePlansToStorage,
} from "./planificacion/storage-utils";
import {
  trabajoTieneEntregas,
  trabajoTieneEnServicio,
  isPrefixedAsignacion,
} from "./planificacion/trabajo-utils";
import { usePlanificacionData } from "./planificacion/use-planificacion-data";
import type { AsignacionOption, OfertaTrabajo, OfertaTrabajoItem } from "./planificacion/types";
import { toNumber, ofertaTieneEntregas } from "./planificacion/oferta-utils";

interface PlanificacionDiariaTrabajosTableProps {
  trabajos: TrabajoPlanificable[];
  brigadas: BrigadaPlanificacionOption[];
  tecnicos: TecnicoPlanificacionOption[];
  loading: boolean;
  onGuardadoExitoso?: () => void;
  onCancelar?: () => void;
}

export function PlanificacionDiariaTrabajosTable({
  trabajos,
  brigadas,
  tecnicos,
  loading,
  onGuardadoExitoso,
  onCancelar,
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
  const [planificacionId, setPlanificacionId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verPlanificacionDialog, setVerPlanificacionDialog] = useState(false);
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
  
  // Hook personalizado para cargar datos de entregas y servicio
  const {
    ofertasConEntregasIds,
    contactoKeysConEntregas,
    resumenServicioPorContacto,
    cargarResumenServicioEnSegundoPlano,
  } = usePlanificacionData();

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

  // Cargar resumen de servicio cuando cambia el tipo de trabajo activo
  useEffect(() => {
    if (
      tipoTrabajoActivo === "entrega_equipamiento" ||
      tipoTrabajoActivo === "instalacion_nueva" ||
      tipoTrabajoActivo === "instalacion_en_proceso"
    ) {
      void cargarResumenServicioEnSegundoPlano(trabajosDelTipoActivo);
    }
  }, [tipoTrabajoActivo, trabajosDelTipoActivo, cargarResumenServicioEnSegundoPlano]);

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

  const resumenPlanVisible = useMemo(
    () =>
      resumenPlanPorTipo.map(([tipo, items]) => ({
        tipo,
        total: items.length,
        visible: items.slice(0, SUMMARY_VISIBLE_LIMIT),
      })),
    [resumenPlanPorTipo],
  );

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
    const cargarPlanificacion = async () => {
      try {
        // Intentar cargar desde el backend
        const response = await PlanificacionDiariaService.obtenerPlanificacionPorFecha(fechaPlanificacion);
        
        if (response.success && response.data) {
          const planificacion = response.data;
          setPlanificacionId(planificacion.id || null);
          setActualizadoEn(planificacion.updated_at || planificacion.created_at || null);
          
          // Convertir trabajos del backend a items del plan
          const items: PlanTrabajoItem[] = planificacion.trabajos.map((trabajo) => {
            const trabajoLocal = trabajosByUid.get(
              `${trabajo.tipo_trabajo}:${trabajo.contacto_tipo}:${trabajo.contacto_id}`
            );
            
            const normalizedId = normalizeAsignacionId(
              trabajo.brigada_id || "",
              trabajo.tipo_trabajo as TipoTrabajoPlanificado,
            );
            
            return {
              uid: `${trabajo.tipo_trabajo}:${trabajo.contacto_tipo}:${trabajo.contacto_id}`,
              tipo: trabajo.tipo_trabajo as TipoTrabajoPlanificado,
              nombre: trabajoLocal?.nombre || "Trabajo",
              telefono: trabajoLocal?.telefono || "",
              direccion: trabajoLocal?.direccion || "",
              descripcionTrabajo: trabajo.tipo_trabajo,
              brigadaId: normalizedId,
              brigadaNombre: getNombreAsignacion(normalizedId),
              comentario: trabajo.comentario,
              fechaReferencia: trabajoLocal?.fechaReferencia,
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
          setSeleccionados(seleccionadosSet);
          setAsignacionPorTrabajo(asignaciones);
          setComentarioPorTrabajo(comentarios);
        } else {
          // No hay planificación para esta fecha, intentar cargar desde localStorage como fallback
          const plans = readPlansFromStorage();
          const saved = plans[fechaPlanificacion] || null;

          if (saved) {
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
            setPlanificacionId(null);
          } else {
            // No hay datos ni en backend ni en localStorage
            setPlanEnCurso([]);
            setActualizadoEn(null);
            setSeleccionados(new Set());
            setAsignacionPorTrabajo({});
            setComentarioPorTrabajo({});
            setPlanificacionId(null);
          }
        }
      } catch (error) {
        // Error al cargar desde backend, intentar localStorage
        const plans = readPlansFromStorage();
        const saved = plans[fechaPlanificacion] || null;

        if (saved) {
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
          setPlanificacionId(null);
        } else {
          setPlanEnCurso([]);
          setActualizadoEn(null);
          setSeleccionados(new Set());
          setAsignacionPorTrabajo({});
          setComentarioPorTrabajo({});
          setPlanificacionId(null);
        }
      }
    };

    void cargarPlanificacion();
  }, [fechaPlanificacion, getNombreAsignacion, normalizeAsignacionId, trabajosByUid]);

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

  const guardarPlan = async () => {
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

    setGuardando(true);
    try {
      // Paso 1: Crear cada trabajo de operación individualmente
      const trabajosCreados = await Promise.all(
        planEnCurso.map(async (item) => {
          // Extraer contacto_id del uid (formato: tipo:contactoTipo:contactoId)
          const parts = item.uid.split(":");
          const contactoId = parts[2] || item.uid;
          
          // Extraer el ID real de la brigada (quitar prefijo brigada: o tecnico:)
          let brigadaIdReal = item.brigadaId;
          if (brigadaIdReal.startsWith(BRIGADA_PREFIX)) {
            brigadaIdReal = brigadaIdReal.substring(BRIGADA_PREFIX.length);
          } else if (brigadaIdReal.startsWith(TECNICO_PREFIX)) {
            brigadaIdReal = brigadaIdReal.substring(TECNICO_PREFIX.length);
          }
          
          const trabajoData = {
            tipo_trabajo: item.tipo,
            contacto_tipo: parts[1] as "cliente" | "lead",
            contacto_id: contactoId,
            brigada_id: brigadaIdReal,
            comentario: item.comentario,
          };

          // Crear el trabajo de operación
          const response = await PlanificacionDiariaService.crearTrabajoOperacion(trabajoData);
          
          if (!response.success || !response.data) {
            throw new Error(`Error al crear trabajo para ${item.nombre}`);
          }
          
          return response.data;
        })
      );

      // Paso 2: Crear la planificación diaria con los trabajos creados
      const planificacion = {
        fecha: `${fechaPlanificacion}T00:00:00`,
        trabajos: trabajosCreados,
      };

      let response;
      if (planificacionId) {
        // Actualizar planificación existente
        response = await PlanificacionDiariaService.actualizarPlanificacionDiaria(
          planificacionId,
          planificacion
        );
      } else {
        // Crear nueva planificación
        response = await PlanificacionDiariaService.crearPlanificacionDiaria(
          planificacion
        );
      }

      if (response.success && response.data) {
        const nowIso = response.data.updated_at || response.data.created_at || new Date().toISOString();
        setActualizadoEn(nowIso);
        setPlanificacionId(response.data.id || null);

        // También guardar en localStorage como backup
        const plans = readPlansFromStorage();
        plans[fechaPlanificacion] = {
          fecha: fechaPlanificacion,
          actualizadoEn: nowIso,
          items: planEnCurso,
        };
        writePlansToStorage(plans);

        toast({
          title: "Planificación guardada",
          description: `Plan guardado exitosamente con ${trabajosCreados.length} trabajo(s) para ${fechaPlanificacion}.`,
        });

        // Limpiar los checkboxes y campos de entrada
        // pero mantener planEnCurso para que se vea en "Planificación en curso"
        setSeleccionados(new Set());
        setAsignacionPorTrabajo({});
        setComentarioPorTrabajo({});

        // Abrir el diálogo para ver la planificación
        setVerPlanificacionDialog(true);
      } else {
        throw new Error(response.message || "Error al guardar la planificación");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar la planificación";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  const nuevaPlanificacion = async () => {
    try {
      // Si existe una planificación en el backend, eliminarla
      if (planificacionId) {
        await PlanificacionDiariaService.eliminarPlanificacionDiaria(planificacionId);
      }

      // Eliminar del localStorage
      const plans = readPlansFromStorage();
      delete plans[fechaPlanificacion];
      writePlansToStorage(plans);

      setPlanEnCurso([]);
      setActualizadoEn(null);
      setSeleccionados(new Set());
      setAsignacionPorTrabajo({});
      setComentarioPorTrabajo({});
      setPlanificacionId(null);

      toast({
        title: "Nueva planificación",
        description: "Se limpió el plan del día seleccionado.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al limpiar la planificación";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
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

  const descargarPlanificacionPDF = () => {
    if (planEnCurso.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay trabajos en la planificación para descargar.",
        variant: "destructive",
      });
      return;
    }

    // Crear contenido HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Planificación Diaria - ${fechaPlanificacion}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #7c3aed;
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 10px;
          }
          .info {
            margin: 20px 0;
            padding: 10px;
            background-color: #f3f4f6;
            border-radius: 5px;
          }
          .tipo-section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .tipo-header {
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-weight: bold;
            font-size: 18px;
          }
          .visita { background-color: #fed7aa; color: #9a3412; }
          .entrega_equipamiento { background-color: #bfdbfe; color: #1e3a8a; }
          .instalacion_nueva { background-color: #a7f3d0; color: #065f46; }
          .instalacion_en_proceso { background-color: #ddd6fe; color: #5b21b6; }
          .averia { background-color: #fecaca; color: #991b1b; }
          .trabajo {
            border: 1px solid #e5e7eb;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
            background-color: #ffffff;
            page-break-inside: avoid;
          }
          .trabajo-nombre {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 8px;
          }
          .trabajo-detalle {
            margin: 5px 0;
            font-size: 14px;
          }
          .trabajo-detalle strong {
            color: #6b7280;
          }
          .comentario {
            margin-top: 10px;
            padding: 10px;
            background-color: #eff6ff;
            border-left: 3px solid #3b82f6;
            font-style: italic;
          }
          @media print {
            body { margin: 10px; }
            .tipo-section { page-break-inside: avoid; }
            .trabajo { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Planificación Diaria de Trabajos</h1>
        <div class="info">
          <p><strong>Fecha:</strong> ${fechaPlanificacion}</p>
          <p><strong>Total de trabajos:</strong> ${planEnCurso.length}</p>
          ${actualizadoEn ? `<p><strong>Última actualización:</strong> ${new Date(actualizadoEn).toLocaleString("es-ES")}</p>` : ""}
        </div>
        ${resumenPlanPorTipo
          .map(
            ([tipo, items]) => `
          <div class="tipo-section">
            <div class="tipo-header ${tipo}">
              ${TYPE_LABEL[tipo]} (${items.length})
            </div>
            ${items
              .map(
                (item) => `
              <div class="trabajo">
                <div class="trabajo-nombre">${item.nombre}</div>
                <div class="trabajo-detalle"><strong>Teléfono:</strong> ${item.telefono}</div>
                <div class="trabajo-detalle"><strong>Dirección:</strong> ${item.direccion}</div>
                <div class="trabajo-detalle"><strong>Descripción:</strong> ${item.descripcionTrabajo}</div>
                <div class="trabajo-detalle"><strong>Asignado a:</strong> ${item.brigadaNombre || "Sin asignar"}</div>
                ${item.comentario ? `<div class="comentario"><strong>Comentario:</strong> ${item.comentario}</div>` : ""}
              </div>
            `
              )
              .join("")}
          </div>
        `
          )
          .join("")}
      </body>
      </html>
    `;

    // Crear un blob y descargarlo
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planificacion-${fechaPlanificacion}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Abrir en nueva ventana para imprimir como PDF
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }

    toast({
      title: "PDF generado",
      description: "Se abrió una ventana para imprimir/guardar como PDF.",
    });
  };

  return (
    <div className="space-y-6 min-h-0">
      <div className="space-y-6 min-h-0">
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
                {onCancelar && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancelar}
                  >
                    Cancelar
                  </Button>
                )}
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
                  disabled={guardando}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {guardando ? "Guardando..." : "Guardar"}
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
                <p className="text-sm font-medium text-orange-700">Visitas</p>
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
                <p className="text-sm font-medium text-blue-700">
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
                <p className="text-sm font-medium text-emerald-700">
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
                <p className="text-sm font-medium text-purple-700">
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
                <p className="text-sm font-medium text-red-700">Averías</p>
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
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[1200px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 w-10">Sel.</th>
                        <th className="text-left py-2 px-2">Nombre</th>
                        <th className="text-left py-2 px-2 w-[10rem]">
                          Teléfono
                        </th>
                        <th className="text-left py-2 px-2">Dirección</th>
                        {tipoTrabajoActivo === "visita" ? (
                          <>
                            <th className="text-left py-2 px-2">Comentario</th>
                            <th className="text-left py-2 px-2">
                              Motivo de visita
                            </th>
                            <th className="text-left py-2 px-2">Comercial</th>
                          </>
                        ) : null}
                        {tipoTrabajoActivo === "instalacion_en_proceso" ? (
                          <th className="text-left py-2 px-2">Qué falta</th>
                        ) : null}
                        <th className="text-left py-2 px-2">
                          Brigada / Técnico
                        </th>
                        <th className="text-left py-2 px-2">
                          Comentario de planificación
                        </th>
                        <th className="text-left py-2 px-2 w-[8rem]">
                          Acciones
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
                              <p className="text-sm text-gray-500">
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
                                  {trabajo.comentarioModulo || "N/A"}
                                </td>
                                <td className="py-2 px-2 align-top text-gray-700 break-words">
                                  {trabajo.motivo || "N/A"}
                                </td>
                                <td className="py-2 px-2 align-top text-gray-700 break-words">
                                  {trabajo.comercial || "N/A"}
                                </td>
                              </>
                            ) : null}

                            {tipoTrabajoActivo === "instalacion_en_proceso" ? (
                              <td className="py-2 px-2 align-top text-gray-700 break-words">
                                {trabajo.faltaInstalacion || "No especificado"}
                              </td>
                            ) : null}

                            <td className="py-2 px-2 align-baseline">
                              <select
                                className="w-full border rounded-md h-9 px-2 bg-white text-sm"
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

                            <td className="py-2 px-2 align-baseline">
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
                            </td>

                            <td className="py-2 px-2 align-top">
                              <div className="inline-flex items-center gap-1 flex-nowrap">
                                {(trabajo.tipo === "visita" ||
                                  trabajo.tipo === "entrega_equipamiento" ||
                                  trabajo.tipo === "instalacion_nueva" ||
                                  trabajo.tipo ===
                                    "instalacion_en_proceso") && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 border-sky-300 text-sky-700 hover:bg-sky-50"
                                    onClick={() => handleVerFotos(trabajo)}
                                    title="Ver fotos y videos"
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                )}

                                {(trabajo.tipo === "entrega_equipamiento" ||
                                  trabajo.tipo === "instalacion_nueva" ||
                                  trabajo.tipo ===
                                    "instalacion_en_proceso") && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className={`h-8 w-8 ${
                                      trabajoTieneEntregas(trabajo, ofertasConEntregasIds, contactoKeysConEntregas)
                                        ? "border-green-600 bg-green-500 text-white hover:bg-green-600 hover:border-green-700"
                                        : "border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                    onClick={() =>
                                      handleVerMaterialesEntregados(trabajo)
                                    }
                                    title="Ver materiales entregados"
                                  >
                                    <Truck className="h-4 w-4" />
                                  </Button>
                                )}

                                {(trabajo.tipo === "entrega_equipamiento" ||
                                  trabajo.tipo === "instalacion_nueva" ||
                                  trabajo.tipo ===
                                    "instalacion_en_proceso") && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className={`h-8 w-8 ${
                                      trabajoTieneEnServicio(trabajo, resumenServicioPorContacto)
                                        ? "border-purple-600 bg-purple-500 text-white hover:bg-purple-600 hover:border-purple-700"
                                        : "border-gray-300 text-gray-500 hover:bg-gray-50"
                                    }`}
                                    onClick={() => handleVerEnServicio(trabajo)}
                                    title="Ver equipos en servicio"
                                  >
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
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
                            <p className="text-sm text-gray-500 mt-1 break-words">
                              {trabajo.telefono || "Sin teléfono"}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 break-words">
                              {trabajo.direccion || "Sin dirección"}
                            </p>
                          </div>
                        </div>

                        {trabajo.tipo === "visita" ? (
                          <>
                            <p className="text-sm text-gray-600">
                              Comentario: {trabajo.comentarioModulo || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Motivo de visita: {trabajo.motivo || "N/A"}
                            </p>
                            <p className="text-sm text-gray-600">
                              Comercial: {trabajo.comercial || "N/A"}
                            </p>
                          </>
                        ) : null}

                        {trabajo.tipo === "instalacion_en_proceso" ? (
                          <p className="text-sm text-gray-600">
                            Qué falta:{" "}
                            {trabajo.faltaInstalacion || "No especificado"}
                          </p>
                        ) : null}

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

                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                          {(trabajo.tipo === "visita" ||
                            trabajo.tipo === "entrega_equipamiento" ||
                            trabajo.tipo === "instalacion_nueva" ||
                            trabajo.tipo === "instalacion_en_proceso") && (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-sky-300 text-sky-700 hover:bg-sky-50"
                              onClick={() => handleVerFotos(trabajo)}
                              title="Ver fotos y videos"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          )}

                          {(trabajo.tipo === "entrega_equipamiento" ||
                            trabajo.tipo === "instalacion_nueva" ||
                            trabajo.tipo === "instalacion_en_proceso") && (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className={`h-8 w-8 ${
                                trabajoTieneEntregas(trabajo, ofertasConEntregasIds, contactoKeysConEntregas)
                                  ? "border-green-600 bg-green-500 text-white hover:bg-green-600 hover:border-green-700"
                                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                              onClick={() =>
                                handleVerMaterialesEntregados(trabajo)
                              }
                              title="Ver materiales entregados"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}

                          {(trabajo.tipo === "entrega_equipamiento" ||
                            trabajo.tipo === "instalacion_nueva" ||
                            trabajo.tipo === "instalacion_en_proceso") && (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className={`h-8 w-8 ${
                                trabajoTieneEnServicio(trabajo, resumenServicioPorContacto)
                                  ? "border-purple-600 bg-purple-500 text-white hover:bg-purple-600 hover:border-purple-700"
                                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                              onClick={() => handleVerEnServicio(trabajo)}
                              title="Ver equipos en servicio"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-700" />
                Planificación en curso ({planEnCurso.length})
              </span>
              <div className="flex items-center gap-2">
                {planEnCurso.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVerPlanificacionDialog(true)}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    Ver planificación
                  </Button>
                )}
                <span className="text-sm text-gray-500">
                  Máximo {SUMMARY_VISIBLE_LIMIT} por tipo (scroll)
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planEnCurso.length === 0 ? (
              <p className="text-sm text-gray-600">
                Aún no has seleccionado trabajos para la planificación.
              </p>
            ) : (
              <div className="space-y-4 max-h-[34vh] sm:max-h-[38vh] xl:max-h-[42vh] overflow-y-auto overscroll-contain pr-1">
                {resumenPlanVisible.map(({ tipo, total, visible }) => (
                  <div key={tipo} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={TYPE_BADGE_CLASS[tipo]}>
                        {TYPE_LABEL[tipo]}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {total} trabajo(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {visible.map((item) => (
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
                              <p className="text-sm text-gray-500 mt-1">
                                {item.direccion}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Asignado a:{" "}
                                <span className="font-medium">
                                  {item.brigadaNombre || "Sin asignar"}
                                </span>
                              </p>
                              {item.comentario ? (
                                <p className="text-sm text-blue-700 mt-1">
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
                      {total > visible.length ? (
                        <p className="text-sm text-gray-500">
                          + {total - visible.length} más en este tipo.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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

      <Dialog open={verPlanificacionDialog} onOpenChange={(open) => {
        setVerPlanificacionDialog(open);
        if (!open && onGuardadoExitoso) {
          // Cuando se cierra el diálogo después de guardar, volver a la lista
          onGuardadoExitoso();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Planificación del {fechaPlanificacion}</span>
              <Button
                type="button"
                onClick={descargarPlanificacionPDF}
                className="bg-purple-700 hover:bg-purple-800"
              >
                Descargar PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Total de trabajos:</strong> {planEnCurso.length}
              </p>
              {actualizadoEn && (
                <p className="text-sm text-gray-600">
                  <strong>Última actualización:</strong>{" "}
                  {new Date(actualizadoEn).toLocaleString("es-ES")}
                </p>
              )}
            </div>

            {resumenPlanPorTipo.map(([tipo, items]) => (
              <div key={tipo} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={TYPE_BADGE_CLASS[tipo]}>
                    {TYPE_LABEL[tipo]}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {items.length} trabajo(s)
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.uid}
                      className="border border-gray-200 rounded-md p-3 bg-white"
                    >
                      <p className="font-medium text-gray-900">{item.nombre}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        <strong>Teléfono:</strong> {item.telefono}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Dirección:</strong> {item.direccion}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Descripción:</strong> {item.descripcionTrabajo}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Asignado a:</strong>{" "}
                        <span className="font-medium text-purple-700">
                          {item.brigadaNombre || "Sin asignar"}
                        </span>
                      </p>
                      {item.comentario && (
                        <p className="text-sm text-blue-700 mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                          <strong>Comentario:</strong> {item.comentario}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
