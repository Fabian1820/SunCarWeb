import { useState } from 'react';
import type { Trabajador, Brigada } from '@/lib/api-types';
import { Button } from '@/components/shared/atom/button';
import { Plus, UserCog, UserPlus, Users, Crown, Eye, Power, Mail, Phone, Clock, List, Edit, Trash2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/shared/atom/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/molecule/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog, ConfirmEditDialog } from '@/components/shared/molecule/dialog';
import { Label } from '@/components/shared/atom/label';
import { Input } from '@/components/shared/molecule/input';
import { Calendar } from '@/components/shared/molecule/calendar';
import { DialogFooter, DialogTrigger, DialogDescription } from '@/components/shared/molecule/dialog';
import { useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/molecule/tooltip';
import { TrabajadorService } from '@/lib/api-services';
import { useToast } from '@/hooks/use-toast';

interface TrabajadoresTableProps {
  trabajadores: Trabajador[];
  brigadas: Brigada[];
  onAdd: () => void;
  onAddJefe: () => void;
  onAssignBrigada: (trabajador: Trabajador) => void;
  onConvertJefe: (trabajador: Trabajador) => void;
  onEdit: (trabajador: Trabajador) => void;
  onDelete: (trabajador: Trabajador) => void;
  onRefresh: () => void;
}

export function TrabajadoresTable({ trabajadores, brigadas, onAdd, onAddJefe, onAssignBrigada, onConvertJefe, onEdit, onDelete, onRefresh }: TrabajadoresTableProps) {
  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<Trabajador | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Trabajador | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', nuevoCi: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // NUEVO: Estados para horas trabajadas individuales
  const [isHorasDialogOpen, setIsHorasDialogOpen] = useState(false);
  const [horasWorker, setHorasWorker] = useState<Trabajador | null>(null);
  const [horasData, setHorasData] = useState<any>(null);
  const [horasLoading, setHorasLoading] = useState(false);
  const [horasError, setHorasError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [salario, setSalario] = useState<string>("");
  const [salarioTotal, setSalarioTotal] = useState<number | null>(null);

  // NUEVO: Estados para horas de todos
  const [isHorasTodosDialogOpen, setIsHorasTodosDialogOpen] = useState(false);
  const [horasTodosData, setHorasTodosData] = useState<any>(null);
  const [horasTodosLoading, setHorasTodosLoading] = useState(false);
  const [horasTodosError, setHorasTodosError] = useState<string | null>(null);
  const [fechaTodosInicio, setFechaTodosInicio] = useState<string>("");
  const [fechaTodosFin, setFechaTodosFin] = useState<string>("");

  // Por defecto: mes actual
  useEffect(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFechaInicio(first.toISOString().split('T')[0]);
    setFechaFin(last.toISOString().split('T')[0]);
    setFechaTodosInicio(first.toISOString().split('T')[0]);
    setFechaTodosFin(last.toISOString().split('T')[0]);
  }, []);

  // Handler para abrir modal de edición
  const openEditDialog = (worker: Trabajador) => {
    setWorkerToEdit(worker);
    setEditForm({ nombre: worker.nombre, nuevoCi: '' });
    setIsEditDialogOpen(true);
  };

  // Handler para abrir modal de eliminación
  const openDeleteDialog = (worker: Trabajador) => {
    setWorkerToDelete(worker);
    setIsDeleteDialogOpen(true);
  };

  // Handler para editar trabajador
  const handleEditWorker = async () => {
    if (!workerToEdit) return;
    
    setIsLoading(true);
    try {
      await TrabajadorService.actualizarTrabajador(
        workerToEdit.CI, 
        editForm.nombre, 
        editForm.nuevoCi || undefined
      );
      toast({
        title: "Trabajador actualizado",
        description: "Los datos del trabajador han sido actualizados exitosamente.",
        variant: "default",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el trabajador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para eliminar trabajador
  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;
    
    setIsLoading(true);
    try {
      await TrabajadorService.eliminarTrabajador(workerToDelete.CI);
      toast({
        title: "Trabajador eliminado",
        description: "El trabajador ha sido eliminado exitosamente.",
        variant: "default",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el trabajador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para abrir modal de horas de un trabajador
  const openHorasDialog = (worker: Trabajador) => {
    setHorasWorker(worker);
    setHorasData(null);
    setHorasError(null);
    setSalario("");
    setSalarioTotal(null);
    setIsHorasDialogOpen(true);
  };

  // Handler para consultar horas de un trabajador
  const fetchHorasTrabajador = async () => {
    if (!horasWorker || !fechaInicio || !fechaFin) return;
    setHorasLoading(true);
    setHorasError(null);
    setHorasData(null);
    try {
      const data = await TrabajadorService.getHorasTrabajadas(horasWorker.CI, fechaInicio, fechaFin);
      setHorasData(data);
    } catch (e: any) {
      setHorasError(e.message || 'Error al obtener horas');
    } finally {
      setHorasLoading(false);
    }
  };

  // Handler para calcular salario
  const calcularSalario = () => {
    if (!horasData || !salario) return;
    const total = parseFloat(salario) * (horasData.total_horas || 0);
    setSalarioTotal(total);
  };

  // Handler para abrir modal de horas de todos
  const openHorasTodosDialog = () => {
    setHorasTodosData(null);
    setHorasTodosError(null);
    setIsHorasTodosDialogOpen(true);
  };

  // Handler para consultar horas de todos
  const fetchHorasTodos = async () => {
    if (!fechaTodosInicio || !fechaTodosFin) return;
    setHorasTodosLoading(true);
    setHorasTodosError(null);
    setHorasTodosData(null);
    try {
      const data = await TrabajadorService.getHorasTrabajadasTodos(fechaTodosInicio, fechaTodosFin);
      setHorasTodosData(data);
    } catch (e: any) {
      setHorasTodosError(e.message || 'Error al obtener horas');
    } finally {
      setHorasTodosLoading(false);
    }
  };

  const openDetailDialog = (worker: Trabajador) => {
    setSelectedWorker(worker);
    setIsDetailDialogOpen(true);
  };

  const [isRemovePasswordLoading, setIsRemovePasswordLoading] = useState<string | null>(null);
  const [confirmRemovePassword, setConfirmRemovePassword] = useState<Trabajador | null>(null);

  // Handler para eliminar contraseña de jefe
  const handleRemovePassword = async (worker: Trabajador) => {
    setIsRemovePasswordLoading(worker.CI);
    try {
      await TrabajadorService.eliminarContrasenaTrabajador(worker.CI);
      toast({
        title: 'Contraseña eliminada',
        description: `El trabajador ${worker.nombre} ahora es trabajador normal.`,
        variant: 'default',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la contraseña',
        variant: 'destructive',
      });
    } finally {
      setIsRemovePasswordLoading(null);
      setConfirmRemovePassword(null);
    }
  };

  if (trabajadores.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron trabajadores</h3>
        <p className="text-gray-600">No hay trabajadores que coincidan con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">CI</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Rol</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={openHorasTodosDialog}
                  title="Calcular horas de todos"
                >
                  <List className="h-5 w-5" />
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((worker) => (
              <tr key={worker.id || worker.CI} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      {worker.tiene_contraseña ? (
                        <Crown className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Users className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{worker.nombre}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">{worker.CI}</td>
                <td className="py-4 px-4">
                  <Badge variant={worker.tiene_contraseña ? "outline" : "secondary"}>
                    {worker.tiene_contraseña ? "Jefe de brigada" : "Trabajador"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(worker)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      title="Editar trabajador"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(worker)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      title="Eliminar trabajador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAssignBrigada(worker)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      title="Asignar a brigada"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {worker.tiene_contraseña && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRemovePassword(worker)}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        title="Eliminar contraseña (convertir en trabajador normal)"
                        disabled={isRemovePasswordLoading === worker.CI}
                      >
                        {isRemovePasswordLoading === worker.CI ? (
                          <span className="animate-spin"><KeyRound className="h-4 w-4" /></span>
                        ) : (
                          <KeyRound className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {!worker.tiene_contraseña && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onConvertJefe(worker)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        title="Convertir en jefe de brigada"
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

      {/* Detail Dialog */}
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
                    {selectedWorker.tiene_contraseña ? (
                      <Crown className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Users className="h-5 w-5 text-blue-500" />
                    )}
                    <span>{selectedWorker.tiene_contraseña ? "Jefe de Brigada" : "Trabajador"}</span>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Trabajador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                placeholder="Nombre del trabajador"
              />
            </div>
            <div>
              <Label htmlFor="nuevoCi">Nuevo CI (opcional)</Label>
              <Input
                id="nuevoCi"
                value={editForm.nuevoCi}
                onChange={(e) => setEditForm({ ...editForm, nuevoCi: e.target.value })}
                placeholder="Nuevo CI (dejar vacío para mantener el actual)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditWorker} disabled={isLoading || !editForm.nombre.trim()}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Trabajador"
        message={`¿Estás seguro de que quieres eliminar a ${workerToDelete?.nombre}? Esta acción no se puede deshacer y eliminará completamente al trabajador de la base de datos.`}
        onConfirm={handleDeleteWorker}
        isLoading={isLoading}
      />

      {/* Modal: Horas trabajadas de un trabajador */}
      <Dialog open={isHorasDialogOpen} onOpenChange={setIsHorasDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Horas trabajadas de {horasWorker?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Fecha fin</Label>
                <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchHorasTrabajador} disabled={horasLoading}>
                  {horasLoading ? 'Consultando...' : 'Consultar'}
                </Button>
              </div>
            </div>
            {horasError && <div className="text-red-600">{horasError}</div>}
            {horasData && (
              <div className="space-y-2">
                <div className="font-semibold">Total de horas: {horasData.total_horas}</div>
                <div className="flex gap-2 items-end">
                  <div>
                    <Label>Salario por hora</Label>
                    <Input type="number" min="0" value={salario} onChange={e => setSalario(e.target.value)} placeholder="Monto" />
                  </div>
                  <Button onClick={calcularSalario} disabled={!salario || !horasData.total_horas}>Calcular salario</Button>
                </div>
                {salarioTotal !== null && (
                  <div className="text-green-700 font-bold">Salario total: {salarioTotal.toFixed(2)}</div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Horas trabajadas de todos los trabajadores */}
      <Dialog open={isHorasTodosDialogOpen} onOpenChange={setIsHorasTodosDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Horas trabajadas de todos los trabajadores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={fechaTodosInicio} onChange={e => setFechaTodosInicio(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label>Fecha fin</Label>
                <Input type="date" value={fechaTodosFin} onChange={e => setFechaTodosFin(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchHorasTodos} disabled={horasTodosLoading}>
                  {horasTodosLoading ? 'Consultando...' : 'Consultar'}
                </Button>
              </div>
            </div>
            {horasTodosError && <div className="text-red-600">{horasTodosError}</div>}
            {horasTodosData && (
              <div>
                <table className="w-full border mt-2">
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
              <p>¿Estás seguro de que quieres eliminar la contraseña de <span className="font-semibold">{confirmRemovePassword.nombre}</span> (CI: {confirmRemovePassword.CI})? Esta acción convertirá al jefe en trabajador normal.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemovePassword(null)} disabled={isRemovePasswordLoading === confirmRemovePassword.CI}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemovePassword(confirmRemovePassword)}
                disabled={isRemovePasswordLoading === confirmRemovePassword.CI}
              >
                {isRemovePasswordLoading === confirmRemovePassword.CI ? 'Eliminando...' : 'Eliminar contraseña'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 