"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { ArrowLeft, DollarSign, Users, Calendar, UserPlus, List, Briefcase } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RecursosHumanosTableFinal } from "@/components/feats/recursos-humanos/recursos-humanos-table-final"
import { CargosResumenTable } from "@/components/feats/recursos-humanos/cargos-resumen-table"
import { EstimulosDialog } from "@/components/feats/recursos-humanos/estimulos-dialog"
import { CrearTrabajadorForm } from "@/components/feats/recursos-humanos/crear-trabajador-form"
import { WorkerDetailsDashboard } from "@/components/feats/recursos-humanos/worker-details-dashboard"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { useRecursosHumanos } from "@/hooks/use-recursos-humanos"
import type { CrearTrabajadorRRHHRequest, TrabajadorRRHH } from "@/lib/recursos-humanos-types"
import type { ExportOptions } from "@/lib/export-service"

export default function RecursosHumanosPage() {
  const {
    trabajadores,
    ultimoIngreso,
    cargos,
    estadoAsistencia,
    loading,
    loadingCargos,
    loadingAsistencia,
    error,
    actualizarCampoTrabajador,
    guardarIngresoMensual,
    crearTrabajador,
    eliminarTrabajador,
    loadCargos,
    refresh
  } = useRecursosHumanos()

  const [isEstimulosDialogOpen, setIsEstimulosDialogOpen] = useState(false)
  const [isCrearTrabajadorDialogOpen, setIsCrearTrabajadorDialogOpen] = useState(false)
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false)
  const [vistaActual, setVistaActual] = useState<'trabajadores' | 'cargos'>('trabajadores')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [trabajadorToDelete, setTrabajadorToDelete] = useState<{ ci: string; nombre: string } | null>(null)
  const [isDeletingWorker, setIsDeletingWorker] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRRHH | null>(null)
  const { toast} = useToast()

  // Cargar cargos cuando se cambia a vista de cargos
  useEffect(() => {
    if (vistaActual === 'cargos' && cargos.length === 0) {
      loadCargos()
    }
  }, [vistaActual, cargos.length, loadCargos])

  // Obtener mes y año actuales o del último ingreso
  const mesActual = ultimoIngreso?.mes || new Date().getMonth() + 1
  const anioActual = ultimoIngreso?.anio || new Date().getFullYear()

  const handleActualizarCampo = async (ci: string, campo: string, valor: any) => {
    const result = await actualizarCampoTrabajador(ci, campo as any, valor)

    if (result.success) {
      toast({
        title: "Actualización exitosa",
        description: result.message,
      })
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }

    return result
  }

  const handleGuardarEstimulos = async (monto: number, mes: string, anio: string) => {
    const mesNum = parseInt(mes)
    const anioNum = parseInt(anio)

    const result = await guardarIngresoMensual(monto, mesNum, anioNum, 'CUP')

    if (result.success) {
      // Verificar si es un mensaje de "sin cambios"
      const esSinCambios = result.message.toLowerCase().includes('no hay cambios')
      
      toast({
        title: esSinCambios ? "Sin cambios" : "Configuración guardada",
        description: esSinCambios ? result.message : `Monto de estímulos: $${monto.toFixed(2)} para ${mes}/${anio}`,
      })
      setIsEstimulosDialogOpen(false)
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleCrearTrabajador = async (data: CrearTrabajadorRRHHRequest) => {
    setIsSubmittingWorker(true)

    const result = await crearTrabajador(data)

    setIsSubmittingWorker(false)

    if (result.success) {
      toast({
        title: "Trabajador creado",
        description: `Se ha creado el trabajador ${data.nombre} exitosamente.`,
      })
      setIsCrearTrabajadorDialogOpen(false)
    } else {
      toast({
        title: "Error al crear trabajador",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleEliminarTrabajador = async (ci: string, nombre: string): Promise<void> => {
    setTrabajadorToDelete({ ci, nombre })
    setIsDeleteDialogOpen(true)
  }

  const handleVerDetalles = (trabajador: TrabajadorRRHH) => {
    setTrabajadorSeleccionado(trabajador)
    setIsDetailsDialogOpen(true)
  }

  const confirmEliminarTrabajador = async () => {
    if (!trabajadorToDelete) return

    setIsDeletingWorker(true)
    const result = await eliminarTrabajador(trabajadorToDelete.ci)
    setIsDeletingWorker(false)

    if (result.success) {
      toast({
        title: "Trabajador eliminado",
        description: `Se ha eliminado el trabajador ${trabajadorToDelete.nombre} exitosamente.`,
      })
      setIsDeleteDialogOpen(false)
      setTrabajadorToDelete(null)
      // La tabla ya se actualiza automáticamente porque el hook actualiza el estado local
    } else {
      toast({
        title: "Error al eliminar trabajador",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  // Función helper para calcular salario (igual que en la tabla)
  const calcularSalario = (trabajador: any, montoTotal: number, totalTrabajadores: number, trabajadoresDestacados: number): number => {
    if (!trabajador.salario_fijo || !trabajador.dias_trabajables) return 0
    
    const diasTrabajados = trabajador.dias_trabajables - (trabajador.dias_no_trabajados?.length || 0)
    const salarioProporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados
    
    // Estímulo fijo: 75% del total × porcentaje individual del trabajador
    const estimuloFijo = montoTotal * 0.75 * ((trabajador.porcentaje_fijo_estimulo || 0) / 100)
    
    // Estímulo variable: 25% del total × porcentaje individual del trabajador
    const estimuloVariable = trabajador.porcentaje_variable_estimulo > 0 
      ? montoTotal * 0.25 * ((trabajador.porcentaje_variable_estimulo || 0) / 100)
      : 0
    
    const salarioTotal = salarioProporcional + estimuloFijo + estimuloVariable + (trabajador.alimentacion || 0)
    
    return salarioTotal
  }

  // Preparar opciones de exportación para la vista de trabajadores
  const getExportOptionsTrabajadores = (): Omit<ExportOptions, 'filename'> => {
    return {
      title: 'Nómina Mensual - Vista por Trabajador',
      subtitle: `Período: ${String(mesActual).padStart(2, '0')}/${anioActual} | Monto Total Estímulos: $${(ultimoIngreso?.monto || 0).toFixed(2)}`,
      columns: [
        { header: 'CI', key: 'CI', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Cargo', key: 'cargo', width: 20 },
        { header: 'Salario Fijo', key: 'salario_fijo', width: 15 },
        { header: '% Estímulo Fijo', key: 'porcentaje_fijo_estimulo', width: 15 },
        { header: '% Estímulo Variable', key: 'porcentaje_variable_estimulo', width: 18 },
        { header: 'Alimentación', key: 'alimentacion', width: 15 },
        { header: 'Días Trabajables', key: 'dias_trabajables', width: 15 },
        { header: 'Días No Trabajados', key: 'dias_no_trabajados_count', width: 18 },
        { header: 'Salario Total', key: 'salario_total', width: 15 },
      ],
      data: trabajadores.map(t => ({
        ...t,
        dias_no_trabajados_count: t.dias_no_trabajados?.length || 0,
        salario_total: calcularSalario(t, ultimoIngreso?.monto || 0, trabajadores.length, trabajadores.filter(tr => tr.porcentaje_variable_estimulo > 0).length)
      }))
    }
  }

  // Preparar opciones de exportación para la vista de cargos
  const getExportOptionsCargos = (): Omit<ExportOptions, 'filename'> => {
    return {
      title: 'Resumen de Nómina - Vista por Cargo',
      subtitle: `Período: ${String(mesActual).padStart(2, '0')}/${anioActual}`,
      columns: [
        { header: 'Cargo', key: 'cargo', width: 25 },
        { header: 'Cantidad de Personas', key: 'cantidad_personas', width: 20 },
        { header: 'Total Salario Fijo', key: 'salario_fijo', width: 20 },
        { header: 'Total % Estímulo Fijo', key: 'porcentaje_fijo_estimulo', width: 22 },
        { header: 'Total % Estímulo Variable', key: 'porcentaje_variable_estimulo', width: 25 },
      ],
      data: cargos
    }
  }

  if (loading) {
    return <PageLoader moduleName="Recursos Humanos" text="Cargando datos..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <Card className="max-w-md border-red-200">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-red-800 mb-2">Error al cargar datos</h2>
            <p className="text-red-600">{error}</p>
            <Button onClick={refresh} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
                  Recursos Humanos
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Nómina
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Gestión mensual de nómina y estímulos
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Dialog open={isEstimulosDialogOpen} onOpenChange={setIsEstimulosDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Configurar Estímulos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Monto de Estímulos</DialogTitle>
                  </DialogHeader>
                  <EstimulosDialog
                    montoActual={ultimoIngreso?.monto || 0}
                    mesActual={String(mesActual).padStart(2, '0')}
                    anioActual={String(anioActual)}
                    ingresoId={ultimoIngreso?.id || null}
                    onGuardar={handleGuardarEstimulos}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={isCrearTrabajadorDialogOpen} onOpenChange={setIsCrearTrabajadorDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Crear Trabajador
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Trabajador</DialogTitle>
                  </DialogHeader>
                  <CrearTrabajadorForm
                    onSubmit={handleCrearTrabajador}
                    onCancel={() => setIsCrearTrabajadorDialogOpen(false)}
                    isSubmitting={isSubmittingWorker}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Información del período y estímulos */}
        <Card className="mb-8 border-l-4 border-l-purple-600">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Período</p>
                  <p className="text-lg font-bold text-gray-900">
                    {String(mesActual).padStart(2, '0')}/{anioActual}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Monto Total Estímulos</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${(ultimoIngreso?.monto || 0).toFixed(2)} {ultimoIngreso?.moneda || 'CUP'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Trabajadores</p>
                  <p className="text-lg font-bold text-gray-900">
                    {trabajadores.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle de vista */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-200">
            <Button
              variant={vistaActual === 'trabajadores' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVistaActual('trabajadores')}
              className={vistaActual === 'trabajadores' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-gray-100'}
            >
              <List className="mr-2 h-4 w-4" />
              Vista por Trabajador
            </Button>
            <Button
              variant={vistaActual === 'cargos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVistaActual('cargos')}
              className={vistaActual === 'cargos' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-gray-100'}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Vista por Cargo
            </Button>
          </div>
        </div>

        {/* Tabla según vista seleccionada */}
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {vistaActual === 'trabajadores' ? (
                    <>
                      <List className="h-5 w-5" />
                      Gestión de Nómina Mensual - Por Trabajador
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-5 w-5" />
                      Resumen de Nómina - Por Cargo
                    </>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {vistaActual === 'trabajadores'
                    ? 'Haga click en cualquier campo para editarlo. El salario se calcula automáticamente. Presione Enter para guardar o Esc para cancelar.'
                    : 'Vista consolidada de trabajadores agrupados por cargo con totales sumados de salarios y porcentajes de estímulos.'
                  }
                </CardDescription>
              </div>
              
              {/* Botones de exportación */}
              <div className="flex-shrink-0">
                {vistaActual === 'trabajadores' ? (
                  <ExportButtons
                    exportOptions={getExportOptionsTrabajadores()}
                    baseFilename={`nomina_trabajadores_${String(mesActual).padStart(2, '0')}_${anioActual}`}
                    variant="compact"
                  />
                ) : (
                  <ExportButtons
                    exportOptions={getExportOptionsCargos()}
                    baseFilename={`nomina_cargos_${String(mesActual).padStart(2, '0')}_${anioActual}`}
                    variant="compact"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {vistaActual === 'trabajadores' ? (
              <RecursosHumanosTableFinal
                trabajadores={trabajadores}
                mes={mesActual}
                anio={anioActual}
                montoTotalEstimulos={ultimoIngreso?.monto || 0}
                estadoAsistencia={estadoAsistencia}
                loadingAsistencia={loadingAsistencia}
                onActualizarCampo={handleActualizarCampo}
                onEliminarTrabajador={handleEliminarTrabajador}
                onVerDetalles={handleVerDetalles}
              />
            ) : loadingCargos ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando resumen de cargos...</p>
                </div>
              </div>
            ) : (
              <CargosResumenTable cargos={cargos} />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de confirmación de eliminación */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Trabajador"
        message={`¿Está seguro que desea eliminar al trabajador ${trabajadorToDelete?.nombre}? Esta acción no se puede deshacer y eliminará completamente al trabajador del sistema.`}
        onConfirm={confirmEliminarTrabajador}
        isLoading={isDeletingWorker}
      />

      {/* Dialog de detalles del trabajador */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalles del Trabajador</DialogTitle>
          </DialogHeader>
          {trabajadorSeleccionado && (
            <WorkerDetailsDashboard
              trabajador={trabajadorSeleccionado}
              salarioCalculado={calcularSalario(
                trabajadorSeleccionado,
                ultimoIngreso?.monto || 0,
                trabajadores.length,
                trabajadores.filter(t => t.porcentaje_variable_estimulo > 0).length
              )}
              montoTotalEstimulos={ultimoIngreso?.monto || 0}
              mes={mesActual}
              anio={anioActual}
              estadoAsistencia={estadoAsistencia}
              loadingAsistencia={loadingAsistencia}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
