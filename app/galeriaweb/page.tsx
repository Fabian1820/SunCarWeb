/**
 * Página principal del módulo Galería Web
 * Gestión completa de imágenes del bucket S3 'galeria'
 */

'use client';

import { useState } from 'react';
import { useGaleriaWeb } from '@/hooks/use-galeriaweb';
import {
  CarpetaGaleria,
  CARPETAS_INFO,
  FotoGaleria,
} from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { Button } from '@/components/shared/atom/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/molecule/card';
import { FotosGrid } from '@/components/feats/galeriaweb/fotos-grid';
import { SubirFotoDialog } from '@/components/feats/galeriaweb/subir-foto-dialog';
import { EliminarFotoDialog } from '@/components/feats/galeriaweb/eliminar-foto-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/atom/select';
import { Label } from '@/components/shared/atom/label';
import { Upload, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/shared/atom/badge';
import { RouteGuard } from '@/components/auth/route-guard';
import { PageLoader } from '@/components/shared/atom/page-loader';
import { ModuleHeader } from '@/components/shared/organism/module-header';

export default function GaleriaWebPage() {
  return (
    <RouteGuard requiredModule="galeriaweb">
      <GaleriaWebPageContent />
    </RouteGuard>
  );
}

function GaleriaWebPageContent() {
  const {
    fotos,
    fotosFiltradas,
    isLoading,
    carpetaActual,
    subirFoto,
    eliminarFoto,
    cambiarCarpeta,
    refetch,
  } = useGaleriaWeb();

  const [isSubirDialogOpen, setIsSubirDialogOpen] = useState(false);
  const [fotoAEliminar, setFotoAEliminar] = useState<FotoGaleria | null>(null);

  // Contar fotos por carpeta
  const contarPorCarpeta = (carpeta: CarpetaGaleria): number => {
    return fotos.filter((f) => f.carpeta === carpeta).length;
  };

  const handleSubirFoto = async (carpeta: CarpetaGaleria, foto: File): Promise<boolean> => {
    const success = await subirFoto({ carpeta, foto });
    return success;
  };

  const handleEliminarFoto = async () => {
    if (!fotoAEliminar) return;

    const success = await eliminarFoto({ nombre_archivo: fotoAEliminar.nombre_archivo });

    if (success) {
      setFotoAEliminar(null);
    }
  };

  if (isLoading && fotos.length === 0) {
    return <PageLoader moduleName="Galería Web" text="Cargando galería..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <ModuleHeader
        title="Gestión de Galería Web"
        subtitle="Administrar imágenes del sitio web"
        badge={{ text: 'Multimedia', className: 'bg-pink-100 text-pink-800' }}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              className="h-9 w-9 touch-manipulation"
              aria-label="Actualizar"
              title="Actualizar"
            >
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
              <span className="sr-only">Actualizar</span>
            </Button>

            <Button
              size="icon"
              onClick={() => setIsSubirDialogOpen(true)}
              className="h-9 w-9 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 touch-manipulation"
              disabled={isLoading}
              aria-label="Subir foto"
              title="Subir foto"
            >
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Subir Foto</span>
              <span className="sr-only">Subir foto</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md border-l-4 border-l-pink-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-pink-600">{fotos.length}</p>
              </CardContent>
            </Card>

            {Object.entries(CARPETAS_INFO).map(([key, info]) => {
              const count = contarPorCarpeta(key as CarpetaGaleria);
              return (
                <Card key={key} className="border-0 shadow-md border-l-4 border-l-pink-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {info.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-900">{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Galería Principal */}
          <Card className="border-0 shadow-md border-l-4 border-l-pink-600">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-pink-600" />
                    Galería de Imágenes
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription>
                    Organiza y gestiona las imágenes por categorías
                  </CardDescription>
                </div>
                
                {/* Selector de filtro compacto */}
                <div className="flex items-center gap-3">
                  <Label htmlFor="filtro-carpeta" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Filtrar:
                  </Label>
                  <Select
                    value={carpetaActual}
                    onValueChange={(value) => cambiarCarpeta(value as CarpetaGaleria | 'todas')}
                  >
                    <SelectTrigger id="filtro-carpeta" className="w-48">
                      <SelectValue placeholder="Seleccionar carpeta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">
                        <div className="flex items-center justify-between w-full">
                          <span>Todas las fotos</span>
                          <Badge variant="secondary" className="ml-2">
                            {fotos.length}
                          </Badge>
                        </div>
                      </SelectItem>
                      {Object.entries(CARPETAS_INFO).map(([key, info]) => {
                        const count = contarPorCarpeta(key as CarpetaGaleria);
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center justify-between w-full">
                              <span>{info.label}</span>
                              <Badge variant="secondary" className="ml-2">
                                {count}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Grid de fotos filtradas */}
              <FotosGrid
                fotos={fotosFiltradas}
                onEliminarFoto={(nombreArchivo) => {
                  const foto = fotos.find((f) => f.nombre_archivo === nombreArchivo);
                  if (foto) setFotoAEliminar(foto);
                }}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Diálogos */}
        <SubirFotoDialog
          isOpen={isSubirDialogOpen}
          onClose={() => setIsSubirDialogOpen(false)}
          onSubir={handleSubirFoto}
          carpetaInicial={
            carpetaActual !== 'todas' ? carpetaActual : 'instalaciones_exterior'
          }
        />

        <EliminarFotoDialog
          isOpen={!!fotoAEliminar}
          foto={fotoAEliminar}
          onConfirm={handleEliminarFoto}
          onCancel={() => setFotoAEliminar(null)}
          isDeleting={isLoading}
        />
      </main>
    </div>
  );
}
