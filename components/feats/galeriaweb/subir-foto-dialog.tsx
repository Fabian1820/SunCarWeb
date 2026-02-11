/**
 * Diálogo para subir nuevas fotos a la galería web
 * Permite subir una o múltiples fotos a la vez
 * Interfaz intuitiva con selector de archivo, drag & drop y pegar desde portapapeles
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { FileUpload } from "@/components/shared/molecule/file-upload";
import {
  CarpetaGaleria,
  CARPETAS_INFO,
} from "@/lib/types/feats/galeriaweb/galeriaweb-types";
import { Upload, FolderOpen, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/shared/atom/alert";

interface SubirFotoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubir: (carpeta: CarpetaGaleria, fotos: File[]) => Promise<boolean>;
  carpetaInicial?: CarpetaGaleria;
}

export function SubirFotoDialog({
  isOpen,
  onClose,
  onSubir,
  carpetaInicial = "instalaciones_exterior",
}: SubirFotoDialogProps) {
  const [carpeta, setCarpeta] = useState<CarpetaGaleria>(carpetaInicial);
  const [fotos, setFotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  const handleClose = () => {
    if (!isUploading) {
      setFotos([]);
      setCarpeta(carpetaInicial);
      setProgreso({ actual: 0, total: 0 });
      onClose();
    }
  };

  const handleSubir = async () => {
    if (fotos.length === 0) return;

    setIsUploading(true);
    setProgreso({ actual: 0, total: fotos.length });

    const success = await onSubir(carpeta, fotos);

    if (success) {
      handleClose();
    }

    setIsUploading(false);
    setProgreso({ actual: 0, total: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-6 w-6 text-pink-600" />
            Subir Fotos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Selector de carpeta */}
          <div className="space-y-3">
            <Label
              htmlFor="carpeta"
              className="text-base font-semibold flex items-center gap-2"
            >
              <FolderOpen className="h-5 w-5 text-pink-600" />
              Carpeta de Destino *
            </Label>
            <Select
              value={carpeta}
              onValueChange={(value) => setCarpeta(value as CarpetaGaleria)}
              disabled={isUploading}
            >
              <SelectTrigger id="carpeta" className="w-full h-12 text-base">
                <SelectValue placeholder="Seleccionar carpeta" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CARPETAS_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key} className="py-3">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{info.label}</span>
                      <span className="text-xs text-gray-500">
                        {info.descripcion}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Descripción de carpeta seleccionada */}
            <Alert className="bg-pink-50 border-pink-200">
              <Info className="h-4 w-4 text-pink-600" />
              <AlertDescription className="text-sm text-pink-800">
                {CARPETAS_INFO[carpeta].descripcion}
              </AlertDescription>
            </Alert>
          </div>

          {/* Área de carga de archivos - múltiple */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              Seleccionar Imágenes *
            </Label>

            <FileUpload
              id="foto-upload"
              accept="image/*"
              multiple
              value={fotos}
              onChange={setFotos}
              disabled={isUploading}
              maxSizeInMB={10}
              showPreview={false}
              className="min-h-[250px]"
            />

            {/* Información sobre optimización */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Optimización automática:</strong> Todas las imágenes se
                convertirán a JPG y se optimizarán para web antes de subir.
                Puedes seleccionar varias imágenes a la vez.
              </p>
            </div>
          </div>

          {/* Vista previa de imágenes (grid) */}
          {fotos.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Vista Previa ({fotos.length}{" "}
                {fotos.length === 1 ? "imagen" : "imágenes"})
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {fotos.map((foto, index) => (
                  <div
                    key={`${foto.name}-${index}`}
                    className="relative rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 aspect-video"
                  >
                    <img
                      src={URL.createObjectURL(foto)}
                      alt={`Vista previa ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <p className="text-xs text-white truncate">{foto.name}</p>
                      <p className="text-xs text-gray-300">
                        {(foto.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de progreso durante la subida */}
          {isUploading && progreso.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subiendo fotos...</span>
                <span className="font-medium text-pink-600">
                  {progreso.actual} / {progreso.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-pink-600 to-pink-700 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progreso.actual / progreso.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubir}
            disabled={fotos.length === 0 || isUploading}
            className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir {fotos.length > 1 ? `${fotos.length} Fotos` : "Foto"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
