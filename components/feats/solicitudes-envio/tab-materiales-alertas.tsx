"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellOff, BellRing, Package, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Input } from "@/components/shared/atom/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { MaterialImage } from "@/components/shared/molecule/material-image";
import { SmartPagination } from "@/components/shared/molecule/smart-pagination";
import { useToast } from "@/hooks/use-toast";
import { SolicitudEnvioService } from "@/lib/api-services";
import type { MaterialSolicitudEnvio, SolicitudEnvioCreateData } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";
import {
  useAlertasStock,
  type MaterialBajoMinimoAgregado,
  type SeveridadAlerta,
} from "@/hooks/use-alertas-stock";

import { CantidadInput } from "@/components/feats/solicitudes-envio/cantidad-input";
import { CrearSolicitudEnvioDialog } from "@/components/feats/solicitudes-envio/crear-solicitud-envio-dialog";
import { IgnorarAlertaDialog } from "@/components/feats/solicitudes-envio/ignorar-alerta-dialog";

type CarritoItem = MaterialSolicitudEnvio;

const SeveridadBadge = ({ m }: { m: MaterialBajoMinimoAgregado }) => {
  if (m.sin_alerta_actual) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 whitespace-nowrap">
        Sin alerta ahora
      </Badge>
    );
  }
  const nivel: SeveridadAlerta = m.severidad;
  if (nivel === "critico") {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 whitespace-nowrap">
        <AlertTriangle className="h-3 w-3 mr-1" /> Bajo mínimo
      </Badge>
    );
  }
  if (nivel === "bajo") {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">
        En el mínimo
      </Badge>
    );
  }
  return <span className="text-slate-400 text-xs">—</span>;
};

/** Stock de cada almacén en alerta: el mínimo se aplica almacén a almacén. */
const StockPorAlmacen = ({ m }: { m: MaterialBajoMinimoAgregado }) => {
  if (m.almacenes.length === 0) return <span className="text-slate-400">—</span>;
  if (m.almacenes.length === 1) return <>{m.almacenes[0].cantidad_actual}</>;
  return (
    <div className="space-y-0.5 text-xs">
      {m.almacenes.map((a) => (
        <div key={a.almacen_id} className="whitespace-nowrap">
          <span className="text-slate-500">{a.almacen_nombre}:</span>{" "}
          <span className={a.cantidad_actual < m.stockaje_minimo ? "text-red-700" : ""}>
            {a.cantidad_actual}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TabMaterialesAlertas() {
  const { toast } = useToast();
  const alerts = useAlertasStock();

  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  /** Almacenes en alerta de cada material del carrito, para proponer destino. */
  const [origenCarrito, setOrigenCarrito] = useState<Record<string, string[]>>({});
  const [ignoreTarget, setIgnoreTarget] = useState<MaterialBajoMinimoAgregado | null>(null);
  const [crearOpen, setCrearOpen] = useState(false);

  const enCarrito = useMemo(
    () => new Set(carrito.map((c) => c.material_id)),
    [carrito],
  );

  const addToCart = (m: MaterialBajoMinimoAgregado) => {
    if (enCarrito.has(m.material_id)) return;
    const cantidadSugerida = Math.max(1, Math.ceil(m.deficit_total * 1.2));
    const unAlmacen = m.almacenes.length === 1 ? m.almacenes[0] : null;
    const item: CarritoItem = {
      material_id: m.material_id,
      material_codigo: m.codigo,
      material_nombre: m.nombre,
      material_descripcion: m.descripcion,
      material_foto: m.foto,
      um: m.um,
      cantidad: cantidadSugerida,
      // Con un solo almacén la foto es exacta. Con varios no hay un "stock"
      // único que comparar con el mínimo (es por almacén): va el desglose.
      cantidad_actual_snapshot: unAlmacen ? unAlmacen.cantidad_actual : null,
      stockaje_minimo_snapshot: unAlmacen ? m.stockaje_minimo : null,
      motivo: "bajo minimo",
      notas: unAlmacen
        ? null
        : `Bajo mínimo (${m.stockaje_minimo} por almacén) en: ` +
          m.almacenes.map((a) => `${a.almacen_nombre} ${a.cantidad_actual}`).join(" · "),
    };
    setCarrito((prev) => [...prev, item]);
    setOrigenCarrito((prev) => ({
      ...prev,
      [m.material_id]: m.almacenes.map((a) => a.almacen_id),
    }));
  };

  const updateCartCantidad = (materialId: string, cantidad: number) =>
    setCarrito((prev) =>
      prev.map((c) => (c.material_id === materialId ? { ...c, cantidad } : c)),
    );
  const removeFromCart = (materialId: string) =>
    setCarrito((prev) => prev.filter((c) => c.material_id !== materialId));

  /**
   * Destino propuesto: el almacén filtrado o, si todo el carrito viene de un
   * mismo almacén, ese. Se puede cambiar en el diálogo.
   */
  const almacenPropuesto = useMemo(() => {
    if (alerts.filtros.almacenId !== "todos") return alerts.filtros.almacenId;
    const origenes = new Set(
      carrito.flatMap((c) => origenCarrito[c.material_id] ?? []),
    );
    const todosUnoSolo = carrito.every(
      (c) => (origenCarrito[c.material_id] ?? []).length === 1,
    );
    return todosUnoSolo && origenes.size === 1 ? [...origenes][0] : null;
  }, [alerts.filtros.almacenId, carrito, origenCarrito]);

  const handleCreate = async (data: SolicitudEnvioCreateData) => {
    const solicitud = await SolicitudEnvioService.create(data);
    toast({
      title: "Solicitud creada",
      description: `${solicitud.codigo} con ${data.materiales.length} material(es).`,
    });
    setCarrito([]);
    setOrigenCarrito({});
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

  const porAlmacen = alerts.filtros.almacenId !== "todos";

  return (
    // `minmax(0,...)` y `min-w-0`: sin ellos la tabla (cuyas celdas usan
    // `truncate`, o sea nowrap) impone su min-content a la columna `1fr` y
    // desborda la página entera en horizontal.
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
      <div className="min-w-0 space-y-3">
        <Card>
          <CardContent className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3">
            <Input
              placeholder="Buscar por código, nombre o descripción"
              value={alerts.filtros.q}
              onChange={(e) => alerts.updateFiltros({ q: e.target.value })}
            />
            <Select
              value={alerts.filtros.almacenId}
              onValueChange={(v) => alerts.updateFiltros({ almacenId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Almacén" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los almacenes</SelectItem>
                {alerts.almacenesDisponibles.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={alerts.filtros.enSolicitud}
              onValueChange={(v) =>
                alerts.updateFiltros({
                  enSolicitud: v as typeof alerts.filtros.enSolicitud,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="En solicitud" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Pedidos y sin pedir</SelectItem>
                <SelectItem value="sin-pedir">Solo sin pedir</SelectItem>
                <SelectItem value="pedidos">Solo ya pedidos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center justify-end gap-2">
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

        {alerts.error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {alerts.error}
          </div>
        )}

        <div className="min-w-0 border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Alerta</th>
                  <th className="text-left px-3 py-2 font-medium">Material</th>
                  <th className="text-right px-3 py-2 font-medium">Stock</th>
                  <th className="text-right px-3 py-2 font-medium" title="El mínimo se aplica en cada almacén por separado">
                    Mín. por almacén
                  </th>
                  <th className="text-right px-3 py-2 font-medium">Déficit</th>
                  <th className="text-left px-3 py-2 font-medium">En solicitud</th>
                  {/* Fija a la derecha: con la tabla más ancha que la columna,
                      los botones quedaban fuera de la vista. */}
                  <th className="sticky right-0 bg-slate-50 text-right px-3 py-2 font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-8">
                      Cargando…
                    </td>
                  </tr>
                ) : alerts.materiales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-8">
                      {alerts.verIgnoradas
                        ? "Sin alertas silenciadas."
                        : "No hay materiales bajo el mínimo con estos filtros."}
                    </td>
                  </tr>
                ) : (
                  alerts.materiales.map((m) => {
                    const enSol = m.solicitudes_activas.length > 0;
                    return (
                      <tr key={m.material_id} className="group hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <SeveridadBadge m={m} />
                        </td>
                        <td className="px-3 py-2 max-w-[18rem]">
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
                              <div className="text-sm text-slate-900 truncate" title={m.nombre}>
                                {m.nombre}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {m.almacenes.length === 0
                                  ? "Ningún almacén bajo mínimo"
                                  : m.almacenes.length === 1
                                    ? m.almacenes[0].almacen_nombre
                                    : `${m.almacenes.length} almacenes bajo mínimo`}
                                {m.um ? ` · ${m.um}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 align-middle">
                          <StockPorAlmacen m={m} />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {m.sin_alerta_actual ? "—" : m.stockaje_minimo}
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
                              className="bg-blue-50 text-blue-800 border-blue-200 whitespace-nowrap"
                            >
                              {m.solicitudes_activas.map((s) => s.codigo).join(", ")}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="sticky right-0 bg-white group-hover:bg-slate-50 px-3 py-2 text-right whitespace-nowrap">
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
                                  title="Silenciar alerta"
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <div>
            {alerts.total} material{alerts.total === 1 ? "" : "es"}
            {porAlmacen ? " en el almacén seleccionado" : ""}
            {alerts.totalPages > 1
              ? ` · página ${alerts.page} de ${alerts.totalPages}`
              : ""}
          </div>
          {alerts.totalPages > 1 && (
            <div className="max-w-full overflow-x-auto">
              <SmartPagination
                currentPage={alerts.page}
                totalPages={alerts.totalPages}
                onPageChange={alerts.setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* En pantallas estrechas el pedido va arriba: debajo de la tabla quedaba
          a casi 2000 px y no se veía lo que se iba añadiendo.
          El header del módulo es fijo y mide su alto en runtime; anclar el
          carrito a ese mismo valor evita que se meta por debajo al hacer scroll. */}
      <div className="min-w-0 order-first lg:order-none lg:sticky lg:top-[var(--content-with-fixed-header-padding,144px)] space-y-3">
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold flex items-center gap-1.5 min-w-0">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="truncate">Pedido en preparación</span>
              </div>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 whitespace-nowrap">
                {carrito.length} material{carrito.length === 1 ? "" : "es"}
              </Badge>
            </div>
            {carrito.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-3 lg:py-6">
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
                      <CantidadInput
                        value={c.cantidad}
                        onChange={(cantidad) => updateCartCantidad(c.material_id, cantidad)}
                        className="w-20 text-right h-7 text-xs"
                        aria-label={`Cantidad de ${c.material_codigo}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeFromCart(c.material_id)}
                        className="text-red-600 hover:text-red-700"
                        title="Quitar del pedido"
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
        almacenInicial={almacenPropuesto}
        onCreate={handleCreate}
      />
    </div>
  );
}
