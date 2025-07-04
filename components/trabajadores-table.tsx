import { useState } from 'react';
import type { Trabajador, Brigada } from '@/lib/api-types';
import { Button } from '@/components/ui/button';
import { Plus, UserCog, UserPlus, Users, Crown, Eye, Power, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TrabajadoresTableProps {
  trabajadores: Trabajador[];
  brigadas: Brigada[];
  onAdd: () => void;
  onAddJefe: () => void;
  onAssignBrigada: (trabajador: Trabajador) => void;
  onConvertJefe: (trabajador: Trabajador) => void;
}

export function TrabajadoresTable({ trabajadores, brigadas, onAdd, onAddJefe, onAssignBrigada, onConvertJefe }: TrabajadoresTableProps) {
  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const openDetailDialog = (worker: Trabajador) => {
    setSelectedWorker(worker);
    setIsDetailDialogOpen(true);
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
                      <p className="text-sm text-gray-600">CI: {worker.CI}</p>
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
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailDialog(worker)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
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
                    {"telefono" in selectedWorker && selectedWorker.telefono ? (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedWorker.telefono}
                      </p>
                    ) : null}
                    {"email" in selectedWorker && selectedWorker.email ? (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedWorker.email}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 