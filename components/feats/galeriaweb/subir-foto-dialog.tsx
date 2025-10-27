/**
 * Diálogo para subir nuevas fotos a la galería web
 * Interfaz intuitiva con selector de archivo, drag & drop y pegar desde portapapeles
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/molecule/dialog';
import { Button } from '@/components/shared/atom/button';
import { Label } from '@/components/shared/atom/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atom/select';
import { FileUpload } from '@/components/shared/molecule/file-upload';
import { CarpetaGaleria, CARPETAS_INFO, CONTENT_TYPES_VALIDOS } from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { Upload, FolderOpen, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/shared/atom/alert';

interface SubirFotoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubir: (carpeta: CarpetaGaleria, foto: File) => Promise<boolean>;
  carpetaInicial?: CarpetaGaleria;
}

export function SubirFotoDialog({
  isOpen,
  onClose,
  onSubir,
  carpetaInicial = 'instalaciones_exterior',
}: SubirFotoDialogProps) {
  const [carpeta, setCarpeta] = useState<CarpetaGaleria>(carpetaInicial);
  const [foto, setFoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    if (!isUploading) {
      setFoto(null);
      setCarpeta(carpetaInicial);
      onClose();
    }
  };

  const handleSubir = async () => {
    if (!foto) return;

    setIsUploading(true);
    const success = await onSubir(carpeta, foto);

    if (success) {
      handleClose();
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-6 w-6 text-pink-600" />
            Subir Nueva Foto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Selector de carpeta */}
          <div className="space-y-3">
            <Label htmlFor="carpeta" className="text-base font-semibold flex items-center gap-2">
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
                      <span className="text-xs text-gray-500">{info.descripcion}</span>
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

          {/* Área de carga de archivo - más grande e intuitiva */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              Seleccionar Imagen *
            </Label>

            <FileUpload
              id="foto-upload"
              accept="image/*"
              value={foto}
              onChange={setFoto}
              disabled={isUploading}
              maxSizeInMB={10}
              showPreview={false}
              className="min-h-[250px]"
            />

            {/* Información sobre optimización */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                ✨ <strong>Optimización automática:</strong> Todas las imágenes se convertirán a JPG y se optimizarán para web antes de subir.
              </p>
            </div>
          </div>

          {/* Vista previa mejorada */}
          {foto && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Vista Previa</Label>
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                <img
                  src={URL.createObjectURL(foto)}
                  alt="Vista previa"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <span className="font-medium">{foto.name}</span>
                <span className="text-gray-500">
                  {(foto.size / (1024 * 1024)).toFixed(2)} MB
                </span>
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
            disabled={!foto || isUploading}
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
                Subir Foto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
