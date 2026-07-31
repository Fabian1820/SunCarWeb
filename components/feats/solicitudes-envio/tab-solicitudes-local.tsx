"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

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
import { useAuth } from "@/contexts/auth-context";
import { useSolicitudesEnvio } from "@/hooks/use-solicitudes-envio";
import type {
  EstadoSolicitudEnvio,
  SolicitudEnvio,
  SolicitudEnvioUpdateData,
  UrgenciaSolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

import { CancelarSolicitudDialog } from "@/components/feats/solicitudes-envio/cancelar-solicitud-dialog";
import { CrearSolicitudEnvioDialog } from "@/components/feats/solicitudes-envio/crear-solicitud-envio-dialog";
import { SolicitudEnvioDetailDialog } from "@/components/feats/solicitudes-envio/solicitud-envio-detail-dialog";
import { SolicitudesEnvioTable } from "@/components/feats/solicitudes-envio/solicitudes-envio-table";

export function TabSolicitudesLocal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const hook = useSolicitudesEnvio({ modo: "local" });

  const [detail, setDetail] = useState<SolicitudEnvio | null>(null);
  const [edit, setEdit] = useState<SolicitudEnvio | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SolicitudEnvio | null>(null);

  const puedeEditar = (s: SolicitudEnvio) =>
    s.estado === "pendiente" &&
    (!s.creada_por_ci || !user?.ci || s.creada_por_ci === user.ci);

  const puedeCancelar = (s: SolicitudEnvio) =>
    (s.estado === "pendiente" || s.estado === "en_proceso") &&
    (!s.creada_por_ci || !user?.ci || s.creada_por_ci === user.ci);

  const handleUpdate = async (id: string, data: SolicitudEnvioUpdateData) => {
    await hook.update(id, data);
    toast({ title: "Solicitud actualizada" });
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
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
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
                <SelectItem value="todas">Cualquier urgencia</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
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
        emptyText="No has creado solicitudes con estos filtros. Ve a la pestaña Materiales & Alertas para armar una nueva."
        rowActions={(s) => (
          <>
            {puedeEditar(s) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEdit(s)}
                title="Editar solicitud"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {puedeCancelar(s) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelTarget(s)}
                title="Cancelar solicitud"
              >
                <X className="h-3.5 w-3.5 text-red-600" />
              </Button>
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
          detail && puedeEditar(detail) ? (
            <Button
              variant="outline"
              onClick={() => {
                setEdit(detail);
                setDetail(null);
              }}
            >
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
          ) : null
        }
      />

      <CrearSolicitudEnvioDialog
        open={Boolean(edit)}
        onOpenChange={(v) => !v && setEdit(null)}
        materialesIniciales={[]}
        solicitudExistente={edit}
        onCreate={async () => {
          /* no-op — este dialog solo edita en este tab */
        }}
        onUpdate={handleUpdate}
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
