import { useEffect, useState } from "react"
import type { Trabajador } from "@/lib/api-types"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { ConfirmDeleteDialog, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { useToast } from "@/hooks/use-toast"
import { TrabajadorService, RecursosHumanosService } from "@/lib/api-services"
import { WorkerAvatar, WorkerAvatarUploader } from "@/components/feats/worker/worker-avatar"
import { Calculator, Clock, Crown, Search, Trash2, UserMinus, Users } from "lucide-react"

interface TrabajadoresTableProps {
  trabajadores: Trabajador[]
  onAssignBrigada: (trabajador: Trabajador) => void
  onConvertJefe: (trabajador: Trabajador) => void
  onRefresh: () => void
}

export function TrabajadoresTable({
  trabajadores,
  onAssignBrigada,
  onConvertJefe,
  onRefresh,
}: TrabajadoresTableProps) {
  const { toast } = useToast()

  const esJefeDeBrigada = (worker: Trabajador) => Boolean(worker.es_jefe_brigada)

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

  const [isRemovingJefeLoading, setIsRemovingJefeLoading] = useState<string | null>(null)
  const [confirmRemoveJefe, setConfirmRemoveJefe] = useState<Trabajador | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Trabajador | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleQuitarJefe = async (worker: Trabajador) => {
    setIsRemovingJefeLoading(worker.CI)
    try {
      // Baja de jefe a instalador regular: no toca is_brigadista, el backend se
      // encarga de borrar su brigada y limpiar su credencial de jefe.
      await RecursosHumanosService.actualizarTrabajadorRRHH(worker.CI, { es_jefe_brigada: false })
      toast({
        title: "Jefe de brigada removido",
        description: `${worker.nombre} ahora es un instalador regular.`,
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo quitar como jefe de brigada",
        variant: "destructive",
      })
    } finally {
      setIsRemovingJefeLoading(null)
      setConfirmRemoveJefe(null)
    }
  }

  const handleDelete = async (worker: Trabajador) => {
    setIsDeleting(true)
    try {
      // No se desactiva al trabajador (puede seguir activo, solo cambió de área):
      // se le quita el rol de instalador/jefe de brigada. El backend se encarga de
      // desvincularlo de su brigada (borrarla si era jefe, sacarlo si era integrante).
      await RecursosHumanosService.actualizarTrabajadorRRHH(worker.CI, { is_brigadista: false })
      toast({
        title: "Instalador removido",
        description: `${worker.nombre} ya no es instalador ni jefe de brigada. Sigue activo en el sistema.`,
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo quitar el rol de instalador",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }

  if (trabajadores.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron instaladores</h3>
        <p className="text-gray-600">No hay instaladores que coincidan con los filtros aplicados.</p>
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
          title="Calcular horas trabajadas de todos los instaladores"
          aria-label="Calcular horas trabajadas de todos los instaladores"
        >
          <Clock className="h-5 w-5" />
          <span className="sr-only">Calcular horas trabajadas (todos)</span>
        </Button>
      </div>

      <div className="space-y-3">
        {trabajadores.map((worker) => (
          <Card key={worker.id || worker.CI} className="border-gray-200">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => openDetailDialog(worker)}
                className="flex items-center gap-3 sm:w-64 shrink-0 text-left touch-manipulation active:scale-[0.99] transition-transform"
                title="Ver detalles"
              >
                <WorkerAvatar src={worker.foto_perfil} nombre={worker.nombre} className="h-10 w-10 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{worker.nombre}</p>
                  <p className="text-xs text-gray-500">CI: {worker.CI}</p>
                </div>
              </button>

              <div className="flex-1 flex items-center min-h-[1.75rem] sm:border-l sm:border-gray-100 sm:pl-4">
                <Badge variant={esJefeDeBrigada(worker) ? "outline" : "secondary"}>
                  {esJefeDeBrigada(worker) ? "Jefe de brigada" : "Trabajador"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

                {esJefeDeBrigada(worker) ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConfirmRemoveJefe(worker)}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 touch-manipulation"
                    title="Quitar como jefe de brigada"
                    aria-label="Quitar como jefe de brigada"
                    disabled={isRemovingJefeLoading === worker.CI}
                  >
                    {isRemovingJefeLoading === worker.CI ? (
                      <span className="animate-spin">
                        <UserMinus className="h-4 w-4" />
                      </span>
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onConvertJefe(worker)}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 touch-manipulation"
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

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(worker)}
                  className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-600 touch-manipulation"
                  title="Quitar rol de instalador"
                  aria-label="Quitar rol de instalador"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Instalador</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {esJefeDeBrigada(selectedWorker) ? (
                      <Crown className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Users className="h-5 w-5 text-blue-500" />
                    )}
                    <span>{esJefeDeBrigada(selectedWorker) ? "Jefe de Brigada" : "Trabajador"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <WorkerAvatarUploader
                      ci={selectedWorker.CI}
                      fotoPerfil={selectedWorker.foto_perfil}
                      nombre={selectedWorker.nombre}
                      onChange={(foto) => {
                        setSelectedWorker((prev) => (prev ? { ...prev, foto_perfil: foto } : prev))
                        onRefresh()
                      }}
                    />
                    <div className="space-y-2 text-center">
                      <p className="font-semibold text-gray-900">{selectedWorker.nombre}</p>
                      <p className="text-sm text-gray-600">CI: {selectedWorker.CI}</p>
                    </div>
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
            <DialogTitle>Horas trabajadas de todos los instaladores</DialogTitle>
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

      <ConfirmDeleteDialog
        open={!!confirmRemoveJefe}
        onOpenChange={(open) => { if (!open) setConfirmRemoveJefe(null) }}
        title="Quitar como Jefe de Brigada"
        message={`¿Estás seguro de que quieres quitarle el rol de jefe de brigada a ${confirmRemoveJefe?.nombre} (CI: ${confirmRemoveJefe?.CI})? Sigue siendo instalador. Si lideraba una brigada, se elimina; sus integrantes quedan sin brigada hasta que se les asigne otro jefe.`}
        onConfirm={() => confirmRemoveJefe && handleQuitarJefe(confirmRemoveJefe)}
        confirmText="Quitar como jefe"
        isLoading={isRemovingJefeLoading === confirmRemoveJefe?.CI}
      />

      <ConfirmDeleteDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title="Quitar Rol de Instalador"
        message={`¿Estás seguro de que quieres quitarle el rol de instalador/jefe de brigada a ${confirmDelete?.nombre} (CI: ${confirmDelete?.CI})? No se desactiva al trabajador (sigue activo en el sistema, por ejemplo si cambió de área). Solo deja de aparecer como instalador. Si era jefe de brigada, su brigada se elimina; si era integrante, se le saca de la lista de integrantes.`}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        confirmText="Quitar rol"
        isLoading={isDeleting}
      />
    </>
  )
}
