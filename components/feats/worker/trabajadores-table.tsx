import { useEffect, useState } from "react"
import type { Trabajador, Brigada } from "@/lib/api-types"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { useToast } from "@/hooks/use-toast"
import { TrabajadorService } from "@/lib/api-services"
import { Calculator, Clock, Crown, KeyRound, Search, Trash2, Users, X } from "lucide-react"

interface TrabajadoresTableProps {
  trabajadores: Trabajador[]
  brigadas: Brigada[]
  onAssignBrigada: (trabajador: Trabajador) => void
  onConvertJefe: (trabajador: Trabajador) => void
  onRefresh: () => void
}

export function TrabajadoresTable({
  trabajadores,
  brigadas: _brigadas,
  onAssignBrigada,
  onConvertJefe,
  onRefresh,
}: TrabajadoresTableProps) {
  const { toast } = useToast()

  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const [isHorasDialogOpen, setIsHorasDialogOpen] = useState(false)
  const [horasWorker, setHorasWorker] = useState<Trabajador | null>(null)
  const [horasData, setHorasData] = useState<any>(null)
  const [horasLoading, setHorasLoading] = useState(false)
  const [horasError, setHorasError] = useState<string | null>(null)
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [salario, setSalario] = useState("")
  const [salarioTotal, setSalarioTotal] = useState<number | null>(null)

  const [isHorasTodosDialogOpen, setIsHorasTodosDialogOpen] = useState(false)
  const [horasTodosData, setHorasTodosData] = useState<any>(null)
  const [horasTodosLoading, setHorasTodosLoading] = useState(false)
  const [horasTodosError, setHorasTodosError] = useState<string | null>(null)
  const [fechaTodosInicio, setFechaTodosInicio] = useState("")
  const [fechaTodosFin, setFechaTodosFin] = useState("")

  const [isRemovePasswordLoading, setIsRemovePasswordLoading] = useState<string | null>(null)
  const [confirmRemovePassword, setConfirmRemovePassword] = useState<Trabajador | null>(null)

  const hasPassword = (worker: Trabajador) => Boolean(worker.tiene_contraseña)

  useEffect(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const firstStr = first.toISOString().split("T")[0]
    const lastStr = last.toISOString().split("T")[0]
    setFechaInicio(firstStr)
    setFechaFin(lastStr)
    setFechaTodosInicio(firstStr)
    setFechaTodosFin(lastStr)
  }, [])

  const openDetailDialog = (worker: Trabajador) => {
    setSelectedWorker(worker)
    setIsDetailDialogOpen(true)
  }

  const openHorasDialog = (worker: Trabajador) => {
    setHorasWorker(worker)
    setHorasData(null)
    setHorasError(null)
    setSalario("")
    setSalarioTotal(null)
    setIsHorasDialogOpen(true)
  }

  const fetchHorasTrabajador = async () => {
    if (!horasWorker || !fechaInicio || !fechaFin) return
    setHorasLoading(true)
    setHorasError(null)
    setHorasData(null)
    try {
      const data = await TrabajadorService.getHorasTrabajadas(horasWorker.CI, fechaInicio, fechaFin)
      setHorasData(data)
    } catch (e: any) {
      setHorasError(e.message || "Error al obtener horas")
    } finally {
      setHorasLoading(false)
    }
  }

  const calcularSalario = () => {
    if (!horasData || !salario) return
    const total = parseFloat(salario) * (horasData.total_horas || 0)
    setSalarioTotal(total)
  }

  const openHorasTodosDialog = () => {
    setHorasTodosData(null)
    setHorasTodosError(null)
    setIsHorasTodosDialogOpen(true)
  }

  const fetchHorasTodos = async () => {
    if (!fechaTodosInicio || !fechaTodosFin) return
    setHorasTodosLoading(true)
    setHorasTodosError(null)
    setHorasTodosData(null)
    try {
      const data = await TrabajadorService.getHorasTrabajadasTodos(fechaTodosInicio, fechaTodosFin)
      setHorasTodosData(data)
    } catch (e: any) {
      setHorasTodosError(e.message || "Error al obtener horas")
    } finally {
      setHorasTodosLoading(false)
    }
  }

  const handleRemovePassword = async (worker: Trabajador) => {
    setIsRemovePasswordLoading(worker.CI)
    try {
      await TrabajadorService.eliminarContrasenaTrabajador(worker.CI)
      toast({
        title: "Contraseña eliminada",
        description: `El trabajador ${worker.nombre} ahora es trabajador normal.`,
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la contraseña",
        variant: "destructive",
      })
    } finally {
      setIsRemovePasswordLoading(null)
      setConfirmRemovePassword(null)
    }
  }

  if (trabajadores.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron trabajadores</h3>
        <p className="text-gray-600">No hay trabajadores que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{trabajadores.length}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="border-green-300 text-green-700 hover:bg-green-50 touch-manipulation"
          onClick={openHorasTodosDialog}
          title="Calcular horas trabajadas de todos los trabajadores"
          aria-label="Calcular horas trabajadas de todos los trabajadores"
        >
          <Clock className="h-5 w-5" />
          <span className="sr-only">Calcular horas trabajadas (todos)</span>
        </Button>
      </div>

      <div className="md:hidden space-y-3">
        {trabajadores.map((worker) => (
          <Card key={worker.id || worker.CI} className="border-gray-200">
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => openDetailDialog(worker)}
                className="w-full text-left touch-manipulation active:scale-[0.99] transition-transform"
                title="Ver detalles"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                    {hasPassword(worker) ? (
                      <Crown className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Users className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate">{worker.nombre}</p>
                      <Badge variant={hasPassword(worker) ? "outline" : "secondary"} className="shrink-0">
                        {hasPassword(worker) ? "Jefe" : "Trabajador"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">CI: {worker.CI}</p>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onAssignBrigada(worker)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 touch-manipulation"
                  title="Asignar a brigada"
                  aria-label="Asignar a brigada"
                >
                  <Users className="h-4 w-4" />
                </Button>

                {hasPassword(worker) ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirmRemovePassword(worker)}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 touch-manipulation"
                    title="Eliminar contraseña (convertir en trabajador normal)"
                    aria-label="Eliminar contraseña (convertir en trabajador normal)"
                    disabled={isRemovePasswordLoading === worker.CI}
                  >
                    {isRemovePasswordLoading === worker.CI ? (
                      <span className="animate-spin">
                        <KeyRound className="h-4 w-4" />
                      </span>
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onConvertJefe(worker)}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 touch-manipulation"
                    title="Convertir en jefe de brigada"
                    aria-label="Convertir en jefe de brigada"
                  >
                    <Crown className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openHorasDialog(worker)}
                  className="border-green-300 text-green-700 hover:bg-green-50 touch-manipulation"
                  title="Calcular horas trabajadas"
                  aria-label="Calcular horas trabajadas"
                >
                  <Clock className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">CI</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Rol</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((worker) => (
              <tr key={worker.id || worker.CI} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <button
                    type="button"
                    onClick={() => openDetailDialog(worker)}
                    className="w-full text-left touch-manipulation"
                    title="Ver detalles"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        {hasPassword(worker) ? (
                          <Crown className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Users className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{worker.nombre}</p>
                      </div>
                    </div>
                  </button>
                </td>
                <td className="py-4 px-4">{worker.CI}</td>
                <td className="py-4 px-4">
                  <Badge variant={hasPassword(worker) ? "outline" : "secondary"}>
                    {hasPassword(worker) ? "Jefe de brigada" : "Trabajador"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onAssignBrigada(worker)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      title="Asignar a brigada"
                      aria-label="Asignar a brigada"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {hasPassword(worker) ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setConfirmRemovePassword(worker)}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        title="Eliminar contraseña (convertir en trabajador normal)"
                        aria-label="Eliminar contraseña (convertir en trabajador normal)"
                        disabled={isRemovePasswordLoading === worker.CI}
                      >
                        {isRemovePasswordLoading === worker.CI ? (
                          <span className="animate-spin">
                            <KeyRound className="h-4 w-4" />
                          </span>
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onConvertJefe(worker)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        title="Convertir en jefe de brigada"
                        aria-label="Convertir en jefe de brigada"
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openHorasDialog(worker)}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      title="Calcular horas trabajadas"
                      aria-label="Calcular horas trabajadas"
                    >
                      <Clock className="h-5 w-5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Trabajador</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {hasPassword(selectedWorker) ? (
                      <Crown className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Users className="h-5 w-5 text-blue-500" />
                    )}
                    <span>{hasPassword(selectedWorker) ? "Jefe de Brigada" : "Trabajador"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">{selectedWorker.nombre}</p>
                    <p className="text-sm text-gray-600">CI: {selectedWorker.CI}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHorasDialogOpen} onOpenChange={setIsHorasDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Horas trabajadas de {horasWorker?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2 items-end">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
              <div className="flex justify-end sm:justify-start">
                <Button
                  onClick={fetchHorasTrabajador}
                  disabled={horasLoading}
                  variant="outline"
                  size="icon"
                  className="w-10 sm:w-auto sm:px-4 touch-manipulation"
                  title="Consultar"
                  aria-label="Consultar"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{horasLoading ? "Consultando..." : "Consultar"}</span>
                  <span className="sr-only">{horasLoading ? "Consultando..." : "Consultar"}</span>
                </Button>
              </div>
            </div>

            {horasError && <div className="text-red-600">{horasError}</div>}

            {horasData && (
              <div className="space-y-2">
                <div className="font-semibold">Total de horas: {horasData.total_horas}</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2 items-end">
                  <div className="min-w-0">
                    <Label>Salario por hora</Label>
                    <Input
                      type="number"
                      min="0"
                      value={salario}
                      onChange={(e) => setSalario(e.target.value)}
                      placeholder="Monto"
                    />
                  </div>
                  <div className="flex justify-end sm:justify-start">
                    <Button
                      onClick={calcularSalario}
                      disabled={!salario || !horasData.total_horas}
                      variant="outline"
                      size="icon"
                      className="w-10 sm:w-auto sm:px-4 touch-manipulation"
                      title="Calcular salario"
                      aria-label="Calcular salario"
                    >
                      <Calculator className="h-4 w-4" />
                      <span className="hidden sm:inline">Calcular salario</span>
                      <span className="sr-only">Calcular salario</span>
                    </Button>
                  </div>
                </div>

                {salarioTotal !== null && (
                  <div className="text-green-700 font-bold">Salario total: {salarioTotal.toFixed(2)}</div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHorasTodosDialogOpen} onOpenChange={setIsHorasTodosDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Horas trabajadas de todos los trabajadores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2 items-end">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={fechaTodosInicio} onChange={(e) => setFechaTodosInicio(e.target.value)} />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input type="date" value={fechaTodosFin} onChange={(e) => setFechaTodosFin(e.target.value)} />
              </div>
              <div className="flex justify-end sm:justify-start">
                <Button
                  onClick={fetchHorasTodos}
                  disabled={horasTodosLoading}
                  variant="outline"
                  size="icon"
                  className="w-10 sm:w-auto sm:px-4 touch-manipulation"
                  title="Consultar"
                  aria-label="Consultar"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{horasTodosLoading ? "Consultando..." : "Consultar"}</span>
                  <span className="sr-only">{horasTodosLoading ? "Consultando..." : "Consultar"}</span>
                </Button>
              </div>
            </div>

            {horasTodosError && <div className="text-red-600">{horasTodosError}</div>}

            {horasTodosData && (
              <div>
                <div className="md:hidden space-y-2 mt-2">
                  {horasTodosData.trabajadores.map((t: any) => (
                    <div key={t.ci} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{t.nombre}</div>
                          <div className="text-sm text-gray-600">CI: {t.ci}</div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {t.total_horas} h
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch] mt-2">
                  <table className="w-full border">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-2">CI</th>
                        <th className="text-left py-2 px-2">Nombre</th>
                        <th className="text-left py-2 px-2">Total horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horasTodosData.trabajadores.map((t: any) => (
                        <tr key={t.ci}>
                          <td className="py-1 px-2">{t.ci}</td>
                          <td className="py-1 px-2">{t.nombre}</td>
                          <td className="py-1 px-2">{t.total_horas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {confirmRemovePassword && (
        <Dialog open={!!confirmRemovePassword} onOpenChange={() => setConfirmRemovePassword(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación de contraseña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                ¿Estás seguro de que quieres eliminar la contraseña de{" "}
                <span className="font-semibold">{confirmRemovePassword.nombre}</span> (CI:{" "}
                {confirmRemovePassword.CI})? Esta acción convertirá al jefe en trabajador normal.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmRemovePassword(null)}
                disabled={isRemovePasswordLoading === confirmRemovePassword.CI}
                size="icon"
                className="w-10 sm:w-auto sm:px-4 touch-manipulation"
                title="Cancelar"
                aria-label="Cancelar"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Cancelar</span>
                <span className="sr-only">Cancelar</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemovePassword(confirmRemovePassword)}
                disabled={isRemovePasswordLoading === confirmRemovePassword.CI}
                size="icon"
                className="w-10 sm:w-auto sm:px-4 touch-manipulation"
                title="Eliminar contraseña"
                aria-label="Eliminar contraseña"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isRemovePasswordLoading === confirmRemovePassword.CI ? "Eliminando..." : "Eliminar contraseña"}
                </span>
                <span className="sr-only">
                  {isRemovePasswordLoading === confirmRemovePassword.CI ? "Eliminando..." : "Eliminar contraseña"}
                </span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
