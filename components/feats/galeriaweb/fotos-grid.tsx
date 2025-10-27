/**
 * Componente Grid para mostrar las fotos de la galería
 * Organiza las tarjetas de fotos en una cuadrícula responsive
 */

'use client';

import { FotoGaleria } from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { FotoCard } from './foto-card';
import { ImageIcon } from 'lucide-react';

interface FotosGridProps {
  fotos: FotoGaleria[];
  onEliminarFoto: (nombreArchivo: string) => void;
  isLoading?: boolean;
}

export function FotosGrid({ fotos, onEliminarFoto, isLoading }: FotosGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-suncar-primary" />
          <p>Cargando fotos...</p>
        </div>
      </div>
    );
  }

  if (fotos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <ImageIcon className="h-16 w-16" />
          <p className="text-lg font-medium">No hay fotos en esta carpeta</p>
          <p className="text-sm">Sube tu primera foto usando el botón superior</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {fotos.map((foto) => (
        <FotoCard
          key={foto.nombre_archivo}
          foto={foto}
          onEliminar={onEliminarFoto}
          disabled={isLoading}
        />
      ))}
    </div>
  );
}
