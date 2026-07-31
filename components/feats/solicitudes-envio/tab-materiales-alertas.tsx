"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellOff, BellRing, Package, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { MaterialImage } from "@/components/shared/molecule/material-image";
import { useToast } from "@/hooks/use-toast";
import type { MaterialSolicitudEnvio, SolicitudEnvioCreateData } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";
import { useAlertasStock, type MaterialBajoMinimoAgregado } from "@/hooks/use-alertas-stock";
import { useSolicitudesEnvio } from "@/hooks/use-solicitudes-envio";

import { CrearSolicitudEnvioDialog } from "@/components/feats/solicitudes-envio/crear-solicitud-envio-dialog";
import { IgnorarAlertaDialog } from "@/components/feats/solicitudes-envio/ignorar-alerta-dialog";

type CarritoItem = MaterialSolicitudEnvio;

function severidad(m: MaterialBajoMinimoAgregado): "critico" | "bajo" | "ok" {
  if (m.cantidad_total <= 0) return "critico";
  if (m.cantidad_total < m.stockaje_minimo) return "critico";
  if (m.cantidad_total <= m.stockaje_minimo * 1.2) return "bajo";
  return "ok";
}

const SeveridadBadge = ({ nivel }: { nivel: "critico" | "bajo" | "ok" }) => {
  if (nivel === "critico") {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        <AlertTriangle className="h-3 w-3 mr-1" /> Bajo mínimo
      </Badge>
    );
  }
  if (nivel === "bajo") {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
        Cerca del mínimo
      </Badge>
    );
  }
  return null;
};

export function TabMaterialesAlertas() {
  const { toast } = useToast();
  const alerts = useAlertasStock();
  const { create } = useSolicitudesEnvio();

  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [ignoreTarget, setIgnoreTarget] = useState<MaterialBajoMinimoAgregado | null>(null);
  const [crearOpen, setCrearOpen] = useState(false);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return alerts.materiales;
    return alerts.materiales.filter(
      (m) =>
        m.codigo.toLowerCase().includes(q) ||
        m.nombre.toLowerCase().includes(q) ||
        (m.descripcion ?? "").toLowerCase().includes(q),
    );
  }, [alerts.materiales, busqueda]);

  const enCarrito = useMemo(
    () => new Set(carrito.map((c) => c.material_id)),
    [carrito],
  );

  const addToCart = (m: MaterialBajoMinimoAgregado) => {
    if (enCarrito.has(m.material_id)) return;
    const cantidadSugerida = Math.max(1, Math.ceil(m.deficit_total * 1.2));
    const item: CarritoItem = {
      material_id: m.material_id,
      material_codigo: m.codigo,
      material_nombre: m.nombre,
      material_descripcion: m.descripcion,
      material_foto: m.foto,
      um: m.um,
      cantidad: cantidadSugerida,
      cantidad_actual_snapshot: m.cantidad_total,
      stockaje_minimo_snapshot: m.stockaje_minimo,
      motivo: "bajo minimo",
    };
    setCarrito((prev) => [...prev, item]);
  };

  const updateCartCantidad = (materialId: string, cantidad: number) =>
    setCarrito((prev) =>
      prev.map((c) => (c.material_id === materialId ? { ...c, cantidad } : c)),
    );
  const removeFromCart = (materialId: string) =>
    setCarrito((prev) => prev.filter((c) => c.material_id !== materialId));

  const handleCreate = async (data: SolicitudEnvioCreateData) => {
    const solicitud = await create(data);
    toast({
      title: "Solicitud creada",
      description: `${solicitud.codigo} con ${data.materiales.length} material(es).`,
    });
    setCarrito([]);
    await alerts.reload();
  };

  const handleIgnorar = async (motivo: string) => {
    if (!ignoreTarget) return;
    try {
      await alerts.ignorar(ignoreTarget.material_id, motivo);
      toast({
        title: "Alerta silenciada",
        description: `${ignoreTarget.codigo} — ${ignoreTarget.nombre}`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo silenciar",
        variant: "destructive",
      });
    } finally {
      setIgnoreTarget(null);
    }
  };

  const handleReactivar = async (m: MaterialBajoMinimoAgregado) => {
    try {
      await alerts.reactivar(m.material_id);
      toast({
        title: "Alerta reactivada",
        description: `${m.codigo} — ${m.nombre}`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo reactivar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
      <div className="space-y-3">
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Buscar por código, nombre o descripción"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-md"
            />
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={alerts.verIgnoradas ? "default" : "outline"}
                size="sm"
                onClick={() => alerts.setVerIgnoradas(!alerts.verIgnoradas)}
              >
                {alerts.verIgnoradas ? (
                  <>
                    <BellRing className="h-4 w-4 mr-1" /> Ver activas
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-1" /> Ver ignoradas ({alerts.ignoradas.length})
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={alerts.reload}>
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Alerta</th>
                  <th className="text-left px-3 py-2 font-medium">Material</th>
                  <th className="text-right px-3 py-2 font-medium">Stock</th>
                  <th className="text-right px-3 py-2 font-medium">Mínimo</th>
                  <th className="text-right px-3 py-2 font-medium">Déficit</th>
                  <th className="text-left px-3 py-2 font-medium">En solicitud</th>
                  <th className="text-right px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-8">
                      Cargando…
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-8">
                      {alerts.verIgnoradas
                        ? "Sin alertas silenciadas."
                        : "No hay materiales bajo el mínimo. Todo bien."}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((m) => {
                    const nivel = severidad(m);
                    const enSol = m.solicitudes_activas.length > 0;
                    return (
                      <tr key={m.material_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <SeveridadBadge nivel={nivel} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-11 h-11 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                              <MaterialImage
                                foto={m.foto}
                                fotoDisponible={m.foto_disponible ?? undefined}
                                alt={m.nombre}
                                imgClassName="w-full h-full object-contain p-0.5"
                                fallback={
                                  <div className="w-full h-full flex items-center justify-center bg-amber-50">
                                    <Package className="h-5 w-5 text-amber-700" />
                                  </div>
                                }
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-mono text-slate-500 truncate">
                                {m.codigo}
                              </div>
                              <div className="text-sm text-slate-900 truncate">
                                {m.nombre}
                              </div>
                              <div className="text-xs text-slate-400">
                                {m.almacenes.length === 1
                                  ? m.almacenes[0].almacen_nombre
                                  : `${m.almacenes.length} almacenes`}
                                {m.um ? ` · ${m.um}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {m.cantidad_total}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {m.stockaje_minimo}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {m.deficit_total > 0 ? (
                            <span className="text-red-700 font-medium">
                              −{m.deficit_total}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {enSol ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-800 border-blue-200"
                            >
                              {m.solicitudes_activas.map((s) => s.codigo).join(", ")}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {alerts.verIgnoradas ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivar(m)}
                              >
                                <BellRing className="h-3 w-3 mr-1" />
                                Reactivar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(m)}
                                  disabled={enCarrito.has(m.material_id)}
                                >
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  {enCarrito.has(m.material_id)
                                    ? "En carrito"
                                    : "Al pedido"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIgnoreTarget(m)}
                                >
                                  <BellOff className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-3">
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" /> Pedido en preparación
              </div>
              <Badge variant="outline" className="bg-slate-100 text-slate-700">
                {carrito.length} material{carrito.length === 1 ? "" : "es"}
              </Badge>
            </div>
            {carrito.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">
                Añade materiales desde la lista para armar una solicitud.
              </div>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {carrito.map((c) => (
                  <div
                    key={c.material_id}
                    className="flex items-start gap-2 border border-slate-200 rounded-md p-2"
                  >
                    <div className="relative w-9 h-9 rounded overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                      <MaterialImage
                        foto={c.material_foto}
                        fotoDisponible={true}
                        alt={c.material_nombre}
                        imgClassName="w-full h-full object-contain p-0.5"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-amber-50">
                            <Package className="h-4 w-4 text-amber-700" />
                          </div>
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-slate-500 truncate">
                        {c.material_codigo}
                      </div>
                      <div className="text-xs text-slate-900 truncate">
                        {c.material_nombre}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={c.cantidad}
                        onChange={(e) =>
                          updateCartCantidad(c.material_id, Number(e.target.value))
                        }
                        className="w-20 text-right h-7 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(c.material_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              disabled={carrito.length === 0}
              onClick={() => setCrearOpen(true)}
            >
              Crear solicitud ({carrito.length})
            </Button>
          </CardContent>
        </Card>
      </div>

      {ignoreTarget && (
        <IgnorarAlertaDialog
          open={Boolean(ignoreTarget)}
          onOpenChange={(v) => !v && setIgnoreTarget(null)}
          materialCodigo={ignoreTarget.codigo}
          materialNombre={ignoreTarget.nombre}
          onConfirm={handleIgnorar}
        />
      )}

      <CrearSolicitudEnvioDialog
        open={crearOpen}
        onOpenChange={setCrearOpen}
        materialesIniciales={carrito}
        onCreate={handleCreate}
      />
    </div>
  );
}
