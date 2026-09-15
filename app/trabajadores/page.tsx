"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Search, Loader2, UserPlus } from "lucide-react"
import { useBrigadasTrabajadores } from '@/hooks/use-brigadas-trabajadores'
import { TrabajadoresTable } from '@/components/feats/worker/trabajadores-table'
import { TrabajadorService, RecursosHumanosService } from '@/lib/api-services'
import { DEFAULT_ADMIN_PASS, asignarAdminPassDefault } from '@/lib/auth/default-admin-pass'
import { AsignarBrigadaForm } from '@/components/feats/brigade/AsignarBrigadaForm'
import { ConvertirJefeForm } from '@/components/feats/brigade/ConvertirJefeForm'
import { convertBrigadaToFrontend } from "@/lib/utils/brigada-converters"
import { useBrigadas } from "@/hooks/use-brigadas"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { WorkerForm } from "@/components/feats/worker/worker-form"
import { Button } from "@/components/shared/atom/button"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type { ExportOptions } from "@/lib/export-service"

export default function TrabajadoresPage() {
  const { brigadas: brigadasTrabajadores, trabajadores, loading: loadingTrabajadores, error: errorTrabajadores, refetch } = useBrigadasTrabajadores()
  const { brigadas: backendBrigades, loading: loadingBrigadas, loadBrigadas } = useBrigadas()

  // Todos los hooks deben estar al inicio, antes de cualquier logica condicional
  const [isAssignBrigadeDialogOpen, setIsAssignBrigadeDialogOpen] = useState(false)
  const [isConvertJefeDialogOpen, setIsConvertJefeDialogOpen] = useState(false)
  const [isCreateWorkerDialogOpen, setIsCreateWorkerDialogOpen] = useState(false)
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
    return <PageLoader moduleName="Instaladores" text="Cargando instaladores..." />
  }

  if (errorTrabajadores) {
    return <div>Error: {errorTrabajadores}</div>
  }
  const trabajadoresActivos = Array.isArray(trabajadores)
    ? trabajadores.filter((w) => w.activo !== false)
    : [];

  // Filtrar solo brigadistas (is_brigadista = true)
  const filteredTrabajadores = trabajadoresActivos.filter(w =>
    // Solo mostrar trabajadores que son brigadistas
    (w.is_brigadista === true || w.is_brigadista === undefined) // Mantener compatibilidad con datos sin el campo
    && (workerType === 'todos' ? true : workerType === 'jefes' ? w.es_jefe_brigada : !w.es_jefe_brigada)
    && (workerSearch === '' || w.nombre.toLowerCase().includes(workerSearch.toLowerCase()) || w.CI.includes(workerSearch))
  );

  // Exporta la lista tal como se ve (respeta búsqueda y tipo). La brigada de cada
  // instalador sale de las brigadas: la suya si es jefe, o aquella donde es integrante.
  const getExportOptions = (): Omit<ExportOptions, "filename"> => {
    const jefePorCi = new Map<string, string>()
    for (const b of brigadasTrabajadores) {
      const jefe = b.lider?.nombre || ""
      if (b.lider?.CI) jefePorCi.set(b.lider.CI, jefe)
      for (const integrante of b.integrantes || []) {
        if (integrante?.CI) jefePorCi.set(integrante.CI, jefe)
      }
    }

    const etiquetaTipo = {
      todos: "Todos",
      jefes: "Solo jefes de brigada",
      trabajadores: "Solo trabajadores",
    }[workerType]
    const subtitlePartes = [`Fecha: ${new Date().toLocaleDateString("es-ES")}`, `Tipo: ${etiquetaTipo}`]
    if (workerSearch.trim()) subtitlePartes.push(`Búsqueda: "${workerSearch.trim()}"`)
    subtitlePartes.push(`Instaladores: ${filteredTrabajadores.length}`)

    return {
      title: "Suncar SRL - Instaladores",
      subtitle: subtitlePartes.join(" · "),
      columns: [
        { header: "No.", key: "numero", width: 6 },
        { header: "Nombre", key: "nombre", width: 32 },
        { header: "CI", key: "ci", width: 16 },
        { header: "Rol", key: "rol", width: 18 },
        { header: "Teléfono", key: "telefono", width: 16 },
        { header: "Brigada (jefe)", key: "brigada", width: 30 },
      ],
      data: filteredTrabajadores.map((w, i) => ({
        numero: i + 1,
        nombre: w.nombre || "",
        ci: w.CI || "",
        rol: w.es_jefe_brigada ? "Jefe de brigada" : "Trabajador",
        telefono: w.telefono || "",
        brigada: jefePorCi.get(w.CI) || "Sin brigada",
      })),
    }
  }

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
          title: "Exito",
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
  const handleConvertirJefe = async (data: { integrantes: string[] }) => {
    setLoadingAction(true)
    try {
      const integrantesArr = data.integrantes.map(ci => ({ CI: ci }))
      await TrabajadorService.convertirTrabajadorAJefe(selectedTrabajador.CI, integrantesArr)
      toast({
        title: "Exito",
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

  // Handler para crear nuevo trabajador
  const handleCreateWorker = async (data: any) => {
    setLoadingAction(true)
    try {
      // Un trabajador "existente" ya tiene documento en `trabajadores` (venía de RRHH sin
      // ser instalador). Crearlo de nuevo con POST /trabajadores/ duplicaría el CI, porque
      // ese endpoint hace insert_one sin comprobar si ya existe. Para esos casos solo se
      // actualiza el registro (is_brigadista + brigada), nunca se vuelve a crear.
      // Sede y departamento no se piden aquí: son datos de Recursos Humanos, se asignan
      // desde ese módulo, no al agregar instalador.
      let baseMessage = ''
      if (data.mode === 'trabajador') {
        if (!data.existente) {
          await TrabajadorService.crearTrabajador(data.ci, data.name)
        }
        await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, { is_brigadista: true })
        baseMessage = data.existente ? 'Instalador asignado correctamente' : 'Instalador creado correctamente'
      } else if (data.mode === 'trabajador_asignar') {
        if (!data.existente) {
          await TrabajadorService.crearTrabajador(data.ci, data.name)
        }
        await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, { is_brigadista: true })
        await TrabajadorService.asignarTrabajadorABrigada(data.brigadeId, data.ci, data.name)
        baseMessage = data.existente
          ? 'Instalador asignado a brigada correctamente'
          : 'Instalador creado y asignado a brigada correctamente'
      } else if (data.mode === 'jefe') {
        await TrabajadorService.crearJefeBrigada(data.ci, data.name, undefined, [])
        await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, { is_brigadista: true })
        baseMessage = 'Jefe de brigada creado correctamente'
      } else if (data.mode === 'jefe_brigada') {
        const integrantesArr = data.integrantes.map((ci: string) => ({ CI: ci }))
        await TrabajadorService.crearJefeBrigada(data.ci, data.name, undefined, integrantesArr)
        await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, { is_brigadista: true })
        baseMessage = 'Jefe de brigada creado con integrantes correctamente'
      }

      const adminPassOk = await asignarAdminPassDefault(data.ci)
      toast({
        title: "Éxito",
        description: adminPassOk
          ? `${baseMessage}. Contraseña del dashboard: ${DEFAULT_ADMIN_PASS} (puede cambiarla desde su perfil).`
          : `${baseMessage}. Asigne la contraseña del dashboard manualmente desde /permisos.`,
      })

      setIsCreateWorkerDialogOpen(false)
      await Promise.all([refetch(), loadBrigadas()]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || 'Error al crear instalador',
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Gestion de Instaladores"
        subtitle="Administrar personal y asignaciones"
        badge={{ text: "Personal", className: "bg-blue-100 text-blue-800" }}
        actions={
          filteredTrabajadores.length > 0 ? (
            <ExportButtons
              getExportOptions={getExportOptions}
              baseFilename="instaladores"
              variant="compact"
            />
          ) : undefined
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">

        {/* Search and Actions */}
        <Card className="mb-8 border-l-4 border-l-blue-600">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="worker-search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar por nombre o CI de instalador
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
              <div className="flex flex-col justify-end">
                <Button
                  onClick={() => setIsCreateWorkerDialogOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar Instalador
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workers Table */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lista de Instaladores
              {loadingAction && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Mostrando {filteredTrabajadores.length} instaladores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrabajadoresTable
              trabajadores={filteredTrabajadores}
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
                trabajadores={trabajadoresActivos}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal para crear nuevo trabajador */}
        <Dialog open={isCreateWorkerDialogOpen} onOpenChange={setIsCreateWorkerDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Instalador</DialogTitle>
            </DialogHeader>
            <WorkerForm
              onSubmit={handleCreateWorker}
              onCancel={() => setIsCreateWorkerDialogOpen(false)}
              brigades={brigades}
              workers={trabajadoresActivos}
            />
          </DialogContent>
        </Dialog>
        
      </main>
      <Toaster />
    </div>
  )
}

