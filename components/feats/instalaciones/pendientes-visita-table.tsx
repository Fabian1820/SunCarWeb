"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo, useEffect, useCallback } from "react";
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
  List,
  ClipboardCheck,
  CalendarDays,
  FolderOpen,
} from "lucide-react";
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-config";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { CompletarVisitaDialog } from "@/components/feats/instalaciones/completar-visita-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";

type ViewMode = "pendientes" | "realizadas" | "todas";

interface ArchivoVisita {
  nombre: string;
  url: string;
  categoria?: string;
}

interface VisitaRegistro extends PendienteVisita {
  visitaId?: string;
  estadoVisita?: string;
  motivoVisita?: string;
  fechaVisita?: string;
  resultadoVisita?: string;
  evidenciaTexto?: string;
  materialesExtra?: any[];
  archivos?: ArchivoVisita[];
}

interface PendientesVisitaTableProps {
  pendientes: PendienteVisita[];
  loading: boolean;
  onRefresh: () => void;
}

const getArrayFromPayload = (payload: any): any[] => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data?.visitas)) return data.visitas;
  if (Array.isArray(payload?.visitas)) return payload.visitas;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  if (data && typeof data === "object") return [data];
  return [];
};

const extractArchivosFromVisita = (visita: any): ArchivoVisita[] => {
  const archivos: ArchivoVisita[] = [];

  const pushUrl = (url: string, categoria?: string) => {
    if (!url) return;
    const fileName = String(url).split("/").pop() || "Archivo";
    archivos.push({ nombre: fileName, url: String(url), categoria });
  };

  const pushMany = (urls: any, categoria?: string) => {
    if (!Array.isArray(urls)) return;
    urls.forEach((u) => {
      if (typeof u === "string") {
        pushUrl(u, categoria);
      } else if (u?.url) {
        archivos.push({
          nombre: u.nombre || u.filename || u.name || "Archivo",
          url: String(u.url),
          categoria: categoria || u.categoria,
        });
      }
    });
  };

  const archivosRaw = visita?.archivos;
  if (Array.isArray(archivosRaw)) {
    archivosRaw.forEach((a: any) => {
      if (typeof a === "string") {
        pushUrl(a);
      } else if (a?.url) {
        archivos.push({
          nombre: a.nombre || a.filename || a.name || "Archivo",
          url: String(a.url),
          categoria: a.categoria,
        });
      }
    });
  }

  pushMany(
    visita?.archivos_guardados?.estudio_energetico,
    "estudio_energetico",
  );
  pushMany(visita?.archivos_guardados?.evidencia, "evidencia");
  pushMany(visita?.visita_completada?.estudio_energetico, "estudio_energetico");
  pushMany(visita?.visita_completada?.evidencia_archivos, "evidencia");

  return archivos;
};

const mapVisitaToRegistro = (
  visita: any,
  fallbackIndex: number,
): VisitaRegistro => {
  const tipoRaw = String(
    visita?.tipo ||
      visita?.tipo_entidad ||
      (visita?.lead_id ? "lead" : visita?.cliente_numero ? "cliente" : "lead"),
  ).toLowerCase();

  const tipo: "lead" | "cliente" = tipoRaw.includes("cliente")
    ? "cliente"
    : "lead";

  const entidadId =
    visita?.entidad_id ||
    visita?.lead_id ||
    visita?.cliente_numero ||
    visita?.numero ||
    visita?.numero_cliente ||
    "";

  const nombre =
    visita?.nombre ||
    visita?.cliente_nombre ||
    visita?.lead_nombre ||
    "Sin nombre";
  const telefono = visita?.telefono || visita?.telefono_principal || "";
  const direccion = visita?.direccion || visita?.direccion_montaje || "";
  const provincia =
    visita?.provincia || visita?.provincia_montaje || "Sin especificar";
  const municipio = visita?.municipio || "";
  const comercial = visita?.comercial || "";
  const estado = visita?.estado || "programada";
  const comentario =
    visita?.comentario || visita?.notas || visita?.evidencia_texto || "";

  const visitaId =
    visita?.id ||
    visita?._id ||
    visita?.visita_id ||
    `${tipo}-${entidadId || fallbackIndex}`;

  const motivoVisita =
    visita?.motivo ||
    visita?.motivo_visita ||
    visita?.razon ||
    comentario ||
    "";

  const estadoNormalizado = String(estado).toLowerCase();
  const fechaVisita = estadoNormalizado.includes("complet")
    ? visita?.fecha_completada || ""
    : "";

  const resultadoVisita =
    visita?.resultado || visita?.visita_completada?.resultado || "";

  return {
    id: String(entidadId || visitaId),
    tipo,
    nombre: String(nombre),
    telefono: String(telefono),
    direccion: String(direccion),
    provincia: String(provincia),
    municipio: String(municipio),
    estado: String(estado),
    comentario: String(comentario),
    fuente: String(visita?.fuente || ""),
    referencia: String(visita?.referencia || ""),
    comercial: String(comercial),
    prioridad: String(visita?.prioridad || "Baja"),
    fecha_contacto: String(visita?.fecha_contacto || ""),
    numero:
      tipo === "cliente"
        ? String(entidadId || visita?.numero || "")
        : undefined,
    visitaId: String(visitaId),
    estadoVisita: String(estado),
    motivoVisita: String(motivoVisita),
    fechaVisita: String(fechaVisita),
    resultadoVisita: String(resultadoVisita),
    evidenciaTexto: String(visita?.evidencia_texto || visita?.notas || ""),
    materialesExtra: Array.isArray(visita?.materiales_extra)
      ? visita.materiales_extra
      : Array.isArray(visita?.visita_completada?.materiales_extra)
        ? visita.visita_completada.materiales_extra
        : [],
    archivos: extractArchivosFromVisita(visita),
  };
};

const formatFecha = (fecha?: string) => {
  if (!fecha) return "N/A";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeEstado = (estado?: string) => String(estado || "").toLowerCase();

const getResultadoLabel = (resultado?: string) => {
  const value = String(resultado || "").toLowerCase();
  if (!value) return "Sin resultado";
  if (value.includes("oferta_cubre_necesidades") || value === "cubre") {
    return "Oferta cubre necesidades";
  }
  if (value.includes("necesita_material")) return "Necesita material extra";
  if (value.includes("necesita_oferta_nueva")) return "Necesita oferta nueva";
  if (value.includes("estudio_sin_oferta") || value.includes("sin_oferta")) {
    return "Estudio sin oferta";
  }
  return resultado || "Sin resultado";
};

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
  const [viewMode, setViewMode] = useState<ViewMode>("pendientes");
  const [visitas, setVisitas] = useState<VisitaRegistro[]>([]);
  const [visitasRealizadasEndpoint, setVisitasRealizadasEndpoint] = useState<
    VisitaRegistro[]
  >([]);
  const [loadingVisitas, setLoadingVisitas] = useState(false);
  const [loadingRealizadas, setLoadingRealizadas] = useState(false);
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  const [completarVisitaDialogOpen, setCompletarVisitaDialogOpen] =
    useState(false);
  const [pendienteSeleccionado, setPendienteSeleccionado] =
    useState<PendienteVisita | null>(null);
  const [ofertaCargada, setOfertaCargada] = useState<OfertaConfeccion | null>(
    null,
  );
  const [archivosDialogOpen, setArchivosDialogOpen] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] =
    useState<VisitaRegistro | null>(null);
  const [archivosVisita, setArchivosVisita] = useState<ArchivoVisita[]>([]);
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const { toast } = useToast();

  const fetchVisitas = useCallback(async () => {
    setLoadingVisitas(true);
    try {
      const pageSize = 200;
      let skip = 0;
      let total = Number.POSITIVE_INFINITY;
      let safety = 0;
      const acumuladas: any[] = [];

      while (skip < total && safety < 50) {
        const response = await apiRequest<any>(
          `/visitas/?skip=${skip}&limit=${pageSize}`,
        );
        const pageData = getArrayFromPayload(response);
        const responseTotal = Number(
          response?.data?.total ?? response?.total ?? pageData.length,
        );

        if (Number.isFinite(responseTotal)) {
          total = responseTotal;
        }

        acumuladas.push(...pageData);

        if (pageData.length < pageSize) {
          break;
        }

        skip += pageSize;
        safety += 1;
      }

      const mapped = acumuladas.map((visita, idx) =>
        mapVisitaToRegistro(visita, idx),
      );
      setVisitas(mapped);
    } catch (error: any) {
      console.warn("No se pudieron cargar visitas:", error?.message);
      setVisitas([]);
    } finally {
      setLoadingVisitas(false);
    }
  }, []);

  const fetchVisitasRealizadas = useCallback(async () => {
    setLoadingRealizadas(true);
    try {
      let skip = 0;
      let safety = 0;
      let total = Number.POSITIVE_INFINITY;
      const acumuladas: any[] = [];

      while (skip < total && safety < 50) {
        const response = await apiRequest<any>(
          `/visitas/realizadas?skip=${skip}`,
        );
        const pageData = getArrayFromPayload(response);
        const responseCount = Number(
          response?.count ?? response?.data?.count ?? pageData.length,
        );

        if (Number.isFinite(responseCount) && responseCount >= 0) {
          total = responseCount;
        }

        acumuladas.push(...pageData);

        if (pageData.length === 0) {
          break;
        }

        skip += pageData.length;
        safety += 1;
      }

      const mapped = acumuladas.map((visita, idx) =>
        mapVisitaToRegistro(visita, idx),
      );
      setVisitasRealizadasEndpoint(mapped);
    } catch (error: any) {
      console.warn("No se pudieron cargar visitas realizadas:", error?.message);
      setVisitasRealizadasEndpoint([]);
    } finally {
      setLoadingRealizadas(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitas();
  }, [fetchVisitas]);

  useEffect(() => {
    if (viewMode === "realizadas") {
      fetchVisitasRealizadas();
    }
  }, [viewMode, fetchVisitasRealizadas]);

  const pendientesConCamposVisita: VisitaRegistro[] = useMemo(() => {
    const visitasPendientesMap = new Map<string, VisitaRegistro>();
    const visitasPendientes = visitas
      .filter((v) => {
        const estado = normalizeEstado(v.estadoVisita || v.estado);
        return !estado.includes("complet") && !estado.includes("cancel");
      })
      .sort((a, b) => {
        const fa = new Date(a.fechaVisita || 0).getTime();
        const fb = new Date(b.fechaVisita || 0).getTime();
        return fb - fa;
      });

    visitasPendientes.forEach((visita) => {
      const entidadId = visita.numero || visita.id;
      if (!entidadId) return;
      const key = `${visita.tipo}:${entidadId}`;
      if (!visitasPendientesMap.has(key)) {
        visitasPendientesMap.set(key, visita);
      }
    });

    return pendientes.map((p) => {
      const keys =
        p.tipo === "cliente"
          ? [`cliente:${p.numero || ""}`, `cliente:${p.id}`]
          : [`lead:${p.id}`];
      const visitaAsociada = keys
        .map((key) => visitasPendientesMap.get(key))
        .find(Boolean);

      return {
        ...p,
        visitaId: visitaAsociada?.visitaId,
        estadoVisita: visitaAsociada?.estadoVisita || "programada",
        motivoVisita: visitaAsociada?.motivoVisita || "",
        fechaVisita: "",
        resultadoVisita: visitaAsociada?.resultadoVisita || "",
        evidenciaTexto: visitaAsociada?.evidenciaTexto || "",
        archivos: visitaAsociada?.archivos || [],
      };
    });
  }, [pendientes, visitas]);

  const registrosBase = useMemo(() => {
    if (viewMode === "pendientes") {
      return pendientesConCamposVisita;
    }

    if (viewMode === "realizadas") {
      return visitasRealizadasEndpoint;
    }

    return visitas;
  }, [viewMode, pendientesConCamposVisita, visitas, visitasRealizadasEndpoint]);

  const registrosFiltrados = useMemo(() => {
    return registrosBase.filter((registro) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          registro.nombre.toLowerCase().includes(search) ||
          registro.telefono.toLowerCase().includes(search) ||
          registro.direccion.toLowerCase().includes(search) ||
          registro.comentario.toLowerCase().includes(search) ||
          (registro.motivoVisita || "").toLowerCase().includes(search);

        if (!matchesSearch) return false;
      }

      if (tipoFilter !== "todos" && registro.tipo !== tipoFilter.slice(0, -1)) {
        return false;
      }

      if (
        provinciaFilter !== "todas" &&
        registro.provincia !== provinciaFilter
      ) {
        return false;
      }

      return true;
    });
  }, [registrosBase, searchTerm, tipoFilter, provinciaFilter]);

  const provincias = useMemo(() => {
    const uniqueProvincias = new Set(registrosBase.map((p) => p.provincia));
    return Array.from(uniqueProvincias).sort((a, b) => {
      if (a.toLowerCase().includes("habana")) return -1;
      if (b.toLowerCase().includes("habana")) return 1;
      return a.localeCompare(b);
    });
  }, [registrosBase]);

  const countLeads = registrosFiltrados.filter((p) => p.tipo === "lead").length;
  const countClientes = registrosFiltrados.filter(
    (p) => p.tipo === "cliente",
  ).length;

  const pendingCount = pendientesConCamposVisita.length;
  const realizadasCount = visitasRealizadasEndpoint.length;
  const todasCount = visitas.length;

  const handleCompletarVisita = (pendiente: PendienteVisita) => {
    setPendienteSeleccionado(pendiente);
    setCompletarVisitaDialogOpen(true);
  };

  const handleVisitaCompletada = () => {
    onRefresh();
    fetchVisitas();
  };

  const handleVerOferta = async (pendiente: PendienteVisita) => {
    try {
      setPendienteSeleccionado(pendiente);
      setOfertaCargada(null);
      setOfertaDialogOpen(false);

      let response;
      if (pendiente.tipo === "lead") {
        response = await apiRequest<any>(
          `/ofertas/confeccion/lead/${pendiente.id}`,
        );
      } else {
        const clienteId = pendiente.numero || pendiente.id;
        response = await apiRequest<any>(
          `/ofertas/confeccion/cliente/${clienteId}`,
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

  const parseArchivosResponse = (payload: any): ArchivoVisita[] => {
    const data = payload?.data ?? payload;
    const parsed: ArchivoVisita[] = [];

    const pushFile = (item: any, categoria?: string) => {
      if (!item) return;
      if (typeof item === "string") {
        parsed.push({
          nombre: item.split("/").pop() || "Archivo",
          url: item,
          categoria,
        });
        return;
      }

      if (item.url) {
        parsed.push({
          nombre: item.nombre || item.filename || item.name || "Archivo",
          url: String(item.url),
          categoria: categoria || item.categoria,
        });
      }
    };

    if (Array.isArray(data?.archivos)) {
      data.archivos.forEach((item: any) => pushFile(item));
    } else if (Array.isArray(data)) {
      data.forEach((item: any) => pushFile(item));
    } else {
      const estudio =
        data?.estudio_energetico ??
        data?.archivos_guardados?.estudio_energetico;
      const evidencia =
        data?.evidencia ??
        data?.evidencia_archivos ??
        data?.archivos_guardados?.evidencia;

      if (Array.isArray(estudio)) {
        estudio.forEach((item: any) => pushFile(item, "estudio_energetico"));
      }
      if (Array.isArray(evidencia)) {
        evidencia.forEach((item: any) => pushFile(item, "evidencia"));
      }
    }

    return parsed;
  };

  const handleVerArchivos = async (visita: VisitaRegistro) => {
    setVisitaSeleccionada(visita);
    setArchivosDialogOpen(true);

    if (Array.isArray(visita.archivos) && visita.archivos.length > 0) {
      setArchivosVisita(visita.archivos);
      return;
    }

    if (!visita.visitaId) {
      setArchivosVisita([]);
      return;
    }

    setLoadingArchivos(true);
    try {
      const response = await apiRequest<any>(
        `/visitas/${visita.visitaId}/archivos`,
      );
      const parsed = parseArchivosResponse(response);
      setArchivosVisita(parsed);
    } catch {
      setArchivosVisita([]);
      toast({
        title: "Sin archivos",
        description: "No se pudieron cargar los archivos de esta visita",
        variant: "default",
      });
    } finally {
      setLoadingArchivos(false);
    }
  };

  const handleOpenArchivo = (archivo: ArchivoVisita) => {
    if (typeof window !== "undefined") {
      window.open(archivo.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <Card className="mb-6 border-l-4 border-l-orange-600">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={viewMode === "pendientes" ? "default" : "outline"}
              onClick={() => setViewMode("pendientes")}
              className={
                viewMode === "pendientes"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : ""
              }
            >
              <List className="h-4 w-4 mr-2" />
              Visitas Pendientes ({pendingCount})
            </Button>
            <Button
              variant={viewMode === "realizadas" ? "default" : "outline"}
              onClick={() => setViewMode("realizadas")}
              className={
                viewMode === "realizadas"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : ""
              }
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Visitas Realizadas ({realizadasCount})
            </Button>
            <Button
              variant={viewMode === "todas" ? "default" : "outline"}
              onClick={() => setViewMode("todas")}
              className={
                viewMode === "todas" ? "bg-orange-600 hover:bg-orange-700" : ""
              }
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Todas las visitas ({todasCount})
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  placeholder="Nombre, teléfono, dirección, motivo..."
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

      <Card className="border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {viewMode === "pendientes"
                ? "Visitas Pendientes"
                : viewMode === "realizadas"
                  ? "Visitas Realizadas"
                  : "Todas las Visitas"}{" "}
              ({registrosFiltrados.length})
            </span>
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
          {registrosFiltrados.length === 0 &&
          !loading &&
          !loadingVisitas &&
          !loadingRealizadas ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay visitas para mostrar
              </h3>
              <p className="text-gray-600">
                No se encontraron registros con los filtros aplicados
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {registrosFiltrados.map((registro) => {
                  const esRealizada = normalizeEstado(
                    registro.estadoVisita || registro.estado,
                  ).includes("complet");

                  return (
                    <Card
                      key={`${registro.id}-${registro.visitaId || "p"}`}
                      className="border-gray-200"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {registro.nombre}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{registro.telefono || "N/A"}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                              <MapPin className="h-3 w-3 mt-0.5" />
                              <span>{registro.direccion || "N/A"}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              registro.tipo === "lead" ? "default" : "secondary"
                            }
                            className={
                              registro.tipo === "lead"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {registro.tipo === "lead" ? "Lead" : "Cliente"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Provincia:</p>
                            <p className="text-gray-700">
                              {registro.provincia}
                            </p>
                          </div>
                          {viewMode !== "pendientes" && (
                            <div>
                              <p className="text-xs text-gray-500">Fecha:</p>
                              <p className="text-gray-700">
                                {formatFecha(registro.fechaVisita)}
                              </p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Comentario:</p>
                            <p className="text-gray-700">
                              {registro.comentario || "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Motivo:</p>
                            <p className="text-gray-700">
                              {registro.motivoVisita || "N/A"}
                            </p>
                          </div>
                        </div>

                        {esRealizada ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleVerArchivos(registro)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 col-span-2"
                            >
                              <FolderOpen className="h-3 w-3 mr-1" />
                              Ver Archivos
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleVerOferta(registro)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-8"
                            >
                              Ver Oferta
                            </Button>
                            <Button
                              onClick={() => handleCompletarVisita(registro)}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completar
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-16">
                        Tipo
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-36">
                        Nombre
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-28">
                        Teléfono
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-52">
                        Dirección
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-28">
                        Ubicación
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-40">
                        Comentario
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-40">
                        Motivo
                      </th>
                      {viewMode !== "pendientes" && (
                        <th className="text-left py-2 px-2 font-semibold text-gray-900 w-24">
                          Fecha visita
                        </th>
                      )}
                      <th className="text-left py-2 px-2 font-semibold text-gray-900 w-16">
                        Com.
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-900 w-10">
                        P
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-900 w-52">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((registro) => {
                      const esRealizada = normalizeEstado(
                        registro.estadoVisita || registro.estado,
                      ).includes("complet");

                      return (
                        <tr
                          key={`${registro.id}-${registro.visitaId || "p"}`}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-2 px-2">
                            <Badge
                              variant={
                                registro.tipo === "lead"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                registro.tipo === "lead"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }
                            >
                              {registro.tipo === "lead" ? "L" : "C"}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            <p className="font-semibold text-gray-900">
                              {registro.nombre}
                            </p>
                            {registro.numero && (
                              <p className="text-xs text-gray-500">
                                #{registro.numero}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-gray-700">
                              {registro.telefono || "N/A"}
                            </p>
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-gray-700">
                              {registro.direccion || "N/A"}
                            </p>
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-gray-900 font-medium">
                              {registro.provincia}
                            </p>
                            <p className="text-xs text-gray-500">
                              {registro.municipio || "N/A"}
                            </p>
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-xs text-gray-700 whitespace-normal break-words">
                              {registro.comentario || "N/A"}
                            </p>
                          </td>
                          <td className="py-2 px-2">
                            <p className="text-xs text-gray-700 whitespace-normal break-words">
                              {registro.motivoVisita || "N/A"}
                            </p>
                          </td>
                          {viewMode !== "pendientes" && (
                            <td className="py-2 px-2">
                              <p className="text-xs text-gray-700">
                                {formatFecha(registro.fechaVisita)}
                              </p>
                            </td>
                          )}
                          <td className="py-2 px-2">
                            <p className="text-xs text-gray-700 truncate">
                              {registro.comercial
                                ? registro.comercial.split(" ")[0]
                                : "N/A"}
                            </p>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center h-7 w-7 justify-center mx-auto">
                              <PriorityDot
                                prioridad={
                                  registro.prioridad as
                                    | "Alta"
                                    | "Media"
                                    | "Baja"
                                }
                                onChange={(prioridad) =>
                                  console.log(
                                    "Cambiar prioridad:",
                                    registro.id,
                                    prioridad,
                                  )
                                }
                                disabled={esRealizada}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-2">
                              {esRealizada ? (
                                <Button
                                  onClick={() => handleVerArchivos(registro)}
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                >
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  Ver Archivos
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => handleVerOferta(registro)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2"
                                  >
                                    Ver Oferta
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleCompletarVisita(registro)
                                    }
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-xs h-7 px-2"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completar
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VerOfertaClienteDialog
        open={ofertaDialogOpen}
        onOpenChange={setOfertaDialogOpen}
        oferta={ofertaCargada}
        ofertas={[]}
      />

      <CompletarVisitaDialog
        open={completarVisitaDialogOpen}
        onOpenChange={setCompletarVisitaDialogOpen}
        pendiente={pendienteSeleccionado}
        onSuccess={handleVisitaCompletada}
      />

      <Dialog open={archivosDialogOpen} onOpenChange={setArchivosDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Resultado y Archivos de la visita</DialogTitle>
          </DialogHeader>
          {visitaSeleccionada && (
            <div className="space-y-3 text-sm border rounded p-3 bg-gray-50">
              <div>
                <p className="text-xs text-gray-500">Resultado</p>
                <p className="text-gray-800">
                  {getResultadoLabel(visitaSeleccionada.resultadoVisita)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Comentario</p>
                <p className="text-gray-800">
                  {visitaSeleccionada.evidenciaTexto ||
                    visitaSeleccionada.comentario ||
                    "Sin comentario"}
                </p>
              </div>
            </div>
          )}
          {loadingArchivos ? (
            <p className="text-sm text-gray-600">Cargando archivos...</p>
          ) : archivosVisita.length === 0 ? (
            <p className="text-sm text-gray-600">
              Esta visita no tiene archivos disponibles.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Estudio energético</p>
                <div className="space-y-2">
                  {archivosVisita
                    .filter((a) => (a.categoria || "").includes("estudio"))
                    .map((archivo, index) => (
                      <div
                        key={`estudio-${archivo.url}-${index}`}
                        className="flex items-center justify-between border rounded p-2"
                      >
                        <p className="text-sm font-medium truncate pr-3">
                          {archivo.nombre}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenArchivo(archivo)}
                        >
                          Abrir
                        </Button>
                      </div>
                    ))}
                  {archivosVisita.filter((a) =>
                    (a.categoria || "").includes("estudio"),
                  ).length === 0 && (
                    <p className="text-sm text-gray-600">
                      Sin archivos de estudio.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Evidencia</p>
                <div className="space-y-2">
                  {archivosVisita
                    .filter((a) => (a.categoria || "").includes("evidencia"))
                    .map((archivo, index) => (
                      <div
                        key={`evidencia-${archivo.url}-${index}`}
                        className="flex items-center justify-between border rounded p-2"
                      >
                        <p className="text-sm font-medium truncate pr-3">
                          {archivo.nombre}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenArchivo(archivo)}
                        >
                          Abrir
                        </Button>
                      </div>
                    ))}
                  {archivosVisita.filter((a) =>
                    (a.categoria || "").includes("evidencia"),
                  ).length === 0 && (
                    <p className="text-sm text-gray-600">
                      Sin archivos de evidencia.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
