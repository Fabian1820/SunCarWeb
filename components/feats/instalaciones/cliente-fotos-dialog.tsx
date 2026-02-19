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
import { Image as ImageIcon, Link2, Package, PlayCircle } from "lucide-react";
import type { ClienteFoto } from "@/lib/api-types";
import { ClienteService } from "@/lib/api-services";

interface ClienteFotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNombre: string;
  clienteCodigo?: string;
  fotos?: ClienteFoto[];
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

const getTipoLabel = (tipo?: string) => {
  if (tipo === "instalacion") return "Instalación";
  if (tipo === "averia") return "Avería";
  return tipo || "Sin tipo";
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

const isVideoUrl = (url: string) => {
  const ext = getFileExtension(url);
  return ["mp4", "mov", "webm", "ogg", "m4v"].includes(ext);
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
  const [fotosRemotas, setFotosRemotas] = useState<ClienteFoto[] | null>(null);
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
        if (mounted) setFotosRemotas(fetched);
      } catch {
        if (mounted) setFotosRemotas(null);
      } finally {
        if (mounted) setLoadingFotos(false);
      }
    };

    loadFotos();

    return () => {
      mounted = false;
    };
  }, [open, clienteCodigo]);

  const fotosFuente = fotosRemotas ?? fotos;

  const fotosConUrl = useMemo(
    () => fotosFuente.filter((foto) => Boolean(foto?.url)),
    [fotosFuente],
  );

  const fotosFiltradas = useMemo(() => {
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = fechaHasta ? new Date(fechaHasta) : null;

    if (desde) desde.setHours(0, 0, 0, 0);
    if (hasta) hasta.setHours(23, 59, 59, 999);

    return fotosConUrl.filter((foto) => {
      if (tipo !== "todos" && foto.tipo !== tipo) {
        return false;
      }

      if (desde || hasta) {
        const fechaFoto = parseFecha(foto.fecha);
        if (!fechaFoto) return false;
        if (desde && fechaFoto < desde) return false;
        if (hasta && fechaFoto > hasta) return false;
      }

      return true;
    });
  }, [fotosConUrl, fechaDesde, fechaHasta, tipo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Fotos del cliente: {clienteNombre}
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
              <option value="todos">Todos ({fotosConUrl.length})</option>
              <option value="instalacion">Instalación</option>
              <option value="averia">Avería</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {fotosFiltradas.length}{" "}
            {fotosFiltradas.length === 1 ? "foto" : "fotos"}
          </p>
          {loadingFotos && (
            <p className="text-xs text-slate-500">Cargando desde backend...</p>
          )}
        </div>

        {fotosFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No hay fotos para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {fotosFiltradas.map((foto, index) => {
              const esVideo = isVideoUrl(foto.url);

              return (
                <div
                  key={`${foto.url}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-3 flex flex-col h-full">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-200">
                      {esVideo ? (
                        <>
                          <video
                            src={foto.url}
                            controls
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 text-white p-1 border border-white/70">
                            <PlayCircle className="h-3.5 w-3.5" />
                          </span>
                        </>
                      ) : (
                        <>
                          <img
                            src={foto.url}
                            alt={`Foto ${index + 1} de ${clienteNombre}`}
                            className="w-full h-full object-contain p-2"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.classList.remove("hidden");
                            }}
                          />
                          <div className="hidden w-full h-full items-center justify-center">
                            <Package className="h-12 w-12 text-slate-300" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-300"
                        >
                          {getTipoLabel(foto.tipo)}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatFecha(foto.fecha)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {esVideo ? (
                          <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        <span className="truncate" title={foto.url}>
                          {foto.url}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          window.open(foto.url, "_blank", "noopener,noreferrer")
                        }
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        Abrir URL S3
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
