"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  QrCode,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ValeSalidaService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import {
  comprimirImagenSiAplica,
  formatearTamano,
} from "@/lib/utils/comprimir-imagen";
import type {
  AdjuntoValeSalida,
  TokenSubidaMovilVale,
} from "@/lib/api-types";

interface ValeAdjuntosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valeId: string | null;
  valeCodigo?: string | null;
  /** Se llama tras subir o borrar, para refrescar el contador de la tabla. */
  onAdjuntosChange?: (valeId: string, total: number) => void;
}

const esImagen = (adjunto: AdjuntoValeSalida) =>
  adjunto.tipo === "imagen" || adjunto.mime_type?.startsWith("image/");

const formatearFecha = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export function ValeAdjuntosDialog({
  open,
  onOpenChange,
  valeId,
  valeCodigo,
  onAdjuntosChange,
}: ValeAdjuntosDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const [adjuntos, setAdjuntos] = useState<AdjuntoValeSalida[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qr, setQr] = useState<TokenSubidaMovilVale | null>(null);
  const [generandoQr, setGenerandoQr] = useState(false);

  const cargarAdjuntos = useCallback(async () => {
    if (!valeId) return;
    setCargando(true);
    setError(null);
    try {
      const data = await ValeSalidaService.getAdjuntos(valeId);
      setAdjuntos(data);
      onAdjuntosChange?.(valeId, data.length);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los adjuntos",
      );
    } finally {
      setCargando(false);
    }
  }, [valeId, onAdjuntosChange]);

  useEffect(() => {
    if (!open) {
      // El QR caduca en 15 min: no tiene sentido conservarlo entre aperturas.
      setQr(null);
      setConfirmarBorrado(null);
      setError(null);
      return;
    }
    void cargarAdjuntos();
  }, [open, cargarAdjuntos]);

  const subirArchivos = async (files: FileList | null) => {
    if (!valeId || !files || files.length === 0) return;

    setSubiendo(true);
    setError(null);
    try {
      const originales = Array.from(files);
      const preparados = await Promise.all(
        originales.map((f) => comprimirImagenSiAplica(f)),
      );
      const subidos = await ValeSalidaService.uploadAdjuntos(
        valeId,
        preparados,
      );
      const nuevos = [...adjuntos, ...subidos];
      setAdjuntos(nuevos);
      onAdjuntosChange?.(valeId, nuevos.length);
      toast({
        title: "Adjuntado",
        description: `${subidos.length} documento(s) adjuntado(s) al vale`,
      });
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo adjuntar el documento";
      setError(mensaje);
      toast({
        title: "Error",
        description: mensaje,
        variant: "destructive",
      });
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
      if (camaraRef.current) camaraRef.current.value = "";
    }
  };

  const borrarAdjunto = async (adjuntoId: string) => {
    if (!valeId) return;
    setBorrandoId(adjuntoId);
    setError(null);
    try {
      await ValeSalidaService.deleteAdjunto(valeId, adjuntoId);
      const nuevos = adjuntos.filter((a) => a.id !== adjuntoId);
      setAdjuntos(nuevos);
      onAdjuntosChange?.(valeId, nuevos.length);
      toast({
        title: "Eliminado",
        description: "El documento se elimino del vale",
      });
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo eliminar el documento";
      setError(mensaje);
      toast({ title: "Error", description: mensaje, variant: "destructive" });
    } finally {
      setBorrandoId(null);
      setConfirmarBorrado(null);
    }
  };

  const generarQr = async () => {
    if (!valeId) return;
    setGenerandoQr(true);
    setError(null);
    try {
      setQr(await ValeSalidaService.crearTokenSubidaMovil(valeId));
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : "No se pudo generar el codigo QR";
      setError(mensaje);
      toast({ title: "Error", description: mensaje, variant: "destructive" });
    } finally {
      setGenerandoQr(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-emerald-600" />
            Documentos del vale
            {valeCodigo ? (
              <span className="font-mono text-sm text-gray-500">
                {valeCodigo}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Adjunta aqui el vale impreso y firmado. Puedes subirlo desde esta
            PC, o fotografiarlo con el telefono usando el codigo QR.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Acciones de subida */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.heif"
            onChange={(e) => void subirArchivos(e.target.files)}
          />
          {/* `capture` hace que en un movil se abra la camara directo en vez
              del explorador de archivos. En una PC el atributo se ignora. */}
          <input
            ref={camaraRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => void subirArchivos(e.target.files)}
          />

          <Button
            onClick={() => inputRef.current?.click()}
            disabled={subiendo || !valeId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {subiendo ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {subiendo ? "Subiendo..." : "Subir archivo"}
          </Button>

          <Button
            variant="outline"
            onClick={() => camaraRef.current?.click()}
            disabled={subiendo || !valeId}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 sm:hidden"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Tomar foto
          </Button>

          <Button
            variant="outline"
            onClick={() => void generarQr()}
            disabled={generandoQr || !valeId}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {generandoQr ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Subir desde el movil
          </Button>
        </div>

        {/* QR de subida movil */}
        {qr ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Smartphone className="h-4 w-4" />
                <p className="text-sm font-semibold">
                  Escanea con la camara del telefono
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQr(null)}
                className="h-7 w-7 p-0 text-blue-700"
                title="Ocultar QR"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={`data:image/png;base64,${qr.qr_png_base64}`}
                alt="Codigo QR para subir el vale firmado desde el movil"
                className="h-44 w-44 rounded-md border border-blue-200 bg-white"
              />
              <div className="text-sm text-blue-900 space-y-2">
                <p>
                  Se abrira una pagina para tomar la foto del vale firmado. No
                  hace falta iniciar sesion en el telefono.
                </p>
                <p className="font-medium">
                  El enlace caduca en {qr.expira_en_minutos} minutos y solo
                  sirve para este vale.
                </p>
                <p className="text-xs text-blue-700">
                  Cuando termines de subir desde el movil, vuelve aqui y pulsa
                  Actualizar.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void cargarAdjuntos()}
                  disabled={cargando}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {cargando ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : null}
                  Actualizar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Listado */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Adjuntos ({adjuntos.length})
            </h4>
            {adjuntos.length > 0 ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                <Check className="h-3 w-3 mr-1" />
                Vale documentado
              </Badge>
            ) : null}
          </div>

          {cargando && adjuntos.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Cargando adjuntos...
            </div>
          ) : adjuntos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
              <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Este vale no tiene documentos adjuntos
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Imprime el vale, recoge la firma y sube aqui la foto o el
                escaneo.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {adjuntos.map((adjunto) => (
                <li
                  key={adjunto.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-2.5 hover:bg-gray-50"
                >
                  {esImagen(adjunto) && adjunto.download_url ? (
                    <a
                      href={adjunto.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <img
                        src={adjunto.download_url}
                        alt={adjunto.nombre}
                        className="h-12 w-12 rounded object-cover border border-gray-200"
                      />
                    </a>
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {adjunto.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatearTamano(adjunto.tamano)}
                      {adjunto.created_at
                        ? ` · ${formatearFecha(adjunto.created_at)}`
                        : ""}
                      {adjunto.origen === "movil" ? " · desde el movil" : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {adjunto.download_url ? (
                      <a
                        href={adjunto.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                        title="Abrir o descargar"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : null}

                    {confirmarBorrado === adjunto.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void borrarAdjunto(adjunto.id)}
                          disabled={borrandoId === adjunto.id}
                          className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
                        >
                          {borrandoId === adjunto.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Borrar"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmarBorrado(null)}
                          disabled={borrandoId === adjunto.id}
                          className="h-8 text-xs"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmarBorrado(adjunto.id)}
                        className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                        title="Eliminar (no se guarda historico)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {confirmarBorrado ? (
            <p className="text-xs text-red-600">
              Al borrar, el archivo se elimina definitivamente. Para reemplazar
              un firmado, borra este y sube el nuevo.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
