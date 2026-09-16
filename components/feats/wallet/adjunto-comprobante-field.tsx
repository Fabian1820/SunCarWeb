"use client";

import { useRef } from "react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { FileText, Image as ImageIcon, Paperclip, Upload, X } from "lucide-react";
import { comprimirImagenSiAplica, formatearTamano } from "@/lib/utils/comprimir-imagen";

interface AdjuntoComprobanteFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.heif";

/**
 * Selector del comprobante opcional (foto o documento) de un movimiento.
 * Solo elige y comprime el archivo — la subida real ocurre después de crear
 * la transacción (WalletService.uploadTransactionAdjunto), como en el patrón
 * de vales-salida.
 */
export function AdjuntoComprobanteField({
  file,
  onChange,
  disabled,
}: AdjuntoComprobanteFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const elegirArchivo = async (files: FileList | null) => {
    const elegido = files?.[0];
    if (!elegido) return;
    onChange(await comprimirImagenSiAplica(elegido));
    if (inputRef.current) inputRef.current.value = "";
    if (camaraRef.current) camaraRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        <Paperclip className="h-3.5 w-3.5" />
        Comprobante (opcional)
      </Label>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        disabled={disabled}
        onChange={(e) => void elegirArchivo(e.target.files)}
      />
      <input
        ref={camaraRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => void elegirArchivo(e.target.files)}
      />

      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          {file.type.startsWith("image/") ? (
            <ImageIcon className="h-4 w-4 text-slate-400 shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
          )}
          <span className="text-xs text-slate-700 truncate flex-1 min-w-0">
            {file.name}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">
            {formatearTamano(file.size)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="shrink-0 text-slate-400 hover:text-slate-700"
            aria-label="Quitar comprobante"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Adjuntar archivo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => camaraRef.current?.click()}
            disabled={disabled}
            className="gap-1.5 text-xs sm:hidden"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Tomar foto
          </Button>
        </div>
      )}
    </div>
  );
}
