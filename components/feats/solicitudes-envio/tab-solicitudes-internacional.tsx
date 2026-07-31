"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, PlayCircle, X } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/atom/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { SmartPagination } from "@/components/shared/molecule/smart-pagination";
import { useToast } from "@/hooks/use-toast";
import { useSolicitudesEnvio } from "@/hooks/use-solicitudes-envio";
import type {
  CompletarSolicitudData,
  EstadoSolicitudEnvio,
  SolicitudEnvio,
  UrgenciaSolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

import { CancelarSolicitudDialog } from "@/components/feats/solicitudes-envio/cancelar-solicitud-dialog";
import { CompletarSolicitudDialog } from "@/components/feats/solicitudes-envio/completar-solicitud-dialog";
import { SolicitudEnvioDetailDialog } from "@/components/feats/solicitudes-envio/solicitud-envio-detail-dialog";
import { SolicitudesEnvioTable } from "@/components/feats/solicitudes-envio/solicitudes-envio-table";

export function TabSolicitudesInternacional() {
  const { toast } = useToast();
  const hook = useSolicitudesEnvio({ modo: "internacional" });

  const [detail, setDetail] = useState<SolicitudEnvio | null>(null);
  const [completar, setCompletar] = useState<SolicitudEnvio | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SolicitudEnvio | null>(null);

  const esActiva = (s: SolicitudEnvio) =>
    s.estado === "pendiente" || s.estado === "en_proceso";

  const handleMarcarEnProceso = async (s: SolicitudEnvio) => {
    try {
      await hook.marcarEnProceso(s.id);
      toast({
        title: "Solicitud en proceso",
        description: `${s.codigo} está siendo procesada.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo actualizar",
        variant: "destructive",
      });
    }
  };

  const handleCompletar = async (
    payload: CompletarSolicitudData,
  ): Promise<{ compra_id: string }> => {
    if (!completar) throw new Error("Sin solicitud seleccionada");
    const r = await hook.completar(completar.id, payload);
    toast({
      title: "Solicitud completada",
      description: `Compra ${r.compra_id} creada en estado 'solicitado'.`,
    });
    return r;
  };

  const handleCancel = async (motivo: string) => {
    if (!cancelTarget) return;
    await hook.cancelar(cancelTarget.id, motivo);
    toast({ title: "Solicitud cancelada" });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Input
              placeholder="Buscar por código o material…"
              value={hook.filtros.q}
              onChange={(e) => hook.updateFiltros({ q: e.target.value })}
            />
          </div>
          <div>
            <Select
              value={hook.filtros.estado}
              onValueChange={(v) =>
                hook.updateFiltros({
                  estado: v as EstadoSolicitudEnvio | "todos",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendientes (cola)</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="completada">Completadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={hook.filtros.urgencia}
              onValueChange={(v) =>
                hook.updateFiltros({
                  urgencia: v as UrgenciaSolicitudEnvio | "todas",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Urgencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Cualquiera</SelectItem>
                <SelectItem value="alta">Urgentes primero</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="text-xs text-slate-500">
              {hook.total} resultado{hook.total === 1 ? "" : "s"}
            </div>
            <Button variant="outline" size="sm" onClick={hook.reload}>
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {hook.error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {hook.error}
        </div>
      )}

      <SolicitudesEnvioTable
        items={hook.items}
        loading={hook.loading}
        onRowClick={setDetail}
        emptyText="No hay solicitudes que procesar."
        rowActions={(s) => (
          <>
            {s.estado === "pendiente" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarcarEnProceso(s)}
                title="Marcar en proceso"
              >
                <PlayCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {esActiva(s) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompletar(s)}
                title="Completar → crear compra"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              </Button>
            )}
            {esActiva(s) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelTarget(s)}
                title="Cancelar solicitud"
              >
                <X className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
            {s.compra_id && (
              <Link
                href={`/compras/${s.compra_id}/ficha-costo`}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                title="Ver compra"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Compra
              </Link>
            )}
          </>
        )}
      />

      {hook.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div>
            Página {hook.page} de {hook.totalPages}
          </div>
          <SmartPagination
            currentPage={hook.page}
            totalPages={hook.totalPages}
            onPageChange={hook.setPage}
          />
        </div>
      )}

      <SolicitudEnvioDetailDialog
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
        solicitud={detail}
        actions={
          detail && esActiva(detail) ? (
            <>
              {detail.estado === "pendiente" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleMarcarEnProceso(detail);
                    setDetail(null);
                  }}
                >
                  <PlayCircle className="h-4 w-4 mr-1" /> Marcar en proceso
                </Button>
              )}
              <Button
                onClick={() => {
                  setCompletar(detail);
                  setDetail(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Completar → Compra
              </Button>
            </>
          ) : null
        }
      />

      <CompletarSolicitudDialog
        open={Boolean(completar)}
        onOpenChange={(v) => !v && setCompletar(null)}
        solicitud={completar}
        onConfirm={handleCompletar}
      />

      {cancelTarget && (
        <CancelarSolicitudDialog
          open={Boolean(cancelTarget)}
          onOpenChange={(v) => !v && setCancelTarget(null)}
          codigo={cancelTarget.codigo}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
