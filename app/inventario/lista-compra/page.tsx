"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { ListaCompraPendienteTable } from "@/components/feats/inventario/lista-compra-pendiente-table";
import { useListaCompra } from "@/hooks/use-lista-compra";

export default function ListaCompraPage() {
  const { items, loading, error, loadItems, updateItem, deleteItem, marcarEnviados } =
    useListaCompra("pendiente");

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ModuleHeader
        title="Lista de Compra"
        subtitle="Ítems curados manualmente a partir del análisis de stock, listos para pedir"
        badge={{ text: "Inventario", className: "bg-blue-100 text-blue-800" }}
        backHref="/inventario"
        backLabel="Volver a Inventario"
        className="bg-white shadow-sm border-b border-blue-100"
      />

      <main className="content-with-fixed-header max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8 space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Pendientes de comprar</CardTitle>
              <CardDescription>
                Agrega ítems desde el análisis de stock mínimo, ajusta cantidad y urgencia, y genera
                el mensaje de WhatsApp para el encargado de envíos.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => loadItems()} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refrescar</span>
            </Button>
          </CardHeader>
          <CardContent>
            <ListaCompraPendienteTable
              items={items}
              loading={loading}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onEnviar={marcarEnviados}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
