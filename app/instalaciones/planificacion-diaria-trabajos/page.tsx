"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  ClienteService,
  BrigadaService,
  TrabajadorService,
} from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import {
  InstalacionesService,
  type PendientesInstalacionResponse,
} from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { Cliente, Brigada, Trabajador } from "@/lib/api-types";
import type { Averia } from "@/lib/types/feats/averias/averia-types";
import { PlanificacionDiariaTrabajosTable } from "@/components/feats/instalaciones/planificacion-diaria-trabajos-table";
import type {
  BrigadaPlanificacionOption,
  TecnicoPlanificacionOption,
  TrabajoPlanificable,
} from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";

interface PendientesVisitaRawResponse {
  clientes?: Array<Record<string, unknown>>;
  leads?: Array<Record<string, unknown>>;
}

const EMPTY_PENDIENTES: PendientesInstalacionResponse = {
  leads: [],
  clientes: [],
  total_leads: 0,
  total_clientes: 0,
  total_general: 0,
};

const safeText = (value: unknown, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const isAveriaPendiente = (averia: Averia) =>
  String(averia.estado || "").toLowerCase() !== "solucionada";

const getBrigadaOption = (
  brigada: Brigada,
): BrigadaPlanificacionOption | null => {
  const id = safeText(brigada.id || brigada._id || brigada.lider_ci);
  if (!id) return null;

  const nombreLider = safeText(brigada.lider?.nombre);
  const nombre = nombreLider
    ? `Brigada ${nombreLider}`
    : `Brigada ${safeText(brigada.lider_ci, id)}`;

  return { id, nombre };
};

const getTecnicoOption = (
  trabajador: Trabajador,
): TecnicoPlanificacionOption | null => {
  const id = safeText(trabajador.id || trabajador.CI);
  if (!id) return null;
  const nombre = safeText(trabajador.nombre, `Técnico ${id}`);
  return { id, nombre };
};

const buildVisitas = (
  response: PendientesVisitaRawResponse,
): TrabajoPlanificable[] => {
  const visitas: TrabajoPlanificable[] = [];
  const clientes = Array.isArray(response.clientes) ? response.clientes : [];
  const leads = Array.isArray(response.leads) ? response.leads : [];

  clientes.forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;

    visitas.push({
      uid: `visita:cliente:${contactoId}`,
      tipo: "visita",
      contactoTipo: "cliente",
      contactoId,
      contactoNumero: numero || undefined,
      nombre: safeText(cliente.nombre, "Cliente sin nombre"),
      telefono: safeText(cliente.telefono, "Sin teléfono"),
      direccion: safeText(cliente.direccion, "Sin dirección"),
      provincia: safeText(cliente.provincia_montaje) || undefined,
      municipio: safeText(cliente.municipio) || undefined,
      estado: safeText(cliente.estado) || undefined,
      prioridad: safeText(cliente.prioridad) || undefined,
      descripcionTrabajo: "Visita técnica pendiente",
      fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
      comentarioModulo: safeText(cliente.comentario) || undefined,
      motivo:
        safeText(cliente.motivo_visita) ||
        safeText(cliente.motivo) ||
        undefined,
      comercial: safeText(cliente.comercial) || undefined,
      ofertas: Array.isArray(cliente.ofertas)
        ? (cliente.ofertas as unknown[])
        : undefined,
      fotos: Array.isArray(cliente.fotos)
        ? (cliente.fotos as unknown[])
        : undefined,
    });
  });

  leads.forEach((lead) => {
    const contactoId = safeText(lead.id || lead._id);
    if (!contactoId) return;

    visitas.push({
      uid: `visita:lead:${contactoId}`,
      tipo: "visita",
      contactoTipo: "lead",
      contactoId,
      nombre: safeText(lead.nombre, "Lead sin nombre"),
      telefono: safeText(lead.telefono, "Sin teléfono"),
      direccion: safeText(lead.direccion, "Sin dirección"),
      provincia: safeText(lead.provincia_montaje) || undefined,
      municipio: safeText(lead.municipio) || undefined,
      estado: safeText(lead.estado) || undefined,
      prioridad: safeText(lead.prioridad) || undefined,
      descripcionTrabajo: "Visita a lead pendiente",
      fechaReferencia: safeText(lead.fecha_contacto) || undefined,
      comentarioModulo: safeText(lead.comentario) || undefined,
      motivo:
        safeText(lead.motivo_visita) || safeText(lead.motivo) || undefined,
      comercial: safeText(lead.comercial) || undefined,
      ofertas: Array.isArray(lead.ofertas)
        ? (lead.ofertas as unknown[])
        : undefined,
      fotos: Array.isArray(lead.fotos) ? (lead.fotos as unknown[]) : undefined,
    });
  });

  return visitas;
};

const buildInstalacionesNuevas = (
  response: PendientesInstalacionResponse,
): TrabajoPlanificable[] => {
  const trabajos: TrabajoPlanificable[] = [];

  (response.clientes || []).forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;

    trabajos.push({
      uid: `instalacion_nueva:cliente:${contactoId}`,
      tipo: "instalacion_nueva",
      contactoTipo: "cliente",
      contactoId,
      contactoNumero: numero || undefined,
      nombre: safeText(cliente.nombre, "Cliente sin nombre"),
      telefono: safeText(cliente.telefono, "Sin teléfono"),
      direccion: safeText(cliente.direccion, "Sin dirección"),
      provincia: safeText(cliente.provincia_montaje) || undefined,
      municipio: safeText(cliente.municipio) || undefined,
      estado: safeText(cliente.estado) || undefined,
      descripcionTrabajo: "Instalación nueva programable",
      fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
      ofertas: Array.isArray(cliente.ofertas)
        ? (cliente.ofertas as unknown[])
        : undefined,
      fotos: Array.isArray(cliente.fotos)
        ? (cliente.fotos as unknown[])
        : undefined,
    });
  });

  (response.leads || []).forEach((lead) => {
    const contactoId = safeText(lead.id);
    if (!contactoId) return;

    trabajos.push({
      uid: `instalacion_nueva:lead:${contactoId}`,
      tipo: "instalacion_nueva",
      contactoTipo: "lead",
      contactoId,
      nombre: safeText(lead.nombre, "Lead sin nombre"),
      telefono: safeText(lead.telefono, "Sin teléfono"),
      direccion: safeText(lead.direccion, "Sin dirección"),
      provincia: safeText(lead.provincia_montaje) || undefined,
      municipio: safeText(lead.municipio) || undefined,
      estado: safeText(lead.estado) || undefined,
      descripcionTrabajo: "Instalación nueva de lead",
      fechaReferencia: safeText(lead.fecha_contacto) || undefined,
      ofertas: Array.isArray(lead.ofertas)
        ? (lead.ofertas as unknown[])
        : undefined,
      fotos: Array.isArray(lead.fotos) ? (lead.fotos as unknown[]) : undefined,
    });
  });

  return trabajos;
};

const buildInstalacionesEnProceso = (
  clientes: Cliente[],
): TrabajoPlanificable[] =>
  clientes
    .filter((cliente) => safeText(cliente.estado) === "Instalación en Proceso")
    .map((cliente) => {
      const numero = safeText(cliente.numero);
      const contactoId = numero || safeText(cliente.id);
      return {
        uid: `instalacion_en_proceso:cliente:${contactoId}`,
        tipo: "instalacion_en_proceso" as const,
        contactoTipo: "cliente" as const,
        contactoId,
        contactoNumero: numero || undefined,
        nombre: safeText(cliente.nombre, "Cliente sin nombre"),
        telefono: safeText(cliente.telefono, "Sin teléfono"),
        direccion: safeText(cliente.direccion, "Sin dirección"),
        provincia: safeText(cliente.provincia_montaje) || undefined,
        municipio: safeText(cliente.municipio) || undefined,
        estado: safeText(cliente.estado) || undefined,
        descripcionTrabajo: safeText(cliente.falta_instalacion)
          ? `Instalación en proceso: ${safeText(cliente.falta_instalacion)}`
          : "Instalación en proceso",
        fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
        faltaInstalacion: safeText(cliente.falta_instalacion) || undefined,
        ofertas: Array.isArray(cliente.ofertas)
          ? (cliente.ofertas as unknown[])
          : undefined,
        fotos: Array.isArray(cliente.fotos)
          ? (cliente.fotos as unknown[])
          : undefined,
      };
    })
    .filter((item) => Boolean(item.contactoId));

const buildAverias = (clientes: Cliente[]): TrabajoPlanificable[] => {
  const trabajos: TrabajoPlanificable[] = [];

  clientes.forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;

    const averiasRaw = Array.isArray(cliente.averias) ? cliente.averias : [];
    const averiasPendientes = averiasRaw.filter(isAveriaPendiente);
    averiasPendientes.forEach((averia, index) => {
      const averiaId = safeText(averia.id, String(index + 1));
      trabajos.push({
        uid: `averia:cliente:${contactoId}:${averiaId}`,
        tipo: "averia",
        contactoTipo: "cliente",
        contactoId,
        contactoNumero: numero || undefined,
        nombre: safeText(cliente.nombre, "Cliente sin nombre"),
        telefono: safeText(cliente.telefono, "Sin teléfono"),
        direccion: safeText(cliente.direccion, "Sin dirección"),
        provincia: safeText(cliente.provincia_montaje) || undefined,
        municipio: safeText(cliente.municipio) || undefined,
        estado: safeText(averia.estado) || undefined,
        descripcionTrabajo: safeText(
          averia.descripcion,
          "Atención de avería pendiente",
        ),
        fechaReferencia:
          safeText(averia.fecha_reporte || averia.created_at) || undefined,
      });
    });
  });

  return trabajos;
};

const buildEntregasEquipamientoDesdeNuevas = (
  instalacionesNuevas: TrabajoPlanificable[],
): TrabajoPlanificable[] => {
  return instalacionesNuevas.map((instalacion) => ({
    ...instalacion,
    uid: `entrega_equipamiento:${instalacion.contactoTipo}:${instalacion.contactoNumero || instalacion.contactoId}`,
    tipo: "entrega_equipamiento" as const,
    descripcionTrabajo: "Entrega de equipamiento para instalación nueva",
  }));
};

const TYPE_ORDER: Record<TrabajoPlanificable["tipo"], number> = {
  visita: 1,
  entrega_equipamiento: 2,
  instalacion_nueva: 3,
  instalacion_en_proceso: 4,
  averia: 5,
};

export default function PlanificacionDiariaTrabajosPage() {
  const { toast } = useToast();
  const [trabajos, setTrabajos] = useState<TrabajoPlanificable[]>([]);
  const [brigadas, setBrigadas] = useState<BrigadaPlanificacionOption[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoPlanificacionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiRequest<PendientesVisitaRawResponse>("/pendientes-visita/"),
        InstalacionesService.getPendientesInstalacion(),
        ClienteService.getClientes({}),
        ClienteService.getClientesConAverias(),
        BrigadaService.getAllBrigadas(),
        TrabajadorService.getAllTrabajadores(),
      ]);

      const [
        visitasResult,
        pendientesInstalacionResult,
        clientesResult,
        averiasResult,
        brigadasResult,
        trabajadoresResult,
      ] = results;

      const visitasRaw =
        visitasResult.status === "fulfilled" ? visitasResult.value : {};
      const pendientesInstalacion =
        pendientesInstalacionResult.status === "fulfilled"
          ? pendientesInstalacionResult.value
          : EMPTY_PENDIENTES;
      const clientes =
        clientesResult.status === "fulfilled"
          ? clientesResult.value.clients
          : [];
      const clientesAverias =
        averiasResult.status === "fulfilled" ? averiasResult.value : [];
      const brigadasRaw =
        brigadasResult.status === "fulfilled" ? brigadasResult.value : [];
      const trabajadoresRaw =
        trabajadoresResult.status === "fulfilled"
          ? trabajadoresResult.value
          : [];
      const clientesEnProceso = clientes.filter(
        (cliente) => safeText(cliente.estado) === "Instalación en Proceso",
      );

      const visitas = buildVisitas(visitasRaw);
      const instalacionesNuevas = buildInstalacionesNuevas(
        pendientesInstalacion,
      );
      const instalacionesEnProceso =
        buildInstalacionesEnProceso(clientesEnProceso);
      const averias = buildAverias(clientesAverias);
      const entregasMateriales =
        buildEntregasEquipamientoDesdeNuevas(instalacionesNuevas);

      const trabajosConsolidados = [
        ...visitas,
        ...entregasMateriales,
        ...instalacionesNuevas,
        ...instalacionesEnProceso,
        ...averias,
      ].sort((a, b) => {
        const byType = TYPE_ORDER[a.tipo] - TYPE_ORDER[b.tipo];
        if (byType !== 0) return byType;
        return a.nombre.localeCompare(b.nombre, "es");
      });

      const brigadasOptions = brigadasRaw
        .map(getBrigadaOption)
        .filter((item): item is BrigadaPlanificacionOption => Boolean(item))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      const tecnicosMap = new Map<string, TecnicoPlanificacionOption>();
      trabajadoresRaw.forEach((trabajador) => {
        const option = getTecnicoOption(trabajador);
        if (!option) return;
        if (!tecnicosMap.has(option.id)) {
          tecnicosMap.set(option.id, option);
        }
      });
      const tecnicosOptions = Array.from(tecnicosMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      );

      setTrabajos(trabajosConsolidados);
      setBrigadas(brigadasOptions);
      setTecnicos(tecnicosOptions);

      const failedSources = results.filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedSources > 0) {
        toast({
          title: "Datos parciales",
          description: `Se cargó la planificación con ${failedSources} fuente(s) con error.`,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error cargando planificación";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setTrabajos([]);
      setBrigadas([]);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        await fetchData();
      } finally {
        setInitialLoading(false);
      }
    };

    void loadInitialData();
  }, [fetchData]);

  if (initialLoading) {
    return (
      <PageLoader
        moduleName="Planificación Diaria de Trabajos"
        text="Cargando datos de planificación..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Planificación Diaria de Trabajos"
        subtitle="Planifica las instalaciones y trabajos del día siguiente por brigadas"
        backHref="/instalaciones"
        backLabel="Volver a Operaciones"
        badge={{
          text: "Operaciones",
          className: "bg-purple-100 text-purple-800",
        }}
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8 space-y-6">
        <PlanificacionDiariaTrabajosTable
          trabajos={trabajos}
          brigadas={brigadas}
          tecnicos={tecnicos}
          loading={loading}
        />
      </main>
      <Toaster />
    </div>
  );
}
