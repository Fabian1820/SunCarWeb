"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { ArrowLeft, DollarSign, Users, Calendar, Calculator } from "lucide-react"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RecursosHumanosTableNueva } from "@/components/feats/recursos-humanos/recursos-humanos-table-nueva"
import { EstimulosDialog } from "@/components/feats/recursos-humanos/estimulos-dialog"
import { useRecursosHumanos } from "@/hooks/use-recursos-humanos"

export default function RecursosHumanosPage() {
  const {
    trabajadores,
    ultimoIngreso,
    loading,
    error,
    actualizarCampoTrabajador,
    guardarIngresoMensual,
    refresh
  } = useRecursosHumanos()

  const [isEstimulosDialogOpen, setIsEstimulosDialogOpen] = useState(false)
  const { toast } = useToast()

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

  const handleCalcularSalario = async (ci: string) => {
    const trabajador = trabajadores.find(t => t.CI === ci)
    if (!trabajador) return

    // Validar que todos los campos estén completos
    if (!trabajador.porcentaje_fijo_estimulo &&
        !trabajador.porcentaje_variable_estimulo &&
        !trabajador.salario_fijo &&
        !trabajador.alimentacion) {
      toast({
        title: "Datos incompletos",
        description: "Por favor complete todos los campos del trabajador antes de calcular.",
        variant: "destructive",
      })
      return
    }

    if (!ultimoIngreso || ultimoIngreso.monto <= 0) {
      toast({
        title: "Monto de estímulos no configurado",
        description: "Por favor configure el monto total de estímulos mensual.",
        variant: "destructive",
      })
      return
    }

    // TODO: Aquí iría la llamada al backend para calcular el salario
    toast({
      title: "Calculando salario",
      description: `Calculando salario para ${trabajador.nombre}...`,
    })

    // Simulación de cálculo
    setTimeout(() => {
      toast({
        title: "Cálculo completado",
        description: `Salario calculado para ${trabajador.nombre}`,
      })
    }, 1000)
  }

  const handleCalcularTodos = async () => {
    // Validar que todos los trabajadores tengan datos completos
    const trabajadorIncompleto = trabajadores.find(t =>
      !t.porcentaje_fijo_estimulo ||
      !t.porcentaje_variable_estimulo ||
      !t.salario_fijo ||
      !t.alimentacion
    )

    if (trabajadorIncompleto) {
      toast({
        title: "Datos incompletos",
        description: "Todos los trabajadores deben tener sus datos completos antes de calcular.",
        variant: "destructive",
      })
      return
    }

    if (!ultimoIngreso || ultimoIngreso.monto <= 0) {
      toast({
        title: "Monto de estímulos no configurado",
        description: "Por favor configure el monto total de estímulos mensual.",
        variant: "destructive",
      })
      return
    }

    // TODO: Aquí iría la llamada al backend para calcular todos los salarios
    toast({
      title: "Calculando salarios",
      description: "Calculando salarios para todos los trabajadores...",
    })

    // Simulación de cálculo
    setTimeout(() => {
      toast({
        title: "Cálculos completados",
        description: `Salarios calculados para ${trabajadores.length} trabajadores`,
      })
    }, 1500)
  }

  const handleGuardarEstimulos = async (monto: number, mes: string, anio: string) => {
    const mesNum = parseInt(mes)
    const anioNum = parseInt(anio)

    const result = await guardarIngresoMensual(monto, mesNum, anioNum, 'CUP')

    if (result.success) {
      toast({
        title: "Configuración guardada",
        description: `Monto de estímulos: $${monto.toFixed(2)} para ${mes}/${anio}`,
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
            <div className="flex gap-2">
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
                      onGuardar={handleGuardarEstimulos} ingresoId={null}                  />
                </DialogContent>
              </Dialog>
              <Button
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                onClick={handleCalcularTodos}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Todos
              </Button>
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

        {/* Tabla de trabajadores */}
        <Card className="border-l-4 border-l-purple-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Gestión de Nómina Mensual
            </CardTitle>
            <CardDescription>
              Haga click en cualquier campo para editarlo. Los cambios se guardan automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecursosHumanosTableNueva
              trabajadores={trabajadores}
              mes={mesActual}
              anio={anioActual}
              onActualizarCampo={handleActualizarCampo}
              onCalcularSalario={handleCalcularSalario}
            />
          </CardContent>
        </Card>
      </main>

      <Toaster />
    </div>
  )
}
