"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileText,
  Image,
  Loader2,
  Music,
  Paperclip,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import type { ArchivoCompra } from "@/lib/types/feats/compras/compra-types";
import { CompraService } from "@/lib/api-services";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

function ArchivoIcon({ tipo, className = "h-5 w-5" }: { tipo: ArchivoCompra["tipo"]; className?: string }) {
  if (tipo === "imagen") return <Image className={`${className} text-blue-500`} />;
  if (tipo === "video")  return <Video className={`${className} text-purple-500`} />;
  if (tipo === "audio")  return <Music className={`${className} text-pink-500`} />;
  return <FileText className={`${className} text-orange-500`} />;
}

interface CompraDocumentosPanelProps {
  compraId: string;
  archivos: ArchivoCompra[];
  onArchivosChange: (archivos: ArchivoCompra[]) => void;
  disabled?: boolean;
}

const ACCEPT_ALL =
  "image/*,video/*,audio/*," +
  "application/pdf," +
  ".doc,.docx,.xls,.xlsx,.txt,.csv";

export function CompraDocumentosPanel({
  compraId,
  archivos,
  onArchivosChange,
  disabled = false,
}: CompraDocumentosPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]     = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);

  const doUpload = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setUploading(true);
    try {
      const nuevos = await CompraService.uploadArchivos(compraId, files);
      onArchivosChange([...archivos, ...nuevos]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir los archivos");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    doUpload(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const files = Array.from(e.dataTransfer.files);
    doUpload(files);
  };

  const handleDelete = async (archivo: ArchivoCompra) => {
    if (!confirm(`¿Eliminar "${archivo.nombre}"?`)) return;
    setError(null);
    setDeletingId(archivo.id);
    try {
      await CompraService.deleteArchivo(compraId, archivo.id);
      onArchivosChange(archivos.filter((a) => a.id !== archivo.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar el archivo");
    } finally {
      setDeletingId(null);
    }
  };

  const busy = disabled || uploading;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-cyan-400 bg-cyan-50"
            : busy
            ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
            : "border-gray-300 bg-gray-50 hover:border-cyan-300 hover:bg-cyan-50/40 cursor-pointer"
        }`}
        onClick={() => !busy && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ALL}
          className="hidden"
          onChange={handleInputChange}
          disabled={busy}
        />

        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 text-cyan-500 animate-spin" />
            <p className="text-sm text-cyan-700 font-medium">Subiendo archivos…</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-cyan-100">
              <Upload className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Arrastra documentos aquí o{" "}
                <span className="text-cyan-600 underline underline-offset-2">haz clic para seleccionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                PDF, Word, Excel, imágenes, vídeos, audios · Máx. 50 MB por archivo
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <span className="text-red-500 text-xs shrink-0">⚠</span>
          <p className="text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {archivos.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-3">
          <Paperclip className="h-4 w-4 text-gray-300 shrink-0" />
          <p className="text-sm text-gray-400">No hay documentos adjuntos</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
          {archivos.map((archivo) => {
            const isDeleting = deletingId === archivo.id;
            return (
              <div
                key={archivo.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isDeleting ? "opacity-40" : "hover:bg-gray-50"
                }`}
              >
                <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100">
                  <ArchivoIcon tipo={archivo.tipo} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate" title={archivo.nombre}>
                    {archivo.nombre}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{formatBytes(archivo.tamano)}</span>
                    <span>·</span>
                    <span className="capitalize">{archivo.tipo}</span>
                    <span>·</span>
                    <span>{formatDate(archivo.created_at)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar / abrir"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {!disabled && (
                    <button
                      type="button"
                      title="Eliminar"
                      disabled={isDeleting || !!deletingId}
                      onClick={() => handleDelete(archivo)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isDeleting
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {archivos.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {archivos.length} archivo{archivos.length !== 1 ? "s" : ""} ·{" "}
          {formatBytes(archivos.reduce((s, a) => s + a.tamano, 0))} total
        </p>
      )}
    </div>
  );
}
