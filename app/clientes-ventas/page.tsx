"use client";

import { useState } from "react";
import { Search, UserRoundPlus, Users } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { useToast } from "@/hooks/use-toast";
import { useClientesVentas } from "@/hooks/use-clientes-ventas";
import { ClientesVentasTable } from "@/components/feats/clientes-ventas/clientes-ventas-table";
import { UpsertClienteVentaDialog } from "@/components/feats/clientes-ventas/upsert-cliente-venta-dialog";
import type {
  ClienteVenta,
  ClienteVentaCreateData,
  ClienteVentaUpdateData,
} from "@/lib/api-types";

export default function ClientesVentasPage() {
  const { toast } = useToast();
  const {
    filteredClientes,
    loading,
    searchTerm,
    setSearchTerm,
    createCliente,
    updateCliente,
    deleteCliente,
    loadClientes,
  } = useClientesVentas();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<ClienteVenta | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<ClienteVenta | null>(
    null,
  );

  if (loading && filteredClientes.length === 0) {
    return (
      <PageLoader moduleName="Clientes Ventas" text="Cargando clientes..." />
    );
  }

  const handleCreate = async (
    data: ClienteVentaCreateData | ClienteVentaUpdateData,
  ) => {
    const nombre = data.nombre?.trim();
    if (!nombre) {
      throw new Error("El nombre del cliente venta es obligatorio");
    }

    try {
      await createCliente({
        nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        ci: data.ci,
      });
      toast({
        title: "Exito",
        description: "Cliente venta creado correctamente",
      });
      await loadClientes();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo crear el cliente venta",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEdit = async (data: ClienteVentaUpdateData) => {
    if (!clienteToEdit) return;

    try {
      await updateCliente(clienteToEdit.id, data);
      toast({
        title: "Exito",
        description: "Cliente venta actualizado correctamente",
      });
      await loadClientes();
      setClienteToEdit(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el cliente venta",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleAskDelete = (cliente: ClienteVenta) => {
    setClienteToDelete(cliente);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;

    try {
      await deleteCliente(clienteToDelete.id);
      toast({
        title: "Exito",
        description: "Cliente venta eliminado correctamente",
      });
      setClienteToDelete(null);
      await loadClientes();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el cliente venta",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Clientes Ventas"
        subtitle="Gestiona clientes de venta para solicitudes web"
        badge={{ text: "Ventas", className: "bg-teal-100 text-teal-800" }}
        className="bg-white shadow-sm border-b border-orange-100"
        actions={
          <Button
            size="icon"
            className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold shadow-md touch-manipulation"
            onClick={() => setIsCreateDialogOpen(true)}
            aria-label="Crear cliente venta"
            title="Crear cliente venta"
          >
            <UserRoundPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Cliente</span>
            <span className="sr-only">Nuevo cliente</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <Card className="border-0 shadow-md mb-6 border-l-4 border-l-teal-600">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label
                  htmlFor="search-clientes-ventas"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-clientes-ventas"
                    placeholder="Buscar por numero, nombre, telefono, CI o direccion..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md border-l-4 border-l-teal-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Clientes Ventas
            </CardTitle>
            <CardDescription>
              Mostrando {filteredClientes.length} cliente
              {filteredClientes.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientesVentasTable
              clientes={filteredClientes}
              onEdit={(cliente) => {
                setClienteToEdit(cliente);
                setIsEditDialogOpen(true);
              }}
              onDelete={handleAskDelete}
            />
          </CardContent>
        </Card>
      </main>

      <UpsertClienteVentaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      <UpsertClienteVentaDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setClienteToEdit(null);
        }}
        onSubmit={handleEdit}
        cliente={clienteToEdit}
      />

      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar cliente venta"
        message={`Estas seguro de eliminar ${clienteToDelete?.nombre || "este cliente"}?`}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
      />

      <Toaster />
    </div>
  );
}
