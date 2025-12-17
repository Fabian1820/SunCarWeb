"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Search, Loader2 } from "lucide-react"
import { useBrigadasTrabajadores } from '@/hooks/use-brigadas-trabajadores'
import { TrabajadoresTable } from '@/components/feats/worker/trabajadores-table'
import { TrabajadorService } from '@/lib/api-services'
import { AsignarBrigadaForm } from '@/components/feats/brigade/AsignarBrigadaForm'
import { ConvertirJefeForm } from '@/components/feats/brigade/ConvertirJefeForm'
import { convertBrigadaToFrontend } from "@/lib/utils/brigada-converters"
import { useBrigadas } from "@/hooks/use-brigadas"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function TrabajadoresPage() {
  const { brigadas: brigadasTrabajadores, trabajadores, loading: loadingTrabajadores, error: errorTrabajadores, refetch } = useBrigadasTrabajadores()
  const { brigadas: backendBrigades, loading: loadingBrigadas, loadBrigadas } = useBrigadas()

  // Todos los hooks deben estar al inicio, antes de cualquier lógica condicional
  const [isAssignBrigadeDialogOpen, setIsAssignBrigadeDialogOpen] = useState(false)
  const [isConvertJefeDialogOpen, setIsConvertJefeDialogOpen] = useState(false)
  const [selectedTrabajador, setSelectedTrabajador] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const { toast } = useToast()

  // Filtro de trabajadores
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerType, setWorkerType] = useState<'todos' | 'jefes' | 'trabajadores'>('todos');

  // Convertir brigadas del backend al formato del frontend
  const brigades = Array.isArray(backendBrigades) ? backendBrigades.map(convertBrigadaToFrontend) : [];

  // Mostrar loader mientras se cargan los datos iniciales
  if (loadingTrabajadores || loadingBrigadas) {
    return <PageLoader moduleName="Trabajadores" text="Cargando trabajadores..." />
  }

  if (errorTrabajadores) {
    return <div>Error: {errorTrabajadores}</div>
  }
  // Filtrar solo brigadistas (is_brigadista = true)
  const filteredTrabajadores = Array.isArray(trabajadores) ? trabajadores.filter(w =>
    // Solo mostrar trabajadores que son brigadistas
    (w.is_brigadista === true || w.is_brigadista === undefined) // Mantener compatibilidad con datos sin el campo
    && (workerType === 'todos' ? true : workerType === 'jefes' ? w.tiene_contraseña : !w.tiene_contraseña)
    && (workerSearch === '' || w.nombre.toLowerCase().includes(workerSearch.toLowerCase()) || w.CI.includes(workerSearch))
  ) : [];

  // Handler para asignar brigada a trabajador existente
  const handleAsignarBrigada = async (data: { brigadaId: string }) => {
    setLoadingAction(true)
    try {
      const result = await TrabajadorService.asignarTrabajadorABrigada(
        data.brigadaId,
        selectedTrabajador.CI,
        selectedTrabajador.nombre
      );
      if (result === true) {
        toast({
          title: "Éxito",
          description: 'Brigada asignada correctamente',
        });
        setIsAssignBrigadeDialogOpen(false);
        await Promise.all([refetch(), loadBrigadas()]);
      } else {
        toast({
          title: "Error",
          description: 'Error al asignar brigada: respuesta inesperada del servidor',
          variant: "destructive",
        });
        console.error('Respuesta inesperada al asignar trabajador a brigada:', result);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || 'Error al asignar brigada',
        variant: "destructive",
      });
      console.error('Error al asignar trabajador a brigada:', e);
    } finally {
      setLoadingAction(false);
    }
  }

  // Handler para convertir trabajador a jefe de brigada
  const handleConvertirJefe = async (data: { contrasena: string, integrantes: string[] }) => {
    setLoadingAction(true)
    try {
      const integrantesArr = data.integrantes.map(ci => ({ CI: ci }))
      await TrabajadorService.convertirTrabajadorAJefe(selectedTrabajador.CI, data.contrasena, integrantesArr)
      toast({
        title: "Éxito",
        description: 'Trabajador convertido en jefe de brigada correctamente',
      });
      setIsConvertJefeDialogOpen(false)
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || 'Error al convertir trabajador',
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Gestión de Trabajadores"
        subtitle="Administrar personal y asignaciones"
        badge={{ text: "Personal", className: "bg-blue-100 text-blue-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">

        {/* Search */}
        <Card className="mb-8 border-l-4 border-l-blue-600">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="worker-search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar por nombre o CI de trabajador
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="worker-search"
                    placeholder="Buscar por nombre o CI..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <Label htmlFor="worker-type" className="text-sm font-medium text-gray-700 mb-2 block">
                  Tipo
                </Label>
                <select
                  id="worker-type"
                  className="border px-2 py-2 rounded w-48"
                  value={workerType}
                  onChange={e => setWorkerType(e.target.value as any)}
                >
                  <option value="todos">Todos</option>
                  <option value="jefes">Solo jefes de brigada</option>
                  <option value="trabajadores">Solo trabajadores</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workers Table */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lista de Trabajadores
              {loadingAction && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Mostrando {filteredTrabajadores.length} trabajadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrabajadoresTable
              trabajadores={filteredTrabajadores}
              brigadas={brigadasTrabajadores}
              onAssignBrigada={trabajador => { setSelectedTrabajador(trabajador); setIsAssignBrigadeDialogOpen(true); }}
              onConvertJefe={trabajador => { setSelectedTrabajador(trabajador); setIsConvertJefeDialogOpen(true); }}
              onRefresh={async () => { await Promise.all([refetch(), loadBrigadas()]); }}
            />
          </CardContent>
        </Card>

        {/* Modal para asignar brigada */}
        <Dialog open={isAssignBrigadeDialogOpen} onOpenChange={setIsAssignBrigadeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Brigada a Trabajador</DialogTitle>
            </DialogHeader>
            {selectedTrabajador && (
              <AsignarBrigadaForm
                onSubmit={handleAsignarBrigada}
                onCancel={() => setIsAssignBrigadeDialogOpen(false)}
                loading={loadingAction}
                brigadas={brigades}
                trabajador={selectedTrabajador}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal para convertir trabajador a jefe */}
        <Dialog open={isConvertJefeDialogOpen} onOpenChange={setIsConvertJefeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convertir en Jefe de Brigada</DialogTitle>
            </DialogHeader>
            {selectedTrabajador && (
              <ConvertirJefeForm
                onSubmit={handleConvertirJefe}
                onCancel={() => setIsConvertJefeDialogOpen(false)}
                loading={loadingAction}
                trabajador={selectedTrabajador}
                trabajadores={trabajadores}
              />
            )}
          </DialogContent>
        </Dialog>
        
      </main>
      <Toaster />
    </div>
  )
}
