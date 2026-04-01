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
import { Textarea } from "@/components/shared/molecule/textarea";
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
  Camera,
  Eye,
  Download,
  PlayCircle,
  Pencil,
} from "lucide-react";
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, apiRequest } from "@/lib/api-config";
import { VerOfertaClienteDialog } from "@/components/feats/ofertas/ver-oferta-cliente-dialog";
import { CompletarVisitaDialog } from "@/components/feats/instalaciones/completar-visita-dialog";
import { ClienteFotosDialog } from "@/components/feats/instalaciones/cliente-fotos-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion";
import type { ClienteFoto } from "@/lib/api-types";

type ViewMode = "pendientes" | "realizadas" | "todas";

interface ArchivoVisita {
  nombre: string;
  url: string;
  categoria?: string;
  visitaId?: string;
  contentType?: string;
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
          contentType: u.content_type || u.mime_type || u.tipo_mime,
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
          contentType: a.content_type || a.mime_type || a.tipo_mime,
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
    fotos: Array.isArray(visita?.fotos) ? visita.fotos : [],
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

const normalizeClienteNumero = (value: string | null | undefined) =>
  String(value ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizeOfertaConfeccion = (
  oferta: any,
  index: number,
): OfertaConfeccion => ({
  ...oferta,
  _uid: String(
    oferta?.id ||
      oferta?._id ||
      oferta?.oferta_id ||
      oferta?.numero_oferta ||
      `oferta-${index}`,
  ),
});

const extractOfertasConfeccion = (response: any): OfertaConfeccion[] => {
  const payload = response?.data ?? response;

  const ofertasFromPayload = Array.isArray(payload?.ofertas)
    ? payload.ofertas
    : [];
  const ofertasFromRoot = Array.isArray(response?.ofertas)
    ? response.ofertas
    : [];
  const ofertasRaw =
    ofertasFromPayload.length > 0 ? ofertasFromPayload : ofertasFromRoot;

  if (ofertasRaw.length > 0) {
    return ofertasRaw.map((oferta: any, index: number) =>
      normalizeOfertaConfeccion(oferta, index),
    );
  }

  const singleOferta = payload?.oferta ?? payload?.data ?? payload;
  const isSingleOferta =
    singleOferta &&
    typeof singleOferta === "object" &&
    (singleOferta.id ||
      singleOferta._id ||
      singleOferta.oferta_id ||
      singleOferta.numero_oferta ||
      Array.isArray(singleOferta.items));

  if (isSingleOferta) {
    return [normalizeOfertaConfeccion(singleOferta, 0)];
  }

  return [];
};

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

const getArchivoName = (archivo: ArchivoVisita) => {
  const fromUrl = String(archivo.url || "")
    .split("?")[0]
    .split("/")
    .pop();
  return archivo.nombre || fromUrl || "archivo";
};

const getArchivoExtension = (archivo: ArchivoVisita) => {
  const fileName = getArchivoName(archivo).toLowerCase();
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
};

const isImageArchivo = (archivo: ArchivoVisita) => {
  const type = String(archivo.contentType || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const ext = getArchivoExtension(archivo);
  return ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "heic"].includes(
    ext,
  );
};

const isVideoArchivo = (archivo: ArchivoVisita) => {
  const type = String(archivo.contentType || "").toLowerCase();
  if (type.startsWith("video/")) return true;
  const ext = getArchivoExtension(archivo);
  return ["mp4", "mov", "avi", "mkv", "webm", "m4v", "3gp"].includes(ext);
};

const toDatetimeLocalValue = (fecha?: string) => {
  if (!fecha) return "";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "";
  const tzOffset = parsed.getTimezoneOffset() * 60_000;
  const localDate = new Date(parsed.getTime() - tzOffset);
  return localDate.toISOString().slice(0, 16);
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
  const [ofertasCargadas, setOfertasCargadas] = useState<OfertaConfeccion[]>(
    [],
  );
  const [archivosDialogOpen, setArchivosDialogOpen] = useState(false);
  const [visitaSeleccionada, setVisitaSeleccionada] =
    useState<VisitaRegistro | null>(null);
  const [archivosVisita, setArchivosVisita] = useState<ArchivoVisita[]>([]);
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const [detalleVisitaDialogOpen, setDetalleVisitaDialogOpen] = useState(false);
  const [detalleVisitaSeleccionada, setDetalleVisitaSeleccionada] =
    useState<VisitaRegistro | null>(null);
  const [fotosDialogData, setFotosDialogData] = useState<{
    nombre: string;
    codigo?: string;
    fotos: ClienteFoto[];
  } | null>(null);
  const [editarVisitaDialogOpen, setEditarVisitaDialogOpen] = useState(false);
  const [visitaEdicion, setVisitaEdicion] = useState<VisitaRegistro | null>(
    null,
  );
  const [editarComentario, setEditarComentario] = useState("");
  const [editarFecha, setEditarFecha] = useState("");
  const [editarEstudioFiles, setEditarEstudioFiles] = useState<File[]>([]);
  const [editarEvidenciaFiles, setEditarEvidenciaFiles] = useState<File[]>([]);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
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
      const pageSize = 200;
      let skip = 0;
      let safety = 0;
      let total = Number.POSITIVE_INFINITY;
      const acumuladas: any[] = [];

      while (skip < total && safety < 50) {
        const response = await apiRequest<any>(
          `/visitas/realizadas?skip=${skip}&limit=${pageSize}`,
        );
        const pageData = getArrayFromPayload(response);
        const responseCount = Number(
          response?.count ??
            response?.total ??
            response?.total_count ??
            response?.data?.count ??
            response?.data?.total ??
            response?.data?.total_count ??
            Number.NaN,
        );

        if (Number.isFinite(responseCount) && responseCount >= 0) {
          total = responseCount;
        }

        acumuladas.push(...pageData);

        if (pageData.length === 0) {
          break;
        }

        if (Number.isFinite(total) && acumuladas.length >= total) {
          break;
        }

        skip += pageData.length;
        safety += 1;
      }

      const mapped = acumuladas.map((visita, idx) =>
        mapVisitaToRegistro(visita, idx),
      );
      const seen = new Set<string>();
      const deduped = mapped.filter((item) => {
        const key = String(item.visitaId || `${item.tipo}-${item.id}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setVisitasRealizadasEndpoint(deduped);
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
    fetchVisitasRealizadas();
  }, [fetchVisitasRealizadas]);

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
        fotos: visitaAsociada?.fotos || p.fotos || [],
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
    fetchVisitasRealizadas();
  };

  const handleOpenEditarVisita = (visita: VisitaRegistro) => {
    if (!visita.visitaId) {
      toast({
        title: "Sin ID de visita",
        description: "No se puede editar porque la visita no tiene identificador.",
        variant: "destructive",
      });
      return;
    }

    setVisitaEdicion(visita);
    setEditarComentario(visita.evidenciaTexto || visita.comentario || "");
    setEditarFecha(toDatetimeLocalValue(visita.fechaVisita));
    setEditarEstudioFiles([]);
    setEditarEvidenciaFiles([]);
    setEditarVisitaDialogOpen(true);
  };

  const uploadEditFiles = async (
    visitaId: string,
    categoria: "estudio_energetico" | "evidencia",
    files: File[],
  ) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });
    await apiRequest(
      `/visitas/${encodeURIComponent(visitaId)}/archivos/upload?categoria=${encodeURIComponent(categoria)}`,
      {
        method: "POST",
        body: formData,
      },
    );
  };

  const handleGuardarEdicionVisita = async () => {
    if (!visitaEdicion?.visitaId) return;

    setGuardandoEdicion(true);
    try {
      const fechaIso = editarFecha
        ? new Date(editarFecha).toISOString()
        : visitaEdicion.fechaVisita || new Date().toISOString();

      const updatePayload: Record<string, unknown> = {
        estado: "completada",
        fecha_completada: fechaIso,
        evidencia_texto: editarComentario.trim(),
        notas: editarComentario.trim(),
        comentario: editarComentario.trim(),
      };

      if (visitaEdicion.resultadoVisita) {
        updatePayload.resultado = visitaEdicion.resultadoVisita;
      }
      if (visitaEdicion.motivoVisita) {
        updatePayload.motivo = visitaEdicion.motivoVisita;
      }
      if (
        Array.isArray(visitaEdicion.materialesExtra) &&
        visitaEdicion.materialesExtra.length > 0
      ) {
        updatePayload.materiales_extra = visitaEdicion.materialesExtra;
      }

      await apiRequest(`/visitas/${encodeURIComponent(visitaEdicion.visitaId)}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });

      await Promise.all([
        uploadEditFiles(
          visitaEdicion.visitaId,
          "estudio_energetico",
          editarEstudioFiles,
        ),
        uploadEditFiles(
          visitaEdicion.visitaId,
          "evidencia",
          editarEvidenciaFiles,
        ),
      ]);

      toast({
        title: "Visita actualizada",
        description: "Se actualizó comentario, fecha y archivos correctamente.",
      });

      setEditarVisitaDialogOpen(false);
      setVisitaEdicion(null);
      setEditarEstudioFiles([]);
      setEditarEvidenciaFiles([]);
      fetchVisitas();
      fetchVisitasRealizadas();
    } catch (error: any) {
      toast({
        title: "Error al editar visita",
        description:
          error?.message || "No se pudo actualizar la visita seleccionada.",
        variant: "destructive",
      });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleVerOferta = async (pendiente: PendienteVisita) => {
    try {
      setPendienteSeleccionado(pendiente);
      setOfertaCargada(null);
      setOfertasCargadas([]);
      setOfertaDialogOpen(false);

      let ofertas: OfertaConfeccion[] = [];
      if (pendiente.tipo === "lead") {
        const response = await apiRequest<any>(
          `/ofertas/confeccion/lead/${encodeURIComponent(pendiente.id)}`,
        );
        ofertas = extractOfertasConfeccion(response);
      } else {
        const numeroOriginal = String(pendiente.numero || "").trim();
        const numeroNormalizado = normalizeClienteNumero(pendiente.numero);
        const candidatos = Array.from(
          new Set([numeroOriginal, numeroNormalizado, pendiente.id].filter(Boolean)),
        );

        if (candidatos.length === 0) {
          toast({
            title: "Datos incompletos",
            description: "El cliente no tiene identificador válido.",
            variant: "destructive",
          });
          return;
        }

        let ultimoError: unknown = null;
        for (const candidato of candidatos) {
          try {
            const response = await apiRequest<any>(
              `/ofertas/confeccion/cliente/${encodeURIComponent(candidato)}`,
            );
            ofertas = extractOfertasConfeccion(response);
            if (ofertas.length > 0) break;
          } catch (error) {
            ultimoError = error;
          }
        }

        if (ofertas.length === 0 && ultimoError) {
          throw ultimoError;
        }
      }

      if (ofertas.length === 0) {
        toast({
          title: "Sin oferta",
          description: `Este ${pendiente.tipo === "lead" ? "lead" : "cliente"} no tiene oferta asignada.`,
          variant: "default",
        });
        return;
      }

      setOfertaCargada(ofertas[0]);
      setOfertasCargadas(ofertas);
      setOfertaDialogOpen(true);
    } catch (error: any) {
      console.error("Error al cargar oferta:", error);
      setOfertaCargada(null);
      setOfertasCargadas([]);
      setOfertaDialogOpen(false);
      toast({
        title: "Sin oferta",
        description: `Este ${pendiente.tipo === "lead" ? "lead" : "cliente"} no tiene oferta asignada.`,
        variant: "default",
      });
    }
  };

  const parseArchivosResponse = (
    payload: any,
    visitaId?: string,
  ): ArchivoVisita[] => {
    const data = payload?.data ?? payload;
    const parsed: ArchivoVisita[] = [];

    const pushFile = (item: any, categoria?: string) => {
      if (!item) return;
      if (typeof item === "string") {
        parsed.push({
          nombre: item.split("/").pop() || "Archivo",
          url: item,
          categoria,
          visitaId,
        });
        return;
      }

      const fileUrl =
        item.url ||
        item.signed_url ||
        item.presigned_url ||
        item.download_url ||
        item.file_url ||
        item.ruta ||
        item.path;

      if (fileUrl) {
        parsed.push({
          nombre: item.nombre || item.filename || item.name || "Archivo",
          url: String(fileUrl),
          categoria: categoria || item.categoria,
          visitaId,
          contentType: item.content_type || item.mime_type || item.tipo_mime,
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
    const localArchivos = Array.isArray(visita.archivos) ? visita.archivos : [];
    setArchivosVisita(localArchivos);

    if (!visita.visitaId) return;

    setLoadingArchivos(true);
    try {
      const response = await apiRequest<any>(
        `/visitas/${visita.visitaId}/archivos`,
      );
      const parsed = parseArchivosResponse(response, visita.visitaId);
      if (parsed.length > 0) {
        setArchivosVisita(parsed);
      } else if (localArchivos.length === 0) {
        setArchivosVisita([]);
      }
    } catch {
      if (localArchivos.length === 0) {
        setArchivosVisita([]);
        toast({
          title: "Sin archivos",
          description: "No se pudieron cargar los archivos de esta visita",
          variant: "default",
        });
      }
    } finally {
      setLoadingArchivos(false);
    }
  };

  const getRegistroFotos = (registro: VisitaRegistro): ClienteFoto[] => {
    return Array.isArray((registro as any)?.fotos)
      ? (registro as any).fotos
      : [];
  };

  const handleVerFotosCliente = (registro: VisitaRegistro) => {
    setFotosDialogData({
      nombre: registro.nombre,
      codigo: registro.numero,
      fotos: getRegistroFotos(registro),
    });
  };

  const getArchivoUrlCandidates = (archivo: ArchivoVisita) => {
    const raw = String(archivo.url || "").trim();
    if (!raw) return [];

    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const apiBase = API_BASE_URL.replace(/\/+$/, "");
    const fileName = raw.split("?")[0].split("/").pop() || archivo.nombre;
    const candidates: string[] = [];

    const push = (value: string) => {
      if (!value) return;
      if (!candidates.includes(value)) candidates.push(value);
    };

    if (/^https?:\/\//i.test(raw)) {
      push(raw);
    } else if (raw.startsWith("/")) {
      push(`${apiOrigin}${raw}`);
      if (!raw.startsWith("/api/")) {
        push(`${apiBase}${raw}`);
      }
    } else {
      // nombre de archivo suelto o ruta relativa
      push(`${apiOrigin}/${raw}`);
      push(`${apiBase}/${raw}`);
      if (archivo.visitaId) {
        push(
          `${apiBase}/visitas/${encodeURIComponent(archivo.visitaId)}/archivos/${encodeURIComponent(raw)}`,
        );
        push(
          `${apiBase}/visitas/${encodeURIComponent(archivo.visitaId)}/archivos/download?nombre=${encodeURIComponent(raw)}`,
        );
      }
      push(`${apiBase}/visitas/archivos/${encodeURIComponent(raw)}`);
      push(`${apiOrigin}/uploads/${encodeURIComponent(fileName)}`);
      push(`${apiOrigin}/uploads/estudios/${encodeURIComponent(fileName)}`);
      push(`${apiOrigin}/uploads/evidencias/${encodeURIComponent(fileName)}`);
    }

    return candidates;
  };

  const openBlobFromResponse = async (
    response: Response,
    archivo: ArchivoVisita,
    mode: "view" | "download",
  ) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("El servidor devolvió HTML en lugar del archivo.");
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (mode === "view") {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } else {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getArchivoName(archivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const openBlobFromApiRequest = async (
    blob: Blob,
    archivo: ArchivoVisita,
    mode: "view" | "download",
  ) => {
    if (!blob || blob.size === 0) {
      throw new Error("El archivo llegó vacío.");
    }
    if (blob.type.includes("text/html")) {
      throw new Error("El backend devolvió HTML en lugar del archivo.");
    }
    const blobUrl = URL.createObjectURL(blob);
    if (mode === "view") {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } else {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getArchivoName(archivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const tryDownloadViaBackend = async (
    archivo: ArchivoVisita,
    mode: "view" | "download",
  ) => {
    if (!archivo.visitaId) return false;

    const raw = String(archivo.url || "").trim();
    const fileName = raw.split("?")[0].split("/").pop() || getArchivoName(archivo);
    const encodedRaw = encodeURIComponent(raw);
    const encodedName = encodeURIComponent(fileName);
    const visitIdEncoded = encodeURIComponent(archivo.visitaId);

    const endpointCandidates = [
      `/visitas/${visitIdEncoded}/archivos/download?url=${encodedRaw}`,
      `/visitas/${visitIdEncoded}/archivos/download?file_url=${encodedRaw}`,
      `/visitas/${visitIdEncoded}/archivos/download?path=${encodedRaw}`,
      `/visitas/${visitIdEncoded}/archivos/download?nombre=${encodedName}`,
      `/visitas/${visitIdEncoded}/archivos/download?filename=${encodedName}`,
      `/visitas/${visitIdEncoded}/archivos/${encodedName}/download`,
      `/visitas/${visitIdEncoded}/archivos/${encodedName}`,
    ];

    for (const endpoint of endpointCandidates) {
      try {
        const blob = await apiRequest<Blob>(endpoint, {
          method: "GET",
          responseType: "blob",
        });
        await openBlobFromApiRequest(blob, archivo, mode);
        return true;
      } catch {
        // Probar siguiente endpoint candidato
      }
    }

    return false;
  };

  const getSignedUrlCandidatesFromBackend = async (
    visitaId: string,
    fileName: string,
  ): Promise<string[]> => {
    const candidates: string[] = [];
    const push = (value?: string) => {
      if (!value) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      if (!candidates.includes(normalized)) candidates.push(normalized);
    };

    const endpoints = [
      `/visitas/${encodeURIComponent(visitaId)}/archivos?signed=true`,
      `/visitas/${encodeURIComponent(visitaId)}/archivos?presigned=true`,
      `/visitas/${encodeURIComponent(visitaId)}/archivos?include_signed_urls=true`,
      `/visitas/${encodeURIComponent(visitaId)}/archivos`,
    ];

    const lowerName = fileName.toLowerCase();

    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest<any>(endpoint, { method: "GET" });
        const data = response?.data ?? response;
        const archivosArray = Array.isArray(data?.archivos)
          ? data.archivos
          : Array.isArray(data)
            ? data
            : [];

        archivosArray.forEach((item: any) => {
          const name = String(
            item?.nombre || item?.filename || item?.name || item?.key || "",
          ).toLowerCase();
          const fileUrl =
            item?.signed_url ||
            item?.presigned_url ||
            item?.download_url ||
            item?.file_url ||
            item?.url;

          if (
            fileUrl &&
            (name.includes(lowerName) || String(fileUrl).toLowerCase().includes(lowerName))
          ) {
            push(String(fileUrl));
          }
        });
      } catch {
        // Probar siguiente endpoint de firmado
      }
    }

    return candidates;
  };

  const handleOpenArchivo = async (archivo: ArchivoVisita) => {
    return handleArchivoAction(archivo, "view");
  };

  const handleDownloadArchivo = async (archivo: ArchivoVisita) => {
    return handleArchivoAction(archivo, "download");
  };

  const getArchivoPreviewUrl = (archivo: ArchivoVisita) => {
    const candidates = getArchivoUrlCandidates(archivo);
    return candidates.find((candidate) => /^https?:\/\//i.test(candidate)) || "";
  };

  const handleArchivoAction = async (
    archivo: ArchivoVisita,
    mode: "view" | "download",
  ) => {
    try {
      // 1) Primero intentar descarga autenticada vía backend (si existe endpoint)
      const downloadedViaBackend = await tryDownloadViaBackend(archivo, mode);
      if (downloadedViaBackend) return;

      // 2) Intentar obtener URL firmada fresca desde backend
      const raw = String(archivo.url || "").trim();
      const fileName = raw.split("?")[0].split("/").pop() || getArchivoName(archivo);
      const signedCandidates = archivo.visitaId
        ? await getSignedUrlCandidatesFromBackend(archivo.visitaId, fileName)
        : [];

      // 3) Fallback controlado: intentar URL(s) directa(s)
      const candidates = [...signedCandidates, ...getArchivoUrlCandidates(archivo)];
      if (candidates.length === 0) {
        throw new Error("No hay URL disponible para este archivo.");
      }

      const token = localStorage.getItem("auth_token") || "";
      const attemptErrors: string[] = [];

      for (const candidate of candidates) {
        // Intento 1: con token
        try {
          const response = await fetch(candidate, {
            method: "GET",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            await openBlobFromResponse(response, archivo, mode);
            return;
          }
          attemptErrors.push(`${candidate} -> ${response.status}`);
        } catch {
          attemptErrors.push(`${candidate} -> error con token`);
        }

        // Intento 2: sin token
        try {
          const response = await fetch(candidate, { method: "GET" });
          if (response.ok) {
            await openBlobFromResponse(response, archivo, mode);
            return;
          }
          attemptErrors.push(`${candidate} -> ${response.status} (sin token)`);
        } catch {
          attemptErrors.push(`${candidate} -> error sin token`);
        }
      }

      throw new Error(
        `No se pudo descargar de forma autenticada. Intentos: ${attemptErrors.slice(0, 3).join(" | ")}`,
      );
    } catch (error: any) {
      toast({
        title:
          mode === "download"
            ? "No se pudo descargar el archivo"
            : "No se pudo abrir el archivo",
        description:
          error?.message ||
          "Intenta nuevamente. Si persiste, verifica permisos del archivo.",
        variant: "destructive",
      });
    }
  };

  const handleVerDetalleVisita = (visita: VisitaRegistro) => {
    setDetalleVisitaSeleccionada(visita);
    setDetalleVisitaDialogOpen(true);
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
          <CardTitle className="text-xl">Filtros de Búsqueda</CardTitle>
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
          <CardTitle className="flex items-center justify-between text-xl">
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
              <div className="md:hidden space-y-3 text-base">
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
                            <p className="font-semibold text-gray-900 text-lg">
                              {registro.nombre}
                            </p>
                            <div className="flex items-center gap-2 text-base text-gray-600 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{registro.telefono || "N/A"}</span>
                            </div>
                            <div className="flex items-start gap-2 text-base text-gray-600 mt-1">
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

                        <div className="grid grid-cols-2 gap-2 text-base">
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
                              onClick={() => handleVerDetalleVisita(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9 col-span-2"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver detalles
                            </Button>
                            <Button
                              onClick={() => handleVerArchivos(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9 col-span-2"
                            >
                              <FolderOpen className="h-3 w-3 mr-1" />
                              Ver Archivos
                            </Button>
                            <Button
                              onClick={() => handleOpenEditarVisita(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9 col-span-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar visita
                            </Button>
                            <Button
                              onClick={() => handleVerFotosCliente(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9 col-span-2 border-sky-300 text-sky-700 hover:bg-sky-50"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              Ver Fotos
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => handleVerOferta(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9"
                            >
                              Ver Oferta
                            </Button>
                            <Button
                              onClick={() => handleCompletarVisita(registro)}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-sm h-9"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completar
                            </Button>
                            <Button
                              onClick={() => handleVerFotosCliente(registro)}
                              size="sm"
                              variant="outline"
                              className="text-sm h-9 col-span-2 border-sky-300 text-sky-700 hover:bg-sky-50"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              Ver Fotos
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-16">
                        Tipo
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-40">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-32">
                        Teléfono
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-56">
                        Dirección
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-32">
                        Ubicación
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-44">
                        Comentario
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-44">
                        Motivo
                      </th>
                      {viewMode !== "pendientes" && (
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 w-28">
                          Fecha visita
                        </th>
                      )}
                      <th className="text-left py-3 px-2 font-semibold text-gray-900 w-16">
                        Com.
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-900 w-10">
                        P
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-900 w-56">
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
                          <td className="py-3 px-2">
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
                          <td className="py-3 px-2">
                            <p className="font-semibold text-gray-900">
                              {registro.nombre}
                            </p>
                            {registro.numero && (
                              <p className="text-xs text-gray-500">
                                #{registro.numero}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-gray-700">
                              {registro.telefono || "N/A"}
                            </p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-gray-700">
                              {registro.direccion || "N/A"}
                            </p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-gray-900 font-medium">
                              {registro.provincia}
                            </p>
                            <p className="text-xs text-gray-500">
                              {registro.municipio || "N/A"}
                            </p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-sm text-gray-700 whitespace-normal break-words">
                              {registro.comentario || "N/A"}
                            </p>
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-sm text-gray-700 whitespace-normal break-words">
                              {registro.motivoVisita || "N/A"}
                            </p>
                          </td>
                          {viewMode !== "pendientes" && (
                            <td className="py-3 px-2">
                              <p className="text-sm text-gray-700">
                                {formatFecha(registro.fechaVisita)}
                              </p>
                            </td>
                          )}
                          <td className="py-3 px-2">
                            <p className="text-sm text-gray-700 truncate">
                              {registro.comercial
                                ? registro.comercial.split(" ")[0]
                                : "N/A"}
                            </p>
                          </td>
                          <td className="py-3 px-2 text-center">
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
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-2">
                              {esRealizada ? (
                                <>
                                  <Button
                                    onClick={() => handleVerDetalleVisita(registro)}
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Ver detalles
                                  </Button>
                                  <Button
                                    onClick={() => handleVerArchivos(registro)}
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3"
                                  >
                                    <FolderOpen className="h-3 w-3 mr-1" />
                                    Ver Archivos
                                  </Button>
                                  <Button
                                    onClick={() => handleOpenEditarVisita(registro)}
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3 border-amber-300 text-amber-700 hover:bg-amber-50"
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleVerFotosCliente(registro)
                                    }
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3 border-sky-300 text-sky-700 hover:bg-sky-50"
                                  >
                                    <Camera className="h-3 w-3 mr-1" />
                                    Ver Fotos
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => handleVerOferta(registro)}
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3"
                                  >
                                    Ver Oferta
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleCompletarVisita(registro)
                                    }
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-sm h-8 px-3"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Completar
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleVerFotosCliente(registro)
                                    }
                                    size="sm"
                                    variant="outline"
                                    className="text-sm h-8 px-3 border-sky-300 text-sky-700 hover:bg-sky-50"
                                  >
                                    <Camera className="h-3 w-3 mr-1" />
                                    Ver Fotos
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
        ofertas={ofertasCargadas}
      />

      <CompletarVisitaDialog
        open={completarVisitaDialogOpen}
        onOpenChange={setCompletarVisitaDialogOpen}
        pendiente={pendienteSeleccionado}
        onSuccess={handleVisitaCompletada}
      />

      <ClienteFotosDialog
        open={!!fotosDialogData}
        onOpenChange={(open) => {
          if (!open) setFotosDialogData(null);
        }}
        clienteNombre={fotosDialogData?.nombre || ""}
        clienteCodigo={fotosDialogData?.codigo}
        fotos={fotosDialogData?.fotos || []}
      />

      <Dialog
        open={editarVisitaDialogOpen}
        onOpenChange={(open) => {
          setEditarVisitaDialogOpen(open);
          if (!open) {
            setVisitaEdicion(null);
            setEditarEstudioFiles([]);
            setEditarEvidenciaFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar visita realizada</DialogTitle>
          </DialogHeader>
          {visitaEdicion ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {visitaEdicion.nombre}
                </p>
                <p className="text-xs text-slate-600">
                  ID visita: {visitaEdicion.visitaId}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editar-fecha-visita">Fecha de visita</Label>
                <Input
                  id="editar-fecha-visita"
                  type="datetime-local"
                  value={editarFecha}
                  onChange={(e) => setEditarFecha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editar-comentario-visita">Comentario</Label>
                <Textarea
                  id="editar-comentario-visita"
                  value={editarComentario}
                  onChange={(e) => setEditarComentario(e.target.value)}
                  rows={4}
                  placeholder="Escribe el comentario actualizado de la visita"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editar-estudio-files">
                  Agregar archivos de estudio energético
                </Label>
                <Input
                  id="editar-estudio-files"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,video/*,audio/*"
                  onChange={(e) =>
                    setEditarEstudioFiles(Array.from(e.target.files || []))
                  }
                />
                {editarEstudioFiles.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {editarEstudioFiles.length} archivo(s) seleccionados
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editar-evidencia-files">
                  Agregar archivos de evidencia
                </Label>
                <Input
                  id="editar-evidencia-files"
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) =>
                    setEditarEvidenciaFiles(Array.from(e.target.files || []))
                  }
                />
                {editarEvidenciaFiles.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {editarEvidenciaFiles.length} archivo(s) seleccionados
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditarVisitaDialogOpen(false)}
                  disabled={guardandoEdicion}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGuardarEdicionVisita}
                  disabled={guardandoEdicion}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Sin visita seleccionada.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detalleVisitaDialogOpen}
        onOpenChange={setDetalleVisitaDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle completo de visita</DialogTitle>
          </DialogHeader>
          {detalleVisitaSeleccionada ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs uppercase tracking-wide text-orange-700 font-semibold">
                  Visita
                </p>
                <p className="text-base font-semibold text-orange-900">
                  {detalleVisitaSeleccionada.visitaId || "Sin ID de visita"}
                </p>
              </div>

              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-500">Estado de visita</p>
                  <p className="font-medium text-slate-900">
                    {detalleVisitaSeleccionada.estadoVisita || "N/A"}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-500">Fecha visita</p>
                  <p className="font-medium text-slate-900">
                    {formatFecha(detalleVisitaSeleccionada.fechaVisita)}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-500">Resultado</p>
                  <p className="font-medium text-slate-900 text-right">
                    {getResultadoLabel(detalleVisitaSeleccionada.resultadoVisita)}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-500">Prioridad registrada</p>
                  <p className="font-medium text-slate-900">
                    {detalleVisitaSeleccionada.prioridad || "N/A"}
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold mb-1">
                  Motivo de la visita
                </p>
                <p className="text-blue-900">
                  {detalleVisitaSeleccionada.motivoVisita || "N/A"}
                </p>
              </div>

              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">
                  Evidencia / Comentario
                </p>
                <p className="text-emerald-900 whitespace-pre-wrap">
                  {detalleVisitaSeleccionada.evidenciaTexto ||
                    detalleVisitaSeleccionada.comentario ||
                    "N/A"}
                </p>
              </div>

              <div className="rounded-md bg-violet-50 border border-violet-200 p-3">
                <p className="text-xs uppercase tracking-wide text-violet-700 font-semibold mb-1">
                  Materiales extra registrados
                </p>
                {Array.isArray(detalleVisitaSeleccionada.materialesExtra) &&
                detalleVisitaSeleccionada.materialesExtra.length > 0 ? (
                  <pre className="text-xs whitespace-pre-wrap text-violet-900">
                    {JSON.stringify(detalleVisitaSeleccionada.materialesExtra, null, 2)}
                  </pre>
                ) : (
                  <p className="text-violet-900">N/A</p>
                )}
              </div>

              <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold mb-1">
                  Archivos vinculados
                </p>
                <p className="text-slate-900">
                  {Array.isArray(detalleVisitaSeleccionada.archivos)
                    ? detalleVisitaSeleccionada.archivos.length
                    : 0}{" "}
                  archivo(s)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Sin datos de visita seleccionada.</p>
          )}
        </DialogContent>
      </Dialog>

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
                        className="border rounded p-3 bg-white space-y-3"
                      >
                        <div className="rounded-md border bg-slate-50 overflow-hidden aspect-video flex items-center justify-center">
                          {isVideoArchivo(archivo) ? (
                            <video
                              src={getArchivoPreviewUrl(archivo)}
                              controls
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : isImageArchivo(archivo) ? (
                            <img
                              src={getArchivoPreviewUrl(archivo)}
                              alt={getArchivoName(archivo)}
                              className="w-full h-full object-contain bg-white"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                              <FileText className="h-8 w-8" />
                              <p className="text-xs">Sin vista previa</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {getArchivoName(archivo)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenArchivo(archivo)}
                            className="flex-1"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadArchivo(archivo)}
                            className="flex-1"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Descargar
                          </Button>
                        </div>
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
                        className="border rounded p-3 bg-white space-y-3"
                      >
                        <div className="rounded-md border bg-slate-50 overflow-hidden aspect-video flex items-center justify-center">
                          {isVideoArchivo(archivo) ? (
                            <div className="relative w-full h-full">
                              <video
                                src={getArchivoPreviewUrl(archivo)}
                                controls
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white">
                                <PlayCircle className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          ) : isImageArchivo(archivo) ? (
                            <img
                              src={getArchivoPreviewUrl(archivo)}
                              alt={getArchivoName(archivo)}
                              className="w-full h-full object-contain bg-white"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-500">
                              <FileText className="h-8 w-8" />
                              <p className="text-xs">Sin vista previa</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {getArchivoName(archivo)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenArchivo(archivo)}
                            className="flex-1"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadArchivo(archivo)}
                            className="flex-1"
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Descargar
                          </Button>
                        </div>
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
