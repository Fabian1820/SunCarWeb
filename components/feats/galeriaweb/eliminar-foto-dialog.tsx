/**
 * Diálogo de confirmación para eliminar fotos de la galería
 * Muestra vista previa y advertencia antes de eliminar
 */

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/atom/alert-dialog';
import { FotoGaleria, CARPETAS_INFO } from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';

interface EliminarFotoDialogProps {
  isOpen: boolean;
  foto: FotoGaleria | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function EliminarFotoDialog({
  isOpen,
  foto,
  onConfirm,
  onCancel,
  isDeleting = false,
}: EliminarFotoDialogProps) {
  if (!foto) return null;

  const nombreSinCarpeta = foto.nombre_archivo.split('/').pop() || foto.nombre_archivo;

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Eliminación
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-base">
                ¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer.
              </p>

              {/* Vista previa de la foto a eliminar */}
              <div className="space-y-2">
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border">
                  <Image
                    src={foto.url}
                    alt={nombreSinCarpeta}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Información de la foto */}
                <div className="space-y-1 bg-gray-50 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Nombre:</span>
                    <span className="text-sm font-medium text-gray-700">{nombreSinCarpeta}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Carpeta:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {CARPETAS_INFO[foto.carpeta].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
