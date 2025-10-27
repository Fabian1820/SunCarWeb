/**
 * Página principal del módulo Galería Web
 * Gestión completa de imágenes del bucket S3 'galeria'
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGaleriaWeb } from '@/hooks/use-galeriaweb';
import {
  CarpetaGaleria,
  CARPETAS_INFO,
  FotoGaleria,
} from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { Button } from '@/components/shared/atom/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/molecule/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/molecule/tabs';
import { FotosGrid } from '@/components/feats/galeriaweb/fotos-grid';
import { SubirFotoDialog } from '@/components/feats/galeriaweb/subir-foto-dialog';
import { EliminarFotoDialog } from '@/components/feats/galeriaweb/eliminar-foto-dialog';
import { Upload, Image as ImageIcon, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/shared/atom/badge';
import { RouteGuard } from '@/components/auth/route-guard';
import { PageLoader } from '@/components/shared/atom/page-loader';

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

  if (isLoading && fotos.length === 0) {
    return <PageLoader moduleName="Galería Web" text="Cargando galería..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Gestión de Galería Web
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                    Multimedia
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Administrar imágenes del sitio web</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>

              <Button
                onClick={() => setIsSubirDialogOpen(true)}
                className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Foto
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-pink-600" />
                Galería de Imágenes
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Organiza y gestiona las imágenes por categorías
              </CardDescription>
            </CardHeader>
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
