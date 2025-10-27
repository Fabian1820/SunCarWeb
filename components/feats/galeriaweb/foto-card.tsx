/**
 * Componente de tarjeta para mostrar una foto de la galería
 * Muestra la imagen, información y acciones de eliminación
 */

'use client';

import { FotoGaleria, CARPETAS_INFO } from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { Card, CardContent, CardFooter } from '@/components/shared/molecule/card';
import { Badge } from '@/components/shared/atom/badge';
import { Button } from '@/components/shared/atom/button';
import { Trash2, Eye, Download } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface FotoCardProps {
  foto: FotoGaleria;
  onEliminar: (nombreArchivo: string) => void;
  disabled?: boolean;
}

export function FotoCard({ foto, onEliminar, disabled }: FotoCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // Formatear tamaño de archivo
  const formatearTamano = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Formatear fecha
  const formatearFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Extraer nombre del archivo sin la carpeta
  const nombreSinCarpeta = foto.nombre_archivo.split('/').pop() || foto.nombre_archivo;

  const handleDescargar = () => {
    window.open(foto.url, '_blank');
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          {/* Imagen */}
          <div className="relative w-full h-48 bg-gray-100">
            {!imageError ? (
              <Image
                src={foto.url}
                alt={nombreSinCarpeta}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <span>Error al cargar imagen</span>
              </div>
            )}

            {/* Badge de carpeta */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                {CARPETAS_INFO[foto.carpeta].label}
              </Badge>
            </div>

            {/* Botón de vista previa */}
            <div className="absolute top-2 right-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                onClick={() => setShowFullImage(true)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Información */}
          <div className="p-4 space-y-2">
            <p className="text-sm font-medium truncate" title={nombreSinCarpeta}>
              {nombreSinCarpeta}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatearTamano(foto.tamano)}</span>
              <span>{formatearFecha(foto.fecha_subida)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleDescargar}
            disabled={disabled}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => onEliminar(foto.nombre_archivo)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Modal de vista previa */}
      {showFullImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={foto.url}
              alt={nombreSinCarpeta}
              fill
              className="object-contain"
              unoptimized
            />

            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4"
              onClick={() => setShowFullImage(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
