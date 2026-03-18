"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/shared/molecule/dropdown-menu"
import { DollarSign, Users, Calendar, UserPlus, List, Briefcase, Archive, Save, History, Settings, RefreshCw } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RecursosHumanosTableFinal } from "@/components/feats/recursos-humanos/recursos-humanos-table-final"
import { CargosResumenTable } from "@/components/feats/recursos-humanos/cargos-resumen-table"
import { EstimulosDialog } from "@/components/feats/recursos-humanos/estimulos-dialog"
import { HistorialIngresosDialog } from "@/components/feats/recursos-humanos/historial-ingresos-dialog"
import { CrearTrabajadorForm } from "@/components/feats/recursos-humanos/crear-trabajador-form"
import { WorkerDetailsDashboard } from "@/components/feats/recursos-humanos/worker-details-dashboard"
import { ArchivoNominasList } from "@/components/feats/recursos-humanos/archivo-nominas-list"
import { ArchivoNominaDetail } from "@/components/feats/recursos-humanos/archivo-nomina-detail"
import { GuardarNominaDialog } from "@/components/feats/recursos-humanos/guardar-nomina-dialog"
import { NominaNavigation } from "@/components/feats/recursos-humanos/nomina-navigation"
import { RecursosHumanosFilters } from "@/components/feats/recursos-humanos/recursos-humanos-filters"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import { useRecursosHumanos } from "@/hooks/use-recursos-humanos"
import { useArchivoRH } from "@/hooks/use-archivo-rh"
import { IngresoMensualService, SedeService, DepartamentoService, TrabajadorService } from "@/lib/api-services"
import type { CrearTrabajadorRRHHRequest, TrabajadorRRHH, IngresoMensual } from "@/lib/recursos-humanos-types"
import type { ExportOptions } from "@/lib/export-service"
import type { ArchivoNominaRH } from "@/lib/types/feats/recursos-humanos/archivo-rh-types"
import type { Sede, Departamento } from "@/lib/api-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { cn } from "@/lib/utils"

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
    cambiarEstadoTrabajador,
    loadCargos,
    refresh
  } = useRecursosHumanos()

  // Hook para archivo de nóminas
  const {
    nominas,
    loading: loadingArchivo,
    loadNominas,
    guardarNomina,
  } = useArchivoRH()

  const [isEstimulosDialogOpen, setIsEstimulosDialogOpen] = useState(false)
  const [isHistorialIngresosDialogOpen, setIsHistorialIngresosDialogOpen] = useState(false)
  const [isConfigDropdownOpen, setIsConfigDropdownOpen] = useState(false)
  const [isCrearTrabajadorDialogOpen, setIsCrearTrabajadorDialogOpen] = useState(false)
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false)
  const [vistaActual, setVistaActual] = useState<'trabajadores' | 'cargos' | 'archivo'>('trabajadores')
  const [isEstadoDialogOpen, setIsEstadoDialogOpen] = useState(false)
  const [trabajadorEstadoTarget, setTrabajadorEstadoTarget] = useState<{
    ci: string
    nombre: string
    activoActual: boolean
    activoObjetivo: boolean
  } | null>(null)
  const [isDeletingWorker, setIsDeletingWorker] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRRHH | null>(null)

  // Estados para archivo de nóminas
  const [isGuardarNominaDialogOpen, setIsGuardarNominaDialogOpen] = useState(false)
  const [isNominaDetailDialogOpen, setIsNominaDetailDialogOpen] = useState(false)
  const [nominaSeleccionada, setNominaSeleccionada] = useState<ArchivoNominaRH | null>(null)
  const [ingresosDisponibles, setIngresosDisponibles] = useState<IngresoMensual[]>([])
  const [nominasExistentes, setNominasExistentes] = useState<Set<string>>(new Set())

  // Estados para navegación de períodos históricos
  const [periodoVisualizando, setPeriodoVisualizando] = useState<{ mes: number; anio: number } | null>(null)
  const [datosNominaHistorica, setDatosNominaHistorica] = useState<ArchivoNominaRH | null>(null)

  // Estados para filtros
  const [filtros, setFiltros] = useState<{
    searchTerm: string
    cargoSeleccionado: string
    estadoActivo: "activos" | "inactivos" | "todos"
  }>({
    searchTerm: "",
    cargoSeleccionado: "",
    estadoActivo: "activos",
  })
  const [sedes, setSedes] = useState<Sede[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(false)

  const { toast } = useToast()

  // Cargar cargos cuando se cambia a vista de cargos
  useEffect(() => {
    if (vistaActual === 'cargos' && cargos.length === 0) {
      loadCargos()
    }
  }, [vistaActual, cargos.length, loadCargos])

  // Cargar archivo cuando se cambia a vista de archivo
  useEffect(() => {
    if (vistaActual === 'archivo') {
      loadNominas()
    }
  }, [vistaActual, loadNominas])

  useEffect(() => {
    const loadCatalogos = async () => {
      setLoadingCatalogos(true)
      try {
        const [sedesData, departamentosData] = await Promise.all([
          SedeService.getSedes(true),
          DepartamentoService.getDepartamentos(true),
        ])
        setSedes(sedesData)
        setDepartamentos(departamentosData)
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "No se pudieron cargar sedes y departamentos.",
          variant: "destructive",
        })
      } finally {
        setLoadingCatalogos(false)
      }
    }

    loadCatalogos()
  }, [toast])

  // Obtener mes y año actuales o del último ingreso
  const mesActual = ultimoIngreso?.mes || new Date().getMonth() + 1
  const anioActual = ultimoIngreso?.anio || new Date().getFullYear()

  // Determinar qué período y datos mostrar (actual o histórico)
  const estaViendoHistorico = periodoVisualizando !== null
  const mesVisualizando = estaViendoHistorico ? periodoVisualizando!.mes : mesActual
  const anioVisualizando = estaViendoHistorico ? periodoVisualizando!.anio : anioActual
  const trabajadoresBase = estaViendoHistorico
    ? (datosNominaHistorica?.trabajadores as any as TrabajadorRRHH[] || [])
    : trabajadores
  const ingresoMostrar = estaViendoHistorico
    ? datosNominaHistorica?.ingreso_mensual_monto || 0
    : (ultimoIngreso?.monto || 0)

  // Aplicar filtros a los trabajadores
  const trabajadoresMostrar = trabajadoresBase.filter((trabajador) => {
    const estaActivo = trabajador.activo !== false

    const matchesEstado =
      filtros.estadoActivo === "todos" ||
      (filtros.estadoActivo === "activos" && estaActivo) ||
      (filtros.estadoActivo === "inactivos" && !estaActivo)

    const matchesSearch = filtros.searchTerm === "" || 
      trabajador.nombre.toLowerCase().includes(filtros.searchTerm.toLowerCase())
    
    const matchesCargo = filtros.cargoSeleccionado === "" || 
      trabajador.cargo === filtros.cargoSeleccionado
    
    return matchesEstado && matchesSearch && matchesCargo
  })

  // Obtener lista única de cargos para el filtro
  const cargosDisponibles = Array.from(new Set(trabajadoresBase.map(t => t.cargo))).sort()

  // Verificar si hay filtros activos
  const hasActiveFilters =
    filtros.searchTerm !== "" ||
    filtros.cargoSeleccionado !== "" ||
    filtros.estadoActivo !== "activos"

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

  const sedesMap = useMemo(() => {
    return new Map(sedes.map((sede) => [sede.id, sede.nombre]))
  }, [sedes])

  const departamentosMap = useMemo(() => {
    return new Map(departamentos.map((departamento) => [departamento.id, departamento.nombre]))
  }, [departamentos])

  const handleActualizarRelacion = async (
    ci: string,
    campo: "sede_id" | "departamento_id",
    valor: string | null,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await TrabajadorService.actualizarRelacionesTrabajador(ci, {
        [campo]: valor,
      })
      await refresh()
      return {
        success: true,
        message: "Relación actualizada correctamente",
      }
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "No se pudo actualizar la relación",
      }
    }
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

  const handleCambiarEstadoTrabajador = async (
    ci: string,
    nombre: string,
    activoActual: boolean,
  ): Promise<void> => {
    setTrabajadorEstadoTarget({
      ci,
      nombre,
      activoActual,
      activoObjetivo: !activoActual,
    })
    setIsEstadoDialogOpen(true)
  }

  const handleVerDetalles = (trabajador: TrabajadorRRHH) => {
    setTrabajadorSeleccionado(trabajador)
    setIsDetailsDialogOpen(true)
  }

  const confirmCambioEstadoTrabajador = async () => {
    if (!trabajadorEstadoTarget) return

    setIsDeletingWorker(true)
    const result = await cambiarEstadoTrabajador(
      trabajadorEstadoTarget.ci,
      trabajadorEstadoTarget.activoObjetivo,
    )
    setIsDeletingWorker(false)

    if (result.success) {
      toast({
        title: trabajadorEstadoTarget.activoObjetivo
          ? "Trabajador reactivado"
          : "Trabajador dado de baja",
        description: trabajadorEstadoTarget.activoObjetivo
          ? `Se ha reactivado el trabajador ${trabajadorEstadoTarget.nombre} exitosamente.`
          : `Se ha dado de baja el trabajador ${trabajadorEstadoTarget.nombre} exitosamente.`,
      })
      setIsEstadoDialogOpen(false)
      setTrabajadorEstadoTarget(null)
    } else {
      toast({
        title: trabajadorEstadoTarget.activoObjetivo
          ? "Error al reactivar trabajador"
          : "Error al dar de baja trabajador",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  // Handlers para archivo de nóminas
  const handleGuardarNomina = async (data: any) => {
    const result = await guardarNomina(data)

    if (result.success) {
      toast({
        title: "Nómina guardada",
        description: result.message,
      })
      setIsGuardarNominaDialogOpen(false)

      // Resetear navegación para volver al período actual
      setPeriodoVisualizando(null)
      setDatosNominaHistorica(null)

      // Refrescar datos actuales para reflejar el reseteo
      await refresh()
    } else {
      toast({
        title: "Error al guardar nómina",
        description: result.message,
        variant: "destructive",
      })
    }

    return result
  }

  const handleVerDetalleNomina = (nomina: ArchivoNominaRH) => {
    setNominaSeleccionada(nomina)
    setIsNominaDetailDialogOpen(true)
  }

  // Handlers para navegación de períodos históricos
  const handleNavigateToNomina = (nomina: ArchivoNominaRH) => {
    console.log('📅 Navegando a nómina histórica:', nomina.mes, nomina.anio)
    setPeriodoVisualizando({ mes: nomina.mes, anio: nomina.anio })
    setDatosNominaHistorica(nomina)
  }

  const handleVolverActual = () => {
    console.log('🔄 Volviendo al período actual')
    setPeriodoVisualizando(null)
    setDatosNominaHistorica(null)
  }

  const handleAbrirGuardarNomina = async () => {
    try {
      console.log('📂 Cargando datos para crear nómina...')

      // Cargar tanto los ingresos mensuales como las nóminas existentes en paralelo
      const [ingresos, nominasResult] = await Promise.all([
        IngresoMensualService.getAllIngresos(),
        loadNominas()
      ])

      console.log('✅ Ingresos mensuales cargados:', ingresos.length)
      console.log('✅ Nóminas existentes cargadas:', nominasResult.data?.length || 0)

      setIngresosDisponibles(ingresos)

      // Construir Set de IDs de ingresos que ya tienen nómina guardada
      const existingIds = new Set(nominasResult.data?.map(n => n.ingreso_mensual_id) || [])
      setNominasExistentes(existingIds)

      console.log('📊 Periodos con nómina:', Array.from(existingIds))

      setIsGuardarNominaDialogOpen(true)
    } catch (error: any) {
      console.error('❌ Error al cargar datos para nómina:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos necesarios para crear la nómina",
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
      subtitle: `Período: ${String(mesVisualizando).padStart(2, '0')}/${anioVisualizando} | Monto Total Estímulos: $${ingresoMostrar.toFixed(2)}`,
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
      data: trabajadoresMostrar.map(t => ({
        ...t,
        dias_no_trabajados_count: t.dias_no_trabajados?.length || 0,
        salario_total: calcularSalario(t, ingresoMostrar, trabajadoresMostrar.length, trabajadoresMostrar.filter(tr => tr.porcentaje_variable_estimulo > 0).length)
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
        { header: 'Total Salario Fijo', key: 'total_salario_fijo', width: 20 },
        { header: 'Total % Estímulo Fijo', key: 'total_porcentaje_fijo_estimulo', width: 22 },
        { header: 'Total % Estímulo Variable', key: 'total_porcentaje_variable_estimulo', width: 25 },
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
	            <Button
	              size="icon"
	              onClick={refresh}
	              className="mt-4 touch-manipulation"
	              aria-label="Reintentar"
	              title="Reintentar"
	            >
	              <RefreshCw className="h-4 w-4" />
	              <span className="sr-only">Reintentar</span>
	            </Button>
	          </CardContent>
	        </Card>
	      </div>
	    )
	  }

	  return (
	    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
	      {/* Header */}
	      <ModuleHeader
	        title="Recursos Humanos"
	        subtitle="Gestión mensual de nómina y estímulos"
	        badge={{ text: "Nómina", className: "bg-purple-100 text-purple-800" }}
	        actions={
	          <DropdownMenu open={isConfigDropdownOpen} onOpenChange={setIsConfigDropdownOpen}>
	            <DropdownMenuTrigger asChild>
	              <Button
	                size="icon"
	                className="h-9 w-9 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white touch-manipulation"
	                aria-label="Configuración"
	                title="Configuración"
	              >
	                <Settings className="h-4 w-4 sm:mr-2" />
	                <span className="hidden sm:inline">Configuración</span>
	                <span className="sr-only">Configuración</span>
	              </Button>
	            </DropdownMenuTrigger>
	            <DropdownMenuContent align="end" className="w-64">
	              <DropdownMenuItem
	                onClick={() => {
	                  setIsCrearTrabajadorDialogOpen(true)
	                  setIsConfigDropdownOpen(false)
	                }}
	              >
	                <UserPlus className="mr-2 h-4 w-4" />
	                Crear Trabajador
	              </DropdownMenuItem>
	              <DropdownMenuItem
	                onClick={() => {
	                  handleAbrirGuardarNomina()
	                  setIsConfigDropdownOpen(false)
	                }}
	              >
	                <Save className="mr-2 h-4 w-4" />
	                Guardar Nómina
	              </DropdownMenuItem>
	              <DropdownMenuItem
	                onClick={() => {
	                  setIsEstimulosDialogOpen(true)
	                  setIsConfigDropdownOpen(false)
	                }}
	              >
	                <Settings className="mr-2 h-4 w-4" />
	                Config Estímulo del Mes
	              </DropdownMenuItem>
	              <DropdownMenuItem
	                onClick={() => {
	                  setIsHistorialIngresosDialogOpen(true)
	                  setIsConfigDropdownOpen(false)
	                }}
	              >
	                <History className="mr-2 h-4 w-4" />
	                Ver Historial de Estímulos
	              </DropdownMenuItem>
	            </DropdownMenuContent>
	          </DropdownMenu>
	        }
	      />

	      <Dialog open={isEstimulosDialogOpen} onOpenChange={setIsEstimulosDialogOpen}>
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

	      <Dialog open={isHistorialIngresosDialogOpen} onOpenChange={setIsHistorialIngresosDialogOpen}>
	        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
	          <DialogHeader>
	            <DialogTitle className="text-2xl">Historial de Ingresos Mensuales</DialogTitle>
	          </DialogHeader>
	          <HistorialIngresosDialog />
	        </DialogContent>
	      </Dialog>

	      <Dialog open={isCrearTrabajadorDialogOpen} onOpenChange={setIsCrearTrabajadorDialogOpen}>
	        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
	          <DialogHeader>
	            <DialogTitle>Crear Nuevo Trabajador</DialogTitle>
	          </DialogHeader>
	          <CrearTrabajadorForm
	            onSubmit={handleCrearTrabajador}
	            onCancel={() => setIsCrearTrabajadorDialogOpen(false)}
	            isSubmitting={isSubmittingWorker}
              sedes={sedes}
              departamentos={departamentos}
	          />
	        </DialogContent>
	      </Dialog>

	      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
	        {/* Información del período y estímulos */}
	        <Card className={`mb-8 border-l-4 ${estaViendoHistorico ? 'border-l-amber-600' : 'border-l-purple-600'}`}>
	          <CardContent className="p-6">
	            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className={`h-8 w-8 ${estaViendoHistorico ? 'text-amber-600' : 'text-purple-600'}`} />
                <div>
                  <p className="text-sm text-gray-600">
                    Período {estaViendoHistorico && '(Histórico)'}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {String(mesVisualizando).padStart(2, '0')}/{anioVisualizando}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Monto Total Estímulos</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${ingresoMostrar.toFixed(2)} {ultimoIngreso?.moneda || 'CUP'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Trabajadores</p>
                  <p className="text-lg font-bold text-gray-900">
                    {trabajadoresMostrar.length}
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
              className={cn(
                vistaActual === 'trabajadores' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-gray-100',
                'sm:px-3 px-2'
              )}
            >
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Vista por Trabajador</span>
            </Button>
            <Button
              variant={vistaActual === 'cargos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVistaActual('cargos')}
              className={cn(
                vistaActual === 'cargos' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-gray-100',
                'sm:px-3 px-2'
              )}
            >
              <Briefcase className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Vista por Cargo</span>
            </Button>
            <Button
              variant={vistaActual === 'archivo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVistaActual('archivo')}
              className={cn(
                vistaActual === 'archivo' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'hover:bg-gray-100',
                'sm:px-3 px-2'
              )}
            >
              <Archive className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Archivo Histórico</span>
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
                  ) : vistaActual === 'cargos' ? (
                    <>
                      <Briefcase className="h-5 w-5" />
                      Resumen de Nómina - Por Cargo
                    </>
                  ) : (
                    <>
                      <Archive className="h-5 w-5" />
                      Archivo Histórico de Nóminas
                    </>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {vistaActual === 'trabajadores'
                    ? estaViendoHistorico
                      ? '⚠️ VISTA HISTÓRICA: Esta nómina ha sido archivada. Los datos no pueden ser modificados. Use las flechas de navegación para cambiar de período.'
                      : 'Haga click en cualquier campo para editarlo. El salario se calcula automáticamente. Presione Enter para guardar o Esc para cancelar.'
                    : vistaActual === 'cargos'
                    ? 'Vista consolidada de trabajadores agrupados por cargo con totales sumados de salarios y porcentajes de estímulos.'
                    : 'Historial completo de nóminas guardadas. Las nóminas archivadas son inmutables y no pueden editarse.'
                  }
                  {vistaActual === 'trabajadores' && hasActiveFilters && (
                    <span className="block mt-1 text-purple-600 font-medium">
                      Mostrando {trabajadoresMostrar.length} de {trabajadoresBase.length} trabajadores
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* Botones de exportación */}
              {vistaActual !== 'archivo' && (
                <div className="flex-shrink-0">
                  {vistaActual === 'trabajadores' ? (
                    <ExportButtons
                      exportOptions={getExportOptionsTrabajadores()}
                      baseFilename={`nomina_trabajadores_${String(mesVisualizando).padStart(2, '0')}_${anioVisualizando}`}
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
              )}
            </div>
          </CardHeader>
          <CardContent>
            {vistaActual === 'trabajadores' ? (
              <>
                {/* Navegación entre períodos */}
                <div className="mb-4">
                  <NominaNavigation
                    mesActual={mesActual}
                    anioActual={anioActual}
                    onNavigate={handleNavigateToNomina}
                    onVolverActual={handleVolverActual}
                  />
                </div>

                {/* Filtros */}
                <RecursosHumanosFilters
                  cargosDisponibles={cargosDisponibles}
                  onFilterChange={setFiltros}
                />

                <RecursosHumanosTableFinal
                  trabajadores={trabajadoresMostrar}
                  mes={mesVisualizando}
                  anio={anioVisualizando}
                  montoTotalEstimulos={ingresoMostrar}
                  sedes={sedes}
                  departamentos={departamentos}
                  loadingCatalogos={loadingCatalogos}
                  estadoAsistencia={estadoAsistencia}
                  loadingAsistencia={loadingAsistencia}
                  onActualizarCampo={estaViendoHistorico ? async () => ({ success: false, message: 'No se pueden editar datos históricos' }) : handleActualizarCampo}
                  onActualizarRelacion={estaViendoHistorico ? async () => ({ success: false, message: 'No se pueden editar datos históricos' }) : handleActualizarRelacion}
                  onCambiarEstadoTrabajador={estaViendoHistorico ? async () => {} : handleCambiarEstadoTrabajador}
                  onVerDetalles={handleVerDetalles}
                  isVistaHistorica={estaViendoHistorico}
                />
              </>
            ) : vistaActual === 'cargos' ? (
              loadingCargos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando resumen de cargos...</p>
                  </div>
                </div>
              ) : (
                <CargosResumenTable cargos={cargos} />
              )
            ) : (
              // Vista de archivo histórico
              loadingArchivo ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando archivo histórico...</p>
                  </div>
                </div>
              ) : (
                <ArchivoNominasList
                  nominas={nominas}
                  onVerDetalle={handleVerDetalleNomina}
                />
              )
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de confirmación de cambio de estado */}
      <ConfirmDeleteDialog
        open={isEstadoDialogOpen}
        onOpenChange={setIsEstadoDialogOpen}
        title={trabajadorEstadoTarget?.activoObjetivo ? "Reactivar Trabajador" : "Dar de Baja Trabajador"}
        message={
          trabajadorEstadoTarget?.activoObjetivo
            ? `¿Está seguro que desea reactivar al trabajador ${trabajadorEstadoTarget?.nombre}?`
            : `¿Está seguro que desea dar de baja al trabajador ${trabajadorEstadoTarget?.nombre}? Esta acción lo ocultará de Instaladores y de la tabla principal de Recursos Humanos.`
        }
        onConfirm={confirmCambioEstadoTrabajador}
        isLoading={isDeletingWorker}
      />

      {/* Dialog de detalles del trabajador */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Detalles del Trabajador {estaViendoHistorico && '(Vista Histórica)'}
            </DialogTitle>
          </DialogHeader>
          {trabajadorSeleccionado && (
            <WorkerDetailsDashboard
              trabajador={trabajadorSeleccionado}
              salarioCalculado={calcularSalario(
                trabajadorSeleccionado,
                ingresoMostrar,
                trabajadoresMostrar.length,
                trabajadoresMostrar.filter(t => t.porcentaje_variable_estimulo > 0).length
              )}
              montoTotalEstimulos={ingresoMostrar}
              mes={mesVisualizando}
              anio={anioVisualizando}
              estadoAsistencia={estadoAsistencia}
              loadingAsistencia={loadingAsistencia}
              sedeNombre={
                trabajadorSeleccionado.sede_id
                  ? sedesMap.get(trabajadorSeleccionado.sede_id) || trabajadorSeleccionado.sede_id
                  : "No asignada"
              }
              departamentoNombre={
                trabajadorSeleccionado.departamento_id
                  ? departamentosMap.get(trabajadorSeleccionado.departamento_id) || trabajadorSeleccionado.departamento_id
                  : "No asignado"
              }
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para guardar nómina */}
      <Dialog open={isGuardarNominaDialogOpen} onOpenChange={setIsGuardarNominaDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Guardar Nómina Mensual</DialogTitle>
          </DialogHeader>
          <GuardarNominaDialog
            trabajadores={trabajadores}
            ingresosDisponibles={ingresosDisponibles}
            nominasExistentes={nominasExistentes}
            onGuardar={handleGuardarNomina}
            onCancel={() => setIsGuardarNominaDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalle de nómina archivada */}
      <Dialog open={isNominaDetailDialogOpen} onOpenChange={setIsNominaDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Detalle de Nómina Archivada</DialogTitle>
          </DialogHeader>
          {nominaSeleccionada && (
            <ArchivoNominaDetail nomina={nominaSeleccionada} />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
