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
import { RecursosHumanosTable } from "@/components/feats/recursos-humanos/recursos-humanos-table"
import { EstimulosDialog } from "@/components/feats/recursos-humanos/estimulos-dialog"

export default function RecursosHumanosPage() {
  const [loading, setLoading] = useState(true)
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [montoTotalEstimulos, setMontoTotalEstimulos] = useState(0)
  const [mesSeleccionado, setMesSeleccionado] = useState("")
  const [anioSeleccionado, setAnioSeleccionado] = useState("")
  const [isEstimulosDialogOpen, setIsEstimulosDialogOpen] = useState(false)
  const { toast } = useToast()

  // Inicializar con mes y año actual
  useEffect(() => {
    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const anio = String(now.getFullYear())
    setMesSeleccionado(mes)
    setAnioSeleccionado(anio)

    // Simular carga de datos
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [])

  // Cargar trabajadores (mock data por ahora)
  useEffect(() => {
    if (!loading) {
      // Mock data - en producción esto vendría del backend
      setTrabajadores([
        {
          id: "1",
          nombre: "Juan Pérez",
          cargo: "Técnico Electricista",
          porcentajeFijoEstimulo: 15,
          porcentajeVariableEstimulo: 10,
          salarioFijo: 3000,
          alimentacion: 500,
          diasNoTrabajados: 0
        },
        {
          id: "2",
          nombre: "María González",
          cargo: "Jefe de Brigada",
          porcentajeFijoEstimulo: 20,
          porcentajeVariableEstimulo: 15,
          salarioFijo: 4500,
          alimentacion: 500,
          diasNoTrabajados: 0
        },
        {
          id: "3",
          nombre: "Carlos Rodríguez",
          cargo: "Auxiliar Técnico",
          porcentajeFijoEstimulo: 10,
          porcentajeVariableEstimulo: 8,
          salarioFijo: 2500,
          alimentacion: 500,
          diasNoTrabajados: 0
        }
      ])
    }
  }, [loading])

  const handleActualizarTrabajador = (trabajadorId: string, campo: string, valor: any) => {
    setTrabajadores(prev =>
      prev.map(t => t.id === trabajadorId ? { ...t, [campo]: valor } : t)
    )
  }

  const handleCalcularSalario = async (trabajadorId: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId)
    if (!trabajador) return

    // Validar que todos los campos estén completos
    if (!trabajador.porcentajeFijoEstimulo ||
        !trabajador.porcentajeVariableEstimulo ||
        !trabajador.salarioFijo ||
        !trabajador.alimentacion ||
        trabajador.diasNoTrabajados === undefined) {
      toast({
        title: "Datos incompletos",
        description: "Por favor complete todos los campos del trabajador antes de calcular.",
        variant: "destructive",
      })
      return
    }

    if (montoTotalEstimulos <= 0) {
      toast({
        title: "Monto de estímulos no configurado",
        description: "Por favor configure el monto total de estímulos mensual.",
        variant: "destructive",
      })
      return
    }

    // Aquí iría la llamada al backend
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
      !t.porcentajeFijoEstimulo ||
      !t.porcentajeVariableEstimulo ||
      !t.salarioFijo ||
      !t.alimentacion ||
      t.diasNoTrabajados === undefined
    )

    if (trabajadorIncompleto) {
      toast({
        title: "Datos incompletos",
        description: "Todos los trabajadores deben tener sus datos completos antes de calcular.",
        variant: "destructive",
      })
      return
    }

    if (montoTotalEstimulos <= 0) {
      toast({
        title: "Monto de estímulos no configurado",
        description: "Por favor configure el monto total de estímulos mensual.",
        variant: "destructive",
      })
      return
    }

    // Aquí iría la llamada al backend para calcular todos
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

  const handleGuardarEstimulos = (monto: number, mes: string, anio: string) => {
    setMontoTotalEstimulos(monto)
    setMesSeleccionado(mes)
    setAnioSeleccionado(anio)
    setIsEstimulosDialogOpen(false)
    toast({
      title: "Configuración guardada",
      description: `Monto de estímulos: $${monto.toFixed(2)} para ${mes}/${anio}`,
    })
  }

  if (loading) {
    return <PageLoader moduleName="Recursos Humanos" text="Cargando datos..." />
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
                    montoActual={montoTotalEstimulos}
                    mesActual={mesSeleccionado}
                    anioActual={anioSeleccionado}
                    onGuardar={handleGuardarEstimulos}
                  />
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
                    {mesSeleccionado}/{anioSeleccionado}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Monto Total Estímulos</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${montoTotalEstimulos.toFixed(2)}
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
              Configure los datos de cada trabajador y calcule su salario mensual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecursosHumanosTable
              trabajadores={trabajadores}
              onActualizarTrabajador={handleActualizarTrabajador}
              onCalcularSalario={handleCalcularSalario}
            />
          </CardContent>
        </Card>
      </main>

      <Toaster />
    </div>
  )
}
