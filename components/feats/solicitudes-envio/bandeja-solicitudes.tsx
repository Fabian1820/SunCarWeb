"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Pencil,
  PlayCircle,
  Plus,
  X,
} from "lucide-react";

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
import { useAlmacenesLookup } from "@/hooks/use-almacenes-lookup";
import { useSolicitudesEnvio } from "@/hooks/use-solicitudes-envio";
import type {
  CompletarSolicitudData,
  EstadoSolicitudEnvio,
  MaterialSolicitudEnvio,
  SolicitudEnvio,
  SolicitudEnvioUpdateData,
  UrgenciaSolicitudEnvio,
} from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

import { CancelarSolicitudDialog } from "@/components/feats/solicitudes-envio/cancelar-solicitud-dialog";
import { CompletarSolicitudDialog } from "@/components/feats/solicitudes-envio/completar-solicitud-dialog";
import { CrearSolicitudEnvioDialog } from "@/components/feats/solicitudes-envio/crear-solicitud-envio-dialog";
import { SolicitudEnvioDetailDialog } from "@/components/feats/solicitudes-envio/solicitud-envio-detail-dialog";
import { SolicitudesEnvioTable } from "@/components/feats/solicitudes-envio/solicitudes-envio-table";

const MODULE = "solicitudes-envio";
/** Constante: un `[]` literal era un array nuevo en cada render. */
const SIN_MATERIALES: MaterialSolicitudEnvio[] = [];

interface Props {
  /**
   * Solo decide el orden por defecto, los textos y qué estados se ofrecen.
   * NO decide qué botones se ven: eso lo manda el sub-permiso, para que quien
   * tenga local + internacional pueda gestionar de punta a punta desde
   * cualquiera de las dos pestañas.
   */
  modo: "local" | "internacional";
}

export function BandejaSolicitudes({ modo }: Props) {
  const { toast } = useToast();
  const { user, hasSubPermission, hasPermission, hasExactPermission } = useAuth();
  const hook = useSolicitudesEnvio({ modo });
  const { nombreDe } = useAlmacenesLookup();

  const puedeLocal = hasSubPermission(MODULE, "solicitudes-local");
  const puedeInternacional = hasSubPermission(
    MODULE,
    "solicitudes-internacional",
  );
  // El backend deja editar las ajenas al superAdmin (y, con el permiso
  // aditivo, a quien lo tenga); el botón tiene que seguir la misma regla.
  const puedeEditarAjenas =
    Boolean(user?.is_superAdmin) ||
    hasExactPermission(`${MODULE}/editar-ajenas`);
  // La ficha de la compra vive en el módulo de compras.
  const puedeVerCompra = hasPermission("envio-contenedores");

  const [detail, setDetail] = useState<SolicitudEnvio | null>(null);
  const [edit, setEdit] = useState<SolicitudEnvio | null>(null);
  const [crearOpen, setCrearOpen] = useState(false);
  const [completar, setCompletar] = useState<SolicitudEnvio | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SolicitudEnvio | null>(null);

  const esActiva = (s: SolicitudEnvio) =>
    s.estado === "pendiente" || s.estado === "en_proceso";

  const esPropia = (s: SolicitudEnvio) =>
    !s.creada_por_ci || !user?.ci || s.creada_por_ci === user.ci;

  // El backend ya rechaza editar lo que no es tuyo o no está pendiente; esto
  // solo evita ofrecer un botón que iba a fallar.
  const puedeEditar = (s: SolicitudEnvio) =>
    s.estado === "pendiente" &&
    ((puedeLocal && esPropia(s)) || puedeEditarAjenas);
  const puedeMarcarEnProceso = (s: SolicitudEnvio) =>
    puedeInternacional && s.estado === "pendiente";
  const puedeCompletar = (s: SolicitudEnvio) =>
    puedeInternacional && esActiva(s);
  const puedeCancelar = (s: SolicitudEnvio) =>
    esActiva(s) && (puedeInternacional || (puedeLocal && esPropia(s)));

  const handleUpdate = async (id: string, data: SolicitudEnvioUpdateData) => {
    await hook.update(id, data);
    toast({ title: "Solicitud actualizada" });
  };

  const handleCreate = async (data: Parameters<typeof hook.create>[0]) => {
    const s = await hook.create(data);
    toast({
      title: "Solicitud creada",
      description: `${s.codigo} con ${data.materiales.length} material(es).`,
    });
  };

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
      description: `Compra «${payload.nombre || completar.codigo}» creada en estado 'solicitado'.`,
    });
    return r;
  };

  const handleCancel = async (motivo: string) => {
    if (!cancelTarget) return;
    await hook.cancelar(cancelTarget.id, motivo);
    toast({ title: "Solicitud cancelada" });
  };

  const estadoOpciones = useMemo(
    () =>
      modo === "internacional"
        ? [
            { value: "todos", label: "Todas" },
            { value: "pendiente", label: "Pendientes (cola)" },
            { value: "en_proceso", label: "En proceso" },
            { value: "completada", label: "Completadas" },
            { value: "cancelada", label: "Canceladas" },
          ]
        : [
            { value: "todos", label: "Todos los estados" },
            { value: "pendiente", label: "Pendiente" },
            { value: "en_proceso", label: "En proceso" },
            { value: "completada", label: "Completada" },
            { value: "cancelada", label: "Cancelada" },
          ],
    [modo],
  );

  const vacio =
    modo === "internacional"
      ? "No hay solicitudes que procesar."
      : "No hay solicitudes con estos filtros. Crea una nueva o ármala desde Materiales & Alertas.";

  const acciones = (s: SolicitudEnvio) => (
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
      {puedeMarcarEnProceso(s) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleMarcarEnProceso(s)}
          title="Marcar en proceso"
        >
          <PlayCircle className="h-3.5 w-3.5" />
        </Button>
      )}
      {puedeCompletar(s) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCompletar(s)}
          title="Completar → crear compra"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
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
      {s.compra_id && puedeVerCompra && (
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
  );

  return (
    <div className="min-w-0 space-y-3">
      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3">
          <Input
            placeholder="Buscar por código o material…"
            value={hook.filtros.q}
            onChange={(e) => hook.updateFiltros({ q: e.target.value })}
          />
          <Select
            value={hook.filtros.estado}
            onValueChange={(v) =>
              hook.updateFiltros({ estado: v as EstadoSolicitudEnvio | "todos" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {estadoOpciones.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="text-xs text-slate-500 whitespace-nowrap">
              {hook.total} resultado{hook.total === 1 ? "" : "s"}
            </div>
            {puedeLocal && (
              <Button size="sm" onClick={() => setCrearOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nueva solicitud
              </Button>
            )}
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
        emptyText={vacio}
        nombreAlmacen={nombreDe}
        rowActions={acciones}
      />

      {hook.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <div>
            Página {hook.page} de {hook.totalPages}
          </div>
          <div className="max-w-full overflow-x-auto">
            <SmartPagination
              currentPage={hook.page}
              totalPages={hook.totalPages}
              onPageChange={hook.setPage}
            />
          </div>
        </div>
      )}

      <SolicitudEnvioDetailDialog
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
        solicitud={detail}
        nombreAlmacen={nombreDe}
        puedeVerCompra={puedeVerCompra}
        actions={
          detail ? (
            <>
              {puedeEditar(detail) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEdit(detail);
                    setDetail(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {puedeMarcarEnProceso(detail) && (
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
              {puedeCancelar(detail) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelTarget(detail);
                    setDetail(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              )}
              {puedeCompletar(detail) && (
                <Button
                  onClick={() => {
                    setCompletar(detail);
                    setDetail(null);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Completar → Compra
                </Button>
              )}
            </>
          ) : null
        }
      />

      {(puedeLocal || puedeEditarAjenas) && (
        <CrearSolicitudEnvioDialog
          open={crearOpen || Boolean(edit)}
          onOpenChange={(v) => {
            if (v) return;
            setCrearOpen(false);
            setEdit(null);
          }}
          materialesIniciales={SIN_MATERIALES}
          solicitudExistente={edit}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      <CompletarSolicitudDialog
        open={Boolean(completar)}
        onOpenChange={(v) => !v && setCompletar(null)}
        solicitud={completar}
        onConfirm={handleCompletar}
        nombreAlmacen={nombreDe}
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
