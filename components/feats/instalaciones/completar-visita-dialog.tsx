"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/molecule/input";
import {
  FileText,
  Image,
  Video,
  Mic,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL, apiRequest } from "@/lib/api-config";
import { MaterialService } from "@/lib/api-services";
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types";
import type { Material } from "@/lib/material-types";

interface CompletarVisitaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendiente: PendienteVisita | null;
  onSuccess: () => void;
}

interface MaterialSeleccionado {
  material_id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
}

interface ArchivoSubido {
  nombre: string;
  tipo: "excel" | "pdf" | "word" | "imagen" | "video" | "audio";
  url: string;
  file: File;
}

const MAX_IMAGE_DIMENSION = 1600;
const FILE_UPLOAD_CONCURRENCY = 3;
const IMAGE_COMPRESSION_CONCURRENCY = 2;
const FILES_PER_UPLOAD_REQUEST = 4;
const MAX_COMPRESSED_IMAGE_SIZE_MB = 0.6;
const IMAGE_COMPRESSION_QUALITY = 0.7;
const IMAGE_COMPRESSION_MAX_ITERATIONS = 12;

type ResultadoType =
  | "oferta_cubre_necesidades"
  | "necesita_material_extra"
  | "necesita_oferta_nueva"
  | "";

export function CompletarVisitaDialog({
  open,
  onOpenChange,
  pendiente,
  onSuccess,
}: CompletarVisitaDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [tieneOferta, setTieneOferta] = useState<boolean | null>(null);
  const [verificandoOferta, setVerificandoOferta] = useState(false);
  const [ofertaAsignada, setOfertaAsignada] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Campos del formulario
  const [estudioEnergetico, setEstudioEnergetico] = useState<ArchivoSubido[]>(
    [],
  );
  const [evidenciaArchivos, setEvidenciaArchivos] = useState<ArchivoSubido[]>(
    [],
  );
  const [evidenciaTexto, setEvidenciaTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoType>("");
  const [materialesDisponibles, setMaterialesDisponibles] = useState<
    Material[]
  >([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<
    MaterialSeleccionado[]
  >([]);

  // Verificar si tiene oferta asignada cuando se abre el diálogo
  useEffect(() => {
    if (open && pendiente) {
      verificarOferta();
    }
  }, [open, pendiente]);

  // Cargar materiales cuando se necesite cotizar material extra
  useEffect(() => {
    if (
      resultado === "necesita_material_extra" &&
      materialesDisponibles.length === 0
    ) {
      cargarMateriales();
    }
  }, [resultado]);

  const verificarOferta = async () => {
    if (!pendiente) return;

    setVerificandoOferta(true);
    try {
      const clienteIdentificador = pendiente.id || pendiente.numero;
      // Usar fetch directamente para evitar logs de error en consola para 404 esperados
      const endpoint =
        pendiente.tipo === "lead"
          ? `/ofertas/confeccion/lead/${pendiente.id}`
          : `/ofertas/confeccion/cliente/${clienteIdentificador}`;

      // Usar la misma base que usa apiRequest (incluye /api)
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      // 404 es esperado cuando no hay ofertas - no es un error
      if (response.status === 404) {
        console.log(
          `ℹ️ ${pendiente.tipo === "lead" ? "Lead" : "Cliente"} ${pendiente.tipo === "lead" ? pendiente.id : pendiente.numero} sin oferta asignada`,
        );
        setTieneOferta(false);
        setOfertaAsignada(null);
        return;
      }

      // Si es otro error de HTTP
      if (!response.ok) {
        console.warn(`⚠️ Error HTTP ${response.status} al verificar oferta`);
        setTieneOferta(false);
        setOfertaAsignada(null);
        toast({
          title: "Advertencia",
          description:
            "No se pudo verificar la oferta asignada. Se asumirá que no tiene oferta.",
          variant: "default",
        });
        return;
      }

      // Respuesta exitosa
      const data = await response.json();

      // Misma lógica de "Ver Oferta": buscar oferta en data.ofertas / data.data.ofertas / data.data
      const payload = data?.data ?? data;
      const ofertasDesdePayload = Array.isArray(payload?.ofertas)
        ? payload.ofertas
        : [];
      const ofertasDesdeRaiz = Array.isArray(data?.ofertas) ? data.ofertas : [];

      const primeraOferta =
        ofertasDesdePayload[0] ??
        ofertasDesdeRaiz[0] ??
        (payload?.oferta as Record<string, unknown> | undefined) ??
        (pendiente.tipo === "cliente" &&
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : null);

      if (primeraOferta) {
        setTieneOferta(true);
        setOfertaAsignada(primeraOferta);
      } else {
        setTieneOferta(false);
        setOfertaAsignada(null);
      }
    } catch (error: any) {
      // Error de red u otro error inesperado
      console.warn("⚠️ Error de red al verificar oferta:", error.message);
      setTieneOferta(false);
      setOfertaAsignada(null);
      toast({
        title: "Advertencia",
        description:
          "No se pudo verificar la oferta. Se asumirá que no tiene oferta.",
        variant: "default",
      });
    } finally {
      setVerificandoOferta(false);
    }
  };

  const cargarMateriales = async () => {
    setLoadingMateriales(true);
    try {
      const materiales = await MaterialService.getAllMaterials();
      setMaterialesDisponibles(materiales);
    } catch (error) {
      console.error("Error al cargar materiales:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales",
        variant: "destructive",
      });
    } finally {
      setLoadingMateriales(false);
    }
  };

  const resetForm = () => {
    setEstudioEnergetico([]);
    setEvidenciaArchivos([]);
    setEvidenciaTexto("");
    setResultado("");
    setMaterialesSeleccionados([]);
    setTieneOferta(null);
    setOfertaAsignada(null);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: "estudio" | "evidencia",
  ) => {
    const files = e.target.files;
    if (!files) return;

    const nuevosArchivos: ArchivoSubido[] = [];

    Array.from(files).forEach((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      let tipoArchivo: ArchivoSubido["tipo"] = "pdf";

      // Determinar tipo de archivo
      if (["xlsx", "xls", "csv"].includes(extension)) {
        tipoArchivo = "excel";
      } else if (["pdf"].includes(extension)) {
        tipoArchivo = "pdf";
      } else if (["doc", "docx"].includes(extension)) {
        tipoArchivo = "word";
      } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        tipoArchivo = "imagen";
      } else if (["mp4", "avi", "mov", "webm"].includes(extension)) {
        tipoArchivo = "video";
      } else if (["mp3", "wav", "ogg", "m4a"].includes(extension)) {
        tipoArchivo = "audio";
      }

      nuevosArchivos.push({
        nombre: file.name,
        tipo: tipoArchivo,
        url: URL.createObjectURL(file),
        file: file,
      });
    });

    if (tipo === "estudio") {
      setEstudioEnergetico((prev) => [...prev, ...nuevosArchivos]);
    } else {
      setEvidenciaArchivos((prev) => [...prev, ...nuevosArchivos]);
    }
  };

  const removeArchivo = (index: number, tipo: "estudio" | "evidencia") => {
    if (tipo === "estudio") {
      setEstudioEnergetico((prev) => prev.filter((_, i) => i !== index));
    } else {
      setEvidenciaArchivos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const agregarMaterial = () => {
    setMaterialesSeleccionados((prev) => [
      ...prev,
      {
        material_id: "",
        codigo: "",
        nombre: "",
        cantidad: 1,
      },
    ]);
  };

  const actualizarMaterial = (index: number, materialId: string) => {
    const material = materialesDisponibles.find((m) => m.id === materialId);
    if (material && material.id) {
      setMaterialesSeleccionados((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          material_id: material.id,
          codigo: material.codigo,
          nombre: material.nombre || material.descripcion,
        };
        return updated;
      });
    }
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    setMaterialesSeleccionados((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        cantidad: Math.max(1, cantidad),
      };
      return updated;
    });
  };

  const eliminarMaterial = (index: number) => {
    setMaterialesSeleccionados((prev) => prev.filter((_, i) => i !== index));
  };

  const getImageDimensions = (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new window.Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        URL.revokeObjectURL(objectUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudieron leer dimensiones de la imagen"));
      };

      image.src = objectUrl;
    });
  };

  const getWebpFileName = (fileName: string): string => {
    return fileName.replace(/\.[^/.]+$/, "") + ".webp";
  };

  const forceWebpFallback = async (file: File): Promise<File> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("No se pudo convertir a webp"));
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.drawImage(image, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", IMAGE_COMPRESSION_QUALITY),
      );
      if (!blob) return file;

      return new File([blob], getWebpFileName(file.name), {
        type: "image/webp",
        lastModified: Date.now(),
      });
    } catch {
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const optimizeFile = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;
    let maxWidthOrHeight = MAX_IMAGE_DIMENSION;
    try {
      const { width, height } = await getImageDimensions(file);
      if (width <= 960 && height <= 960) {
        maxWidthOrHeight = 960;
      }
    } catch {
      // Si no podemos leer dimensiones, comprimimos igual con límite por defecto.
    }

    const shouldConvertToWebp =
      file.type !== "image/gif" && file.type !== "image/svg+xml";

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: MAX_COMPRESSED_IMAGE_SIZE_MB,
        maxWidthOrHeight,
        initialQuality: IMAGE_COMPRESSION_QUALITY,
        maxIteration: IMAGE_COMPRESSION_MAX_ITERATIONS,
        fileType: shouldConvertToWebp ? "image/webp" : undefined,
        useWebWorker: true,
      });
      if (shouldConvertToWebp && compressed.type !== "image/webp") {
        return await forceWebpFallback(compressed);
      }
      if (shouldConvertToWebp) {
        return new File([compressed], getWebpFileName(file.name), {
          type: "image/webp",
          lastModified: Date.now(),
        });
      }
      return compressed;
    } catch {
      return file;
    }
  };

  const optimizeFiles = async (files: ArchivoSubido[]): Promise<File[]> => {
    const optimizedFiles: File[] = new Array(files.length);
    const workerCount = Math.min(IMAGE_COMPRESSION_CONCURRENCY, files.length);
    let nextIndex = 0;

    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < files.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        optimizedFiles[currentIndex] = await optimizeFile(
          files[currentIndex].file,
        );
      }
    });

    await Promise.all(workers);
    return optimizedFiles;
  };

  const uploadCategoryFiles = async (
    visitaId: string,
    categoria: "estudio_energetico" | "evidencia",
    archivos: ArchivoSubido[],
  ) => {
    if (archivos.length === 0) return;

    const optimizedFiles = await optimizeFiles(archivos);
    const batches: File[][] = [];
    for (let i = 0; i < optimizedFiles.length; i += FILES_PER_UPLOAD_REQUEST) {
      batches.push(optimizedFiles.slice(i, i + FILES_PER_UPLOAD_REQUEST));
    }

    const workerCount = Math.min(FILE_UPLOAD_CONCURRENCY, batches.length);
    let nextIndex = 0;

    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < batches.length) {
        const filesBatch = batches[nextIndex];
        nextIndex += 1;

        const formData = new FormData();
        filesBatch.forEach((file) => {
          const fileName =
            file.type === "image/webp" ? getWebpFileName(file.name) : file.name;
          formData.append("files", file, fileName);
        });

        await apiRequest(
          `/visitas/${visitaId}/archivos/upload?categoria=${encodeURIComponent(categoria)}`,
          {
            method: "POST",
            body: formData,
          },
        );
      }
    });

    await Promise.all(workers);
  };

  const determinarNuevoEstado = (): string => {
    // Prioridad máxima: Sin oferta asignada
    if (tieneOferta === false) {
      return "Pendiente de presupuesto";
    }

    // Con oferta asignada, según resultado
    switch (resultado) {
      case "oferta_cubre_necesidades":
        return "Pendiente de instalación";
      case "necesita_material_extra":
        return "Pendiente de presupuesto";
      case "necesita_oferta_nueva":
        return "Pendiente de presupuesto";
      default:
        return "Pendiente de presupuesto";
    }
  };

  const handleSubmit = async () => {
    const leadId = pendiente?.id;
    const clienteIdentificador = pendiente?.id || pendiente?.numero;
    if (
      !pendiente ||
      (pendiente.tipo === "lead" && !leadId) ||
      (pendiente.tipo === "cliente" && !clienteIdentificador)
    ) {
      toast({
        title: "Datos incompletos",
        description:
          "No se pudo identificar el registro a actualizar. Recarga la tabla e inténtalo de nuevo.",
        variant: "destructive",
      });
      return;
    }

    // Validaciones
    if (estudioEnergetico.length === 0) {
      toast({
        title: "Campo requerido",
        description: "Debe subir al menos un archivo de estudio energético",
        variant: "destructive",
      });
      return;
    }

    if (evidenciaArchivos.length === 0 && !evidenciaTexto.trim()) {
      toast({
        title: "Campo requerido",
        description: "Debe proporcionar evidencia (archivos o texto)",
        variant: "destructive",
      });
      return;
    }

    // Si tiene oferta, debe seleccionar resultado
    if (tieneOferta && !resultado) {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar un resultado",
        variant: "destructive",
      });
      return;
    }

    // Si necesita material extra, debe seleccionar materiales
    if (
      resultado === "necesita_material_extra" &&
      materialesSeleccionados.length === 0
    ) {
      toast({
        title: "Materiales requeridos",
        description: "Debe seleccionar al menos un material",
        variant: "destructive",
      });
      return;
    }

    if (resultado === "necesita_material_extra") {
      const materialIncompleto = materialesSeleccionados.find(
        (m) => !m.material_id || m.cantidad < 1,
      );
      if (materialIncompleto) {
        toast({
          title: "Material incompleto",
          description:
            "Todos los materiales deben tener un producto seleccionado y cantidad válida",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const nuevoEstado = determinarNuevoEstado();
      const token = localStorage.getItem("auth_token");
      const parseVisitas = (visitasResponse: any): any[] => {
        const data = visitasResponse?.data ?? visitasResponse;
        return Array.isArray(data?.visitas)
          ? data.visitas
          : Array.isArray(visitasResponse?.visitas)
            ? visitasResponse.visitas
            : Array.isArray(data)
              ? data
              : Array.isArray(visitasResponse)
                ? visitasResponse
                : data && typeof data === "object"
                  ? [data]
                  : [];
      };

      let visitas: any[] = [];
      let crearYCompletarDirecto = false;

      if (pendiente.tipo === "lead") {
        const response = await fetch(`${API_BASE_URL}/visitas/lead/${leadId}`, {
          method: "GET",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });

        if (response.status === 404) {
          crearYCompletarDirecto = true;
        } else if (!response.ok) {
          throw new Error(
            `No se pudo consultar visitas del lead (${response.status} ${response.statusText})`,
          );
        } else {
          const visitasResponse = await response.json();
          visitas = parseVisitas(visitasResponse);
          if (visitas.length === 0) {
            crearYCompletarDirecto = true;
          }
        }
      } else {
        const visitaLookupEndpoints = Array.from(
          new Set(
            [
              clienteIdentificador
                ? `/visitas/cliente/${clienteIdentificador}`
                : "",
              pendiente.numero ? `/visitas/cliente/${pendiente.numero}` : "",
            ].filter(Boolean),
          ),
        );

        for (const endpoint of visitaLookupEndpoints) {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              "Content-Type": "application/json",
            },
          });

          if (response.status === 404) {
            continue;
          }

          if (!response.ok) {
            throw new Error(
              `No se pudo consultar visitas (${response.status} ${response.statusText})`,
            );
          }

          const visitasResponse = await response.json();
          visitas = parseVisitas(visitasResponse);
          if (visitas.length > 0) {
            break;
          }
        }
      }

      const resultadoParaBackend =
        resultado || (tieneOferta === false ? "estudio_sin_oferta" : null);
      let visitaIdParaArchivos: string | null = null;

      const extraerVisitaId = (payload: any): string | null => {
        const data = payload?.data ?? payload;
        return (
          data?.id ??
          data?._id ??
          data?.visita_id ??
          data?.visita?.id ??
          data?.visita?._id ??
          payload?.id ??
          payload?._id ??
          null
        );
      };

      if (crearYCompletarDirecto && pendiente.tipo === "lead") {
        const createPayload: Record<string, unknown> = {
          lead_id: String(leadId),
          motivo: (pendiente.comentario?.trim() || "Visita técnica").toString(),
        };

        if (resultadoParaBackend) {
          createPayload.resultado = resultadoParaBackend;
        }
        if (evidenciaTexto.trim()) {
          createPayload.evidencia_texto = evidenciaTexto.trim();
          createPayload.notas = evidenciaTexto.trim();
        }

        const createResponse = await apiRequest<any>("/visitas/", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });
        visitaIdParaArchivos = extraerVisitaId(createResponse);
      } else {
        if (visitas.length === 0) {
          throw new Error("No se encontró una visita para este registro");
        }

        const visitaPendiente =
          visitas.find(
            (v) => String(v?.estado || "").toLowerCase() === "programada",
          ) ??
          visitas.find((v) => {
            const estado = String(v?.estado || "").toLowerCase();
            return estado !== "completada" && estado !== "cancelada";
          }) ??
          visitas[0];

        const visitaId =
          visitaPendiente?.id ||
          visitaPendiente?._id ||
          visitaPendiente?.visita_id;

        if (!visitaId) {
          throw new Error("La visita encontrada no tiene identificador válido");
        }

        const updatePayload: Record<string, unknown> = {
          estado: "completada",
          fecha_completada: new Date().toISOString(),
          nuevo_estado: nuevoEstado,
          tiene_oferta: Boolean(tieneOferta),
        };

        if (resultadoParaBackend) {
          updatePayload.resultado = resultadoParaBackend;
        }
        if (evidenciaTexto.trim()) {
          updatePayload.evidencia_texto = evidenciaTexto.trim();
          updatePayload.notas = evidenciaTexto.trim();
        }
        if (resultado === "necesita_material_extra") {
          updatePayload.materiales_extra = materialesSeleccionados.map((m) => {
            const materialCatalogo = materialesDisponibles.find(
              (material) => material.id === m.material_id,
            );
            const nombreNormalizado =
              m.nombre?.trim() ||
              materialCatalogo?.nombre?.trim() ||
              materialCatalogo?.descripcion?.trim() ||
              m.codigo;

            return {
              ...m,
              nombre: nombreNormalizado,
            };
          });
        }

        await apiRequest(`/visitas/${visitaId}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });
        visitaIdParaArchivos = String(visitaId);
      }

      if (!visitaIdParaArchivos) {
        throw new Error(
          "La visita se actualizó, pero no se pudo identificar su ID para guardar archivos.",
        );
      }

      await Promise.all([
        uploadCategoryFiles(
          visitaIdParaArchivos,
          "estudio_energetico",
          estudioEnergetico,
        ),
        uploadCategoryFiles(
          visitaIdParaArchivos,
          "evidencia",
          evidenciaArchivos,
        ),
      ]);

      toast({
        title: "Visita completada",
        description: `${pendiente?.tipo === "lead" ? "Lead" : "Cliente"} actualizado a estado: ${nuevoEstado}`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error al completar visita:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la visita",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconForTipo = (tipo: ArchivoSubido["tipo"]) => {
    switch (tipo) {
      case "excel":
      case "pdf":
      case "word":
        return <FileText className="h-4 w-4" />;
      case "imagen":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getOfertaAsignadaTitulo = (): string => {
    if (!ofertaAsignada) return "Se encontró una oferta asignada";
    const candidatos = [
      ofertaAsignada["nombre"],
      ofertaAsignada["nombre_oferta"],
      ofertaAsignada["numero_oferta"],
    ];
    const titulo = candidatos.find(
      (valor): valor is string =>
        typeof valor === "string" && valor.trim().length > 0,
    );
    return titulo ?? "Se encontró una oferta asignada";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-orange-600" />
            Completar Visita
          </DialogTitle>
          {pendiente && (
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={pendiente.tipo === "lead" ? "default" : "secondary"}
              >
                {pendiente.tipo === "lead" ? "Lead" : "Cliente"}
              </Badge>
              <span className="text-sm text-gray-600">{pendiente.nombre}</span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado de Verificación de Oferta */}
          {verificandoOferta && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-800">
                  Verificando oferta asignada...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Alerta: Sin Oferta Asignada */}
          {!verificandoOferta && tieneOferta === false && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 mb-1">
                      Sin Oferta Asignada
                    </p>
                    <p className="text-sm text-orange-800">
                      Este {pendiente?.tipo === "lead" ? "lead" : "cliente"} no
                      tiene una oferta asignada. El estado se actualizará
                      automáticamente a{" "}
                      <strong>"Pendiente de presupuesto"</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Oferta detectada */}
          {!verificandoOferta && tieneOferta && ofertaAsignada && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 mb-1">
                      Oferta Asignada
                    </p>
                    <p className="text-sm text-green-800">
                      {getOfertaAsignadaTitulo()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estudio Energético */}
          <div>
            <Label className="text-base font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Estudio Energético
              <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Subir archivos Excel, PDF o Word con el estudio energético
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
              <input
                type="file"
                id="estudio-upload"
                className="hidden"
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                multiple
                onChange={(e) => handleFileUpload(e, "estudio")}
              />
              <label
                htmlFor="estudio-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Haz clic para subir archivos
                </p>
                <p className="text-xs text-gray-400 mt-1">Excel, PDF o Word</p>
              </label>
            </div>

            {estudioEnergetico.length > 0 && (
              <div className="mt-3 space-y-2">
                {estudioEnergetico.map((archivo, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIconForTipo(archivo.tipo)}
                        <span className="text-sm font-medium">
                          {archivo.nombre}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeArchivo(index, "estudio")}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Evidencia */}
          <div>
            <Label className="text-base font-semibold mb-2 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Evidencia
              <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Fotos, videos, audios o descripción textual de la visita
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 transition-colors">
              <input
                type="file"
                id="evidencia-upload"
                className="hidden"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={(e) => handleFileUpload(e, "evidencia")}
              />
              <label
                htmlFor="evidencia-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Haz clic para subir archivos multimedia
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fotos, videos o audios
                </p>
              </label>
            </div>

            {evidenciaArchivos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {evidenciaArchivos.map((archivo, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getIconForTipo(archivo.tipo)}
                        <span className="text-sm font-medium truncate">
                          {archivo.nombre}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeArchivo(index, "evidencia")}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-3">
              <Label htmlFor="evidencia-texto" className="text-sm mb-2">
                O describe la evidencia
              </Label>
              <Textarea
                id="evidencia-texto"
                placeholder="Descripción de lo observado durante la visita..."
                value={evidenciaTexto}
                onChange={(e) => setEvidenciaTexto(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Resultado - Solo si tiene oferta */}
          {!verificandoOferta && tieneOferta && (
            <div>
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Resultado de la Visita
                <span className="text-red-500">*</span>
              </Label>

              <div className="space-y-3">
                {/* Opción 1: Oferta cubre necesidades */}
                <Card
                  className={`border-2 cursor-pointer transition-all ${
                    resultado === "oferta_cubre_necesidades"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                  onClick={() => setResultado("oferta_cubre_necesidades")}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        resultado === "oferta_cubre_necesidades"
                          ? "border-green-600 bg-green-600"
                          : "border-gray-300"
                      }`}
                    >
                      {resultado === "oferta_cubre_necesidades" && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        La oferta cubre las necesidades del{" "}
                        {pendiente?.tipo === "lead" ? "lead" : "cliente"}{" "}
                        perfectamente
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Estado:{" "}
                        <strong className="text-green-700">
                          Pendiente de instalación
                        </strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Opción 2: Necesita material extra */}
                <Card
                  className={`border-2 cursor-pointer transition-all ${
                    resultado === "necesita_material_extra"
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                  onClick={() => setResultado("necesita_material_extra")}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        resultado === "necesita_material_extra"
                          ? "border-purple-600 bg-purple-600"
                          : "border-gray-300"
                      }`}
                    >
                      {resultado === "necesita_material_extra" && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Se necesita cotizar material extra
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Estado:{" "}
                        <strong className="text-purple-700">
                          Pendiente de presupuesto
                        </strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Opción 3: Necesita oferta nueva */}
                <Card
                  className={`border-2 cursor-pointer transition-all ${
                    resultado === "necesita_oferta_nueva"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => setResultado("necesita_oferta_nueva")}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        resultado === "necesita_oferta_nueva"
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {resultado === "necesita_oferta_nueva" && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        Necesita una oferta completamente nueva
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Estado:{" "}
                        <strong className="text-blue-700">
                          Pendiente de presupuesto
                        </strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Selector de materiales (solo si se necesita material extra) */}
          {resultado === "necesita_material_extra" && (
            <div>
              <Label className="text-base font-semibold mb-3">
                Materiales Extra Requeridos
              </Label>

              {loadingMateriales ? (
                <div className="text-center py-4 text-gray-500">
                  Cargando materiales...
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {materialesSeleccionados.map((material, index) => (
                      <Card key={index} className="border">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <Label className="text-sm mb-1">Material</Label>
                              <select
                                className="w-full border rounded px-3 py-2 text-sm"
                                value={material.material_id}
                                onChange={(e) =>
                                  actualizarMaterial(index, e.target.value)
                                }
                              >
                                <option value="">
                                  Seleccionar material...
                                </option>
                                {materialesDisponibles.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.codigo} - {m.nombre} ({m.categoria})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-sm mb-1">Cantidad</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={material.cantidad}
                                  onChange={(e) =>
                                    actualizarCantidad(
                                      index,
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => eliminarMaterial(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={agregarMaterial}
                  >
                    + Agregar Material
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || verificandoOferta}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? "Guardando..." : "Completar Visita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
