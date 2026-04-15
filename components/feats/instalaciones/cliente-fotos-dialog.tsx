"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import {
  FileText,
  Image as ImageIcon,
  Link2,
  Package,
  PlayCircle,
} from "lucide-react";
import { ClienteService } from "@/lib/api-services";

interface ClienteFotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNombre: string;
  clienteCodigo?: string;
  fotos?: unknown[];
}

type MediaKind = "image" | "video" | "file";

interface MediaEntry {
  url: string;
  fecha?: string;
  tipo?: string;
  nombre?: string;
  contentType?: string;
  kind: MediaKind;
}

const formatFecha = (fecha?: string) => {
  if (!fecha) return "Sin fecha";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const parseFecha = (fecha?: string) => {
  if (!fecha) return null;
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const getFileExtension = (url: string) => {
  try {
    const cleanPath = new URL(url).pathname;
    const fileName = cleanPath.split("/").pop() || "";
    const ext = fileName.split(".").pop() || "";
    return ext.toLowerCase();
  } catch {
    const noQuery = url.split("?")[0];
    const fileName = noQuery.split("/").pop() || "";
    const ext = fileName.split(".").pop() || "";
    return ext.toLowerCase();
  }
};

const getFileNameFromUrl = (url: string) => {
  try {
    const path = new URL(url).pathname;
    const fileName = path.split("/").pop() || "";
    return decodeURIComponent(fileName) || url;
  } catch {
    const noQuery = url.split("?")[0];
    const fileName = noQuery.split("/").pop() || "";
    return decodeURIComponent(fileName || "") || url;
  }
};

const resolveKind = (url: string, contentType?: string): MediaKind => {
  const normalizedType = (contentType || "").toLowerCase();
  if (normalizedType.startsWith("image/")) return "image";
  if (normalizedType.startsWith("video/")) return "video";

  const ext = getFileExtension(url);
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(ext)) {
    return "image";
  }
  if (["mp4", "mov", "webm", "ogg", "m4v", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  return "file";
};

const normalizeMedia = (raw: unknown): MediaEntry | null => {
  if (!raw) return null;

  if (typeof raw === "string") {
    const url = raw.trim();
    if (!url) return null;
    return {
      url,
      nombre: getFileNameFromUrl(url),
      kind: resolveKind(url),
    };
  }

  if (typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const url = normalizeText(
    record.url ||
      record.path ||
      record.file_url ||
      record.archivo_url ||
      record.s3_url ||
      record.link,
  );
  if (!url) return null;

  const contentType = normalizeText(
    record.content_type || record.contentType || record.mime_type || record.mimeType,
  );

  return {
    url,
    fecha: normalizeText(record.fecha || record.created_at || record.updated_at),
    tipo: normalizeText(record.tipo || record.categoria || record.origen),
    nombre: normalizeText(record.nombre || record.name || record.filename) || getFileNameFromUrl(url),
    contentType,
    kind: resolveKind(url, contentType),
  };
};

const getTipoLabel = (tipo?: string) => {
  if (!tipo) return "Sin tipo";
  if (tipo === "instalacion") return "Instalación";
  if (tipo === "averia") return "Avería";
  return tipo;
};

const getKindLabel = (kind: MediaKind) => {
  if (kind === "image") return "Foto";
  if (kind === "video") return "Video";
  return "Archivo";
};

export function ClienteFotosDialog({
  open,
  onOpenChange,
  clienteNombre,
  clienteCodigo,
  fotos = [],
}: ClienteFotosDialogProps) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipo, setTipo] = useState<"todos" | "instalacion" | "averia">("todos");
  const [fotosRemotas, setFotosRemotas] = useState<unknown[] | null>(null);
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadFotos = async () => {
      if (!open || !clienteCodigo) {
        if (mounted) setFotosRemotas(null);
        return;
      }

      setLoadingFotos(true);
      try {
        const fetched = await ClienteService.getFotosCliente(clienteCodigo);
        if (mounted) setFotosRemotas(fetched as unknown[]);
      } catch {
        if (mounted) setFotosRemotas(null);
      } finally {
        if (mounted) setLoadingFotos(false);
      }
    };

    void loadFotos();

    return () => {
      mounted = false;
    };
  }, [open, clienteCodigo]);

  const mediaConUrl = useMemo(() => {
    const base: unknown[] = [];
    if (Array.isArray(fotos)) base.push(...fotos);
    if (Array.isArray(fotosRemotas)) base.push(...fotosRemotas);

    const uniqueByUrl = new Map<string, MediaEntry>();
    base.forEach((item) => {
      const normalized = normalizeMedia(item);
      if (!normalized) return;
      if (!uniqueByUrl.has(normalized.url)) {
        uniqueByUrl.set(normalized.url, normalized);
      }
    });

    return Array.from(uniqueByUrl.values());
  }, [fotos, fotosRemotas]);

  const mediaFiltrada = useMemo(() => {
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;

    if (desde) desde.setHours(0, 0, 0, 0);
    if (hasta) hasta.setHours(23, 59, 59, 999);

    return mediaConUrl.filter((item) => {
      if (tipo !== "todos" && item.tipo !== tipo) return false;

      if (desde || hasta) {
        const fechaItem = parseFecha(item.fecha);
        if (!fechaItem) return false;
        if (desde && fechaItem < desde) return false;
        if (hasta && fechaItem > hasta) return false;
      }

      return true;
    });
  }, [mediaConUrl, fechaDesde, fechaHasta, tipo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Archivos del cliente: {clienteNombre}
            {clienteCodigo ? ` (${clienteCodigo})` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="fotos-desde">Fecha desde</Label>
            <Input
              id="fotos-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fotos-hasta">Fecha hasta</Label>
            <Input
              id="fotos-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fotos-tipo">Tipo</Label>
            <select
              id="fotos-tipo"
              className="w-full border rounded px-3 py-2 bg-white"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
            >
              <option value="todos">Todos ({mediaConUrl.length})</option>
              <option value="instalacion">Instalación</option>
              <option value="averia">Avería</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {mediaFiltrada.length} {mediaFiltrada.length === 1 ? "archivo" : "archivos"}
          </p>
          {loadingFotos && (
            <p className="text-xs text-slate-500">Cargando desde backend...</p>
          )}
        </div>

        {mediaFiltrada.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No hay archivos para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {mediaFiltrada.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-3 flex flex-col h-full">
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                    {item.kind === "image" ? (
                      <>
                        <img
                          src={item.url}
                          alt={`${item.nombre || "Foto"} de ${clienteNombre}`}
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback = target.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                        <div className="hidden w-full h-full items-center justify-center">
                          <Package className="h-12 w-12 text-slate-300" />
                        </div>
                      </>
                    ) : item.kind === "video" ? (
                      <>
                        <video
                          src={item.url}
                          controls
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 text-white p-1 border border-white/70">
                          <PlayCircle className="h-3.5 w-3.5" />
                        </span>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                        <FileText className="h-12 w-12" />
                        <span className="text-xs px-2 text-center line-clamp-2">
                          {item.nombre || getFileNameFromUrl(item.url)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-300"
                      >
                        {getTipoLabel(item.tipo)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-600 border-slate-300"
                      >
                        {getKindLabel(item.kind)}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500">{formatFecha(item.fecha)}</p>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      {item.kind === "video" ? (
                        <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : item.kind === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate" title={item.nombre || item.url}>
                        {item.nombre || getFileNameFromUrl(item.url)}
                      </span>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() =>
                        window.open(item.url, "_blank", "noopener,noreferrer")
                      }
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Abrir archivo
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
