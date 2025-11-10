"use client"

import { useState } from 'react'
import { Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Card } from '@/components/shared/molecule/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/molecule/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/molecule/dialog'
import { Badge } from '@/components/shared/atom/badge'
import type { OfertaPersonalizada } from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

interface OfertasPersonalizadasTableProps {
  ofertas: OfertaPersonalizada[]
  onEdit: (oferta: OfertaPersonalizada) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export function OfertasPersonalizadasTable({
  ofertas,
  onEdit,
  onDelete,
  loading = false,
}: OfertasPersonalizadasTableProps) {
  const [selectedOferta, setSelectedOferta] = useState<OfertaPersonalizada | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [ofertaToDelete, setOfertaToDelete] = useState<string | null>(null)

  const handleViewDetails = (oferta: OfertaPersonalizada) => {
    setSelectedOferta(oferta)
    setIsDetailsOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setOfertaToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (ofertaToDelete) {
      onDelete(ofertaToDelete)
      setIsDeleteDialogOpen(false)
      setOfertaToDelete(null)
    }
  }

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Cargando ofertas personalizadas...</p>
      </Card>
    )
  }

  if (ofertas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No se encontraron ofertas personalizadas
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente ID</TableHead>
                <TableHead>Equipos</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ofertas.map((oferta) => {
                const totalEquipos =
                  (oferta.inversores?.length || 0) +
                  (oferta.baterias?.length || 0) +
                  (oferta.paneles?.length || 0) +
                  (oferta.utiles?.length || 0) +
                  (oferta.servicios?.length || 0)

                return (
                  <TableRow key={oferta.id}>
                    <TableCell className="font-mono text-xs">
                      {oferta.id?.slice(-8) || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {oferta.cliente_id?.slice(-8) || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {oferta.inversores && oferta.inversores.length > 0 && (
                          <p>Inversores: {oferta.inversores.length}</p>
                        )}
                        {oferta.baterias && oferta.baterias.length > 0 && (
                          <p>Baterías: {oferta.baterias.length}</p>
                        )}
                        {oferta.paneles && oferta.paneles.length > 0 && (
                          <p>Paneles: {oferta.paneles.length}</p>
                        )}
                        {oferta.utiles && oferta.utiles.length > 0 && (
                          <p>Útiles: {oferta.utiles.length}</p>
                        )}
                        {oferta.servicios && oferta.servicios.length > 0 && (
                          <p>Servicios: {oferta.servicios.length}</p>
                        )}
                        {totalEquipos === 0 && (
                          <p className="text-muted-foreground">Sin items</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {oferta.precio !== undefined ? (
                        <span className="font-semibold">${oferta.precio.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">No definido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {oferta.pagada ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Pagada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewDetails(oferta)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(oferta)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteClick(oferta.id!)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog de detalles */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Oferta Personalizada</DialogTitle>
          </DialogHeader>
          {selectedOferta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{selectedOferta.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente ID</p>
                  <p className="font-mono text-sm">{selectedOferta.cliente_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Precio</p>
                  <p className="text-lg font-semibold">
                    {selectedOferta.precio !== undefined
                      ? `$${selectedOferta.precio.toFixed(2)}`
                      : 'No definido'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge className={selectedOferta.pagada ? 'bg-green-500' : ''}>
                    {selectedOferta.pagada ? 'Pagada' : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              {/* Inversores */}
              {selectedOferta.inversores && selectedOferta.inversores.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Inversores</h3>
                  {selectedOferta.inversores.map((inv, idx) => (
                    <Card key={idx} className="p-3 mb-2">
                      <p>
                        <strong>Marca:</strong> {inv.marca || 'N/A'}
                      </p>
                      <p>
                        <strong>Cantidad:</strong> {inv.cantidad} |{' '}
                        <strong>Potencia:</strong> {inv.potencia}W
                      </p>
                      {inv.descripcion && <p><strong>Descripción:</strong> {inv.descripcion}</p>}
                      {inv.codigo_equipo && <p><strong>Código:</strong> {inv.codigo_equipo}</p>}
                    </Card>
                  ))}
                </div>
              )}

              {/* Baterías */}
              {selectedOferta.baterias && selectedOferta.baterias.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Baterías</h3>
                  {selectedOferta.baterias.map((bat, idx) => (
                    <Card key={idx} className="p-3 mb-2">
                      <p>
                        <strong>Marca:</strong> {bat.marca || 'N/A'}
                      </p>
                      <p>
                        <strong>Cantidad:</strong> {bat.cantidad} |{' '}
                        <strong>Potencia:</strong> {bat.potencia}W
                      </p>
                      {bat.descripcion && <p><strong>Descripción:</strong> {bat.descripcion}</p>}
                    </Card>
                  ))}
                </div>
              )}

              {/* Paneles */}
              {selectedOferta.paneles && selectedOferta.paneles.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Paneles</h3>
                  {selectedOferta.paneles.map((panel, idx) => (
                    <Card key={idx} className="p-3 mb-2">
                      <p>
                        <strong>Marca:</strong> {panel.marca || 'N/A'}
                      </p>
                      <p>
                        <strong>Cantidad:</strong> {panel.cantidad} |{' '}
                        <strong>Potencia:</strong> {panel.potencia}W
                      </p>
                      {panel.descripcion && <p><strong>Descripción:</strong> {panel.descripcion}</p>}
                    </Card>
                  ))}
                </div>
              )}

              {/* Útiles */}
              {selectedOferta.utiles && selectedOferta.utiles.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Útiles</h3>
                  {selectedOferta.utiles.map((util, idx) => (
                    <Card key={idx} className="p-3 mb-2">
                      <p>
                        <strong>Descripción:</strong> {util.descripcion || 'N/A'}
                      </p>
                      <p>
                        <strong>Cantidad:</strong> {util.cantidad}
                      </p>
                    </Card>
                  ))}
                </div>
              )}

              {/* Servicios */}
              {selectedOferta.servicios && selectedOferta.servicios.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Servicios</h3>
                  {selectedOferta.servicios.map((serv, idx) => (
                    <Card key={idx} className="p-3 mb-2">
                      <p>
                        <strong>Descripción:</strong> {serv.descripcion || 'N/A'}
                      </p>
                      <p>
                        <strong>Costo:</strong> ${serv.costo?.toFixed(2) || '0.00'}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p>¿Estás seguro de que deseas eliminar esta oferta personalizada?</p>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
