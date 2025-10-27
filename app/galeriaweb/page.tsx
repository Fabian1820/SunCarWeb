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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/molecule/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/molecule/tabs';
import { FotosGrid } from '@/components/feats/galeriaweb/fotos-grid';
import { SubirFotoDialog } from '@/components/feats/galeriaweb/subir-foto-dialog';
import { EliminarFotoDialog } from '@/components/feats/galeriaweb/eliminar-foto-dialog';
import { Upload, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/shared/atom/badge';
import { RouteGuard } from '@/components/auth/route-guard';

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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-suncar-primary" />
            Galería Web
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las imágenes de la galería del sitio web
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => setIsSubirDialogOpen(true)}
            className="bg-suncar-primary hover:bg-suncar-primary/90"
            disabled={isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir Foto
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-suncar-primary">{fotos.length}</p>
          </CardContent>
        </Card>

        {Object.entries(CARPETAS_INFO).map(([key, info]) => {
          const count = contarPorCarpeta(key as CarpetaGaleria);
          return (
            <Card key={key}>
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

      {/* Tabs por carpeta */}
      <Card>
        <CardContent className="pt-6">
          <Tabs
            value={carpetaActual}
            onValueChange={(value) => cambiarCarpeta(value as CarpetaGaleria | 'todas')}
          >
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="todas" className="relative">
                Todas
                <Badge variant="secondary" className="ml-2">
                  {fotos.length}
                </Badge>
              </TabsTrigger>
              {Object.entries(CARPETAS_INFO).map(([key, info]) => {
                const count = contarPorCarpeta(key as CarpetaGaleria);
                return (
                  <TabsTrigger key={key} value={key} className="relative">
                    {info.label}
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="todas">
              <FotosGrid
                fotos={fotos}
                onEliminarFoto={(nombreArchivo) => {
                  const foto = fotos.find((f) => f.nombre_archivo === nombreArchivo);
                  if (foto) setFotoAEliminar(foto);
                }}
                isLoading={isLoading}
              />
            </TabsContent>

            {Object.keys(CARPETAS_INFO).map((key) => {
              const carpeta = key as CarpetaGaleria;
              const fotosCarpeta = fotos.filter((f) => f.carpeta === carpeta);

              return (
                <TabsContent key={carpeta} value={carpeta}>
                  <FotosGrid
                    fotos={fotosCarpeta}
                    onEliminarFoto={(nombreArchivo) => {
                      const foto = fotos.find((f) => f.nombre_archivo === nombreArchivo);
                      if (foto) setFotoAEliminar(foto);
                    }}
                    isLoading={isLoading}
                  />
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

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
    </div>
  );
}
