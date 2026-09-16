"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, GripVertical, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { cn } from "@/lib/utils";
import { InputConSugerencias } from "@/components/shared/molecule/input-con-sugerencias";
import {
  BLOQUES_SEMILLA,
  LOCALES_SEMILLA,
  MATERIALES_SEMILLA,
  combinarConSemilla,
} from "@/lib/services/feats/presupuesto-logistica/sugerencias-semilla";
import { TablaTotales } from "./tabla-totales";
import type { Sede } from "@/lib/types/feats/sedes/sede-types";
import type {
  ItemPresupuesto,
  MonedaPresupuesto,
  PresupuestoCreateData,
  PresupuestoLogistica,
  PresupuestoUpdateData,
  SugerenciasPresupuesto,
  TipoPresupuesto,
  TotalesPresupuesto,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";
import {
  MESES_ES,
  TITULO_PRESUPUESTO_POR_DEFECTO,
} from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

const SIN_SEDE = "__libre__";

interface ItemBorrador {
  numero: number;
  local: string;
  actividad: string;
  material: string;
  cantidad_um: string;
  importe: string;
  moneda: MonedaPresupuesto;
  estadoPrevio: ItemPresupuesto["estado"];
}

interface SedeBorrador {
  orden: number;
  sede_id: string | null;
  sede_nombre: string;
  items: ItemBorrador[];
}

const itemVacio = (numero: number): ItemBorrador => ({
  numero,
  local: "",
  actividad: "",
  material: "",
  cantidad_um: "",
  importe: "",
  moneda: "CUP",
  estadoPrevio: "pendiente",
});

const aBorrador = (presupuesto: PresupuestoLogistica): SedeBorrador[] =>
  [...presupuesto.sedes]
    .sort((a, b) => a.orden - b.orden)
    .map((sede) => ({
      orden: sede.orden,
      sede_id: sede.sede_id,
      sede_nombre: sede.sede_nombre,
      items: sede.items.map((item) => ({
        numero: item.numero,
        local: item.local ?? "",
        actividad: item.actividad ?? "",
        material: item.material,
        cantidad_um: item.cantidad_um ?? "",
        importe: item.importe === null ? "" : String(item.importe),
        moneda: item.moneda ?? "CUP",
        estadoPrevio: item.estado,
      })),
    }));

const numeroODefecto = (valor: string): number | null => {
  const limpio = valor.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  presupuesto: PresupuestoLogistica | null;
  sedes: Sede[];
  sugerencias: SugerenciasPresupuesto;
  guardando: boolean;
  onCrear: (data: PresupuestoCreateData) => Promise<unknown>;
  onActualizar: (id: string, data: PresupuestoUpdateData) => Promise<unknown>;
}

export function PresupuestoEditorDialog({
  abierto,
  onCerrar,
  presupuesto,
  sedes,
  sugerencias,
  guardando,
  onCrear,
  onActualizar,
}: Props) {
  const esEdicion = presupuesto !== null;
  const hoy = useMemo(() => new Date(), []);

  const [titulo, setTitulo] = useState(TITULO_PRESUPUESTO_POR_DEFECTO);
  const [tipo, setTipo] = useState<TipoPresupuesto>("ordinario");
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [tasa, setTasa] = useState("");
  const [bloques, setBloques] = useState<SedeBorrador[]>([]);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (presupuesto) {
      setTitulo(presupuesto.titulo);
      setTipo(presupuesto.tipo);
      setMes(presupuesto.mes);
      setAnio(presupuesto.anio);
      setTasa(String(presupuesto.tasa_cup_por_usd));
      setBloques(aBorrador(presupuesto));
    } else {
      setTitulo(TITULO_PRESUPUESTO_POR_DEFECTO);
      setTipo("ordinario");
      setMes(hoy.getMonth() + 1);
      setAnio(hoy.getFullYear());
      setTasa("");
      setBloques([]);
    }
    setErrorLocal(null);
  }, [abierto, presupuesto, hoy]);

  const tasaNum = numeroODefecto(tasa);

  // Previsualización con la misma fórmula que el backend: usd = cup / tasa.
  const totalesPreview: TotalesPresupuesto | null = useMemo(() => {
    if (!tasaNum || tasaNum <= 0) return null;
    const porSede = bloques.map((bloque) => {
      let usd = 0;
      let cup = 0;
      for (const item of bloque.items) {
        const importe = numeroODefecto(item.importe);
        if (importe === null) continue;
        if (item.moneda === "USD") usd += importe;
        else cup += importe;
      }
      return {
        orden: bloque.orden,
        sede_id: bloque.sede_id,
        sede_nombre: bloque.sede_nombre || "(sin nombre)",
        es_sede_registrada: bloque.sede_id !== null,
        total_usd: Number(usd.toFixed(2)),
        total_cup: Number(cup.toFixed(2)),
        total_en_usd: Number((usd + cup / tasaNum).toFixed(2)),
        cantidad_items: bloque.items.length,
      };
    });
    const totalUsd = Number(porSede.reduce((s, x) => s + x.total_usd, 0).toFixed(2));
    const totalCup = Number(porSede.reduce((s, x) => s + x.total_cup, 0).toFixed(2));
    const cupEnUsd = Number((totalCup / tasaNum).toFixed(2));
    return {
      por_sede: porSede,
      total_usd: totalUsd,
      total_cup: totalCup,
      total_cup_en_usd: cupEnUsd,
      total_general_usd: Number((totalUsd + cupEnUsd).toFixed(2)),
      tasa_cup_por_usd: tasaNum,
      layout_tabla: porSede.length <= 6 ? "ancha" : "transpuesta",
    };
  }, [bloques, tasaNum]);

  const agregarBloque = () => {
    setBloques((prev) => [
      ...prev,
      {
        orden: prev.length + 1,
        sede_id: null,
        sede_nombre: "",
        items: [itemVacio(1)],
      },
    ]);
  };

  const quitarBloque = (indice: number) => {
    setBloques((prev) =>
      prev.filter((_, i) => i !== indice).map((b, i) => ({ ...b, orden: i + 1 })),
    );
  };

  const cambiarBloque = (indice: number, cambios: Partial<SedeBorrador>) => {
    setBloques((prev) =>
      prev.map((b, i) => (i === indice ? { ...b, ...cambios } : b)),
    );
  };

  const agregarItem = (indiceBloque: number) => {
    setBloques((prev) =>
      prev.map((b, i) =>
        i === indiceBloque
          ? { ...b, items: [...b.items, itemVacio(b.items.length + 1)] }
          : b,
      ),
    );
  };

  const quitarItem = (indiceBloque: number, indiceItem: number) => {
    setBloques((prev) =>
      prev.map((b, i) =>
        i === indiceBloque
          ? {
              ...b,
              items: b.items
                .filter((_, j) => j !== indiceItem)
                .map((it, j) => ({ ...it, numero: j + 1 })),
            }
          : b,
      ),
    );
  };

  const cambiarItem = (
    indiceBloque: number,
    indiceItem: number,
    cambios: Partial<ItemBorrador>,
  ) => {
    setBloques((prev) =>
      prev.map((b, i) =>
        i === indiceBloque
          ? {
              ...b,
              items: b.items.map((it, j) =>
                j === indiceItem ? { ...it, ...cambios } : it,
              ),
            }
          : b,
      ),
    );
  };

  const validar = (): string | null => {
    if (!tasaNum || tasaNum <= 0) return "Escribe la tasa de cambio (CUP por 1 USD).";
    if (tasaNum < 50 || tasaNum > 2000) {
      return `La tasa ${tasaNum} está fuera de lo razonable (50–2000 CUP por USD). Revisa que no sea un error de tecleo.`;
    }
    if (bloques.length === 0) return "Agrega al menos un bloque.";
    for (const bloque of bloques) {
      if (!bloque.sede_nombre.trim()) return "Todos los bloques necesitan nombre.";
      if (bloque.items.length === 0) {
        return `El bloque "${bloque.sede_nombre}" no tiene ítems.`;
      }
      for (const item of bloque.items) {
        if (!item.material.trim()) {
          return `El ítem ${item.numero} de "${bloque.sede_nombre}" no tiene material.`;
        }
        if (item.importe.trim() && numeroODefecto(item.importe) === null) {
          return `El importe del ítem ${item.numero} de "${bloque.sede_nombre}" no es un número válido.`;
        }
      }
    }
    return null;
  };

  const guardar = async () => {
    const problema = validar();
    if (problema) {
      setErrorLocal(problema);
      return;
    }
    setErrorLocal(null);

    const sedesPayload = bloques.map((bloque) => ({
      orden: bloque.orden,
      sede_id: bloque.sede_id,
      sede_nombre: bloque.sede_nombre.trim(),
      items: bloque.items.map((item) => {
        const importe = numeroODefecto(item.importe);
        return {
          numero: item.numero,
          local: item.local.trim() || null,
          actividad: item.actividad.trim() || null,
          material: item.material.trim(),
          cantidad_um: item.cantidad_um.trim() || null,
          importe,
          moneda: importe === null ? null : item.moneda,
        };
      }),
    }));

    try {
      if (esEdicion && presupuesto) {
        await onActualizar(presupuesto.id, {
          titulo: titulo.trim(),
          tasa_cup_por_usd: tasaNum as number,
          sedes: sedesPayload,
        });
      } else {
        await onCrear({
          titulo: titulo.trim(),
          tipo,
          mes,
          anio,
          tasa_cup_por_usd: tasaNum as number,
          sedes: sedesPayload,
        });
      }
      onCerrar();
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  // Historial real del módulo primero; la semilla del presupuesto de
  // septiembre rellena mientras no haya meses cargados.
  const materialesSugeridos = useMemo(
    () => combinarConSemilla(sugerencias.materiales, MATERIALES_SEMILLA),
    [sugerencias.materiales],
  );
  const localesSugeridos = useMemo(
    () => combinarConSemilla(sugerencias.locales, LOCALES_SEMILLA),
    [sugerencias.locales],
  );
  const bloquesSugeridos = useMemo(
    () => combinarConSemilla(sugerencias.sedes_libres, BLOQUES_SEMILLA),
    [sugerencias.sedes_libres],
  );

  const sedesUnicas = useMemo(() => {
    // La colección tiene nombres repetidos; se deduplica para que el desplegable
    // no muestre dos veces la misma sede.
    const vistas = new Set<string>();
    return sedes.filter((sede) => {
      const clave = sede.nombre.trim().toLowerCase();
      if (!clave || vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  }, [sedes]);

  const hayAprobadosCongelados = bloques.some((b) =>
    b.items.some((i) => i.estadoPrevio === "aprobado"),
  );

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? `Editar ${presupuesto?.numero}` : "Nuevo presupuesto"}
          </DialogTitle>
          <DialogDescription>
            El importe de cada línea es el total ya calculado. La cantidad y la
            unidad van juntas en un solo campo: &quot;6 galones&quot;, &quot;2 sacos&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-4">
              <Label htmlFor="titulo">Título del documento</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            {!esEdicion && (
              <>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={tipo}
                    onValueChange={(v) => setTipo(v as TipoPresupuesto)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinario">Ordinario del mes</SelectItem>
                      <SelectItem value="extraordinario">Extraordinario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mes</Label>
                  <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES_ES.map((nombre, i) => (
                        <SelectItem key={nombre} value={String(i + 1)}>
                          {nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="anio">Año</Label>
                  <Input
                    id="anio"
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            <div className={esEdicion ? "md:col-span-2" : ""}>
              <Label htmlFor="tasa">Tasa de cambio (CUP por 1 USD)</Label>
              <Input
                id="tasa"
                inputMode="decimal"
                placeholder="670"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Queda estampada en el documento: el total aprobado no cambia
                aunque la tasa suba después.
              </p>
            </div>
          </div>

          {hayAprobadosCongelados && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Los ítems ya aprobados conservan su aprobación mientras no los
                toques. Si cambias uno, vuelve a revisión.
              </span>
            </div>
          )}

          <div className="space-y-4">
            {bloques.map((bloque, indiceBloque) => (
              <div
                key={`bloque-${indiceBloque}`}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-3 flex flex-wrap items-end gap-2">
                  <GripVertical className="mb-2 h-4 w-4 text-slate-300" />
                  <div className="min-w-[220px] flex-1">
                    <Label>Sede o bloque</Label>
                    <Select
                      value={bloque.sede_id ?? SIN_SEDE}
                      onValueChange={(valor) => {
                        if (valor === SIN_SEDE) {
                          cambiarBloque(indiceBloque, { sede_id: null });
                          return;
                        }
                        const sede = sedesUnicas.find((s) => s.id === valor);
                        cambiarBloque(indiceBloque, {
                          sede_id: valor,
                          sede_nombre: sede?.nombre ?? bloque.sede_nombre,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Elige una sede" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_SEDE}>
                          Escribir un nombre libre
                        </SelectItem>
                        {sedesUnicas.map((sede) => (
                          <SelectItem key={sede.id} value={sede.id}>
                            {sede.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <Label>Nombre en el documento</Label>
                    <InputConSugerencias
                      value={bloque.sede_nombre}
                      disabled={bloque.sede_id !== null}
                      placeholder="Ej: Inversiones Almacen calle 30"
                      sugerencias={bloquesSugeridos}
                      onValueChange={(valor) =>
                        cambiarBloque(indiceBloque, { sede_nombre: valor })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => quitarBloque(indiceBloque)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="w-10 pb-1">No.</th>
                        <th className="pb-1">Local / Área</th>
                        <th className="pb-1">Material</th>
                        <th className="w-28 pb-1">Cantidad y U/M</th>
                        <th className="w-28 pb-1">Importe</th>
                        <th className="w-24 pb-1">Moneda</th>
                        <th className="w-10 pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {bloque.items.map((item, indiceItem) => {
                        const congelado = item.estadoPrevio === "aprobado";
                        return (
                          <tr key={`item-${indiceBloque}-${indiceItem}`}>
                            <td className="py-1 pr-1 text-xs text-slate-500">
                              {item.numero}
                            </td>
                            <td className="py-1 pr-1">
                              <InputConSugerencias
                                value={item.local}
                                sugerencias={localesSugeridos}
                                onValueChange={(valor) =>
                                  cambiarItem(indiceBloque, indiceItem, {
                                    local: valor,
                                  })
                                }
                              />
                            </td>
                            <td className="py-1 pr-1">
                              <InputConSugerencias
                                value={item.material}
                                sugerencias={materialesSugeridos}
                                placeholder="Cemento, Split 1T, Mano de Obra…"
                                className={cn(congelado && "[&_input]:border-emerald-300")}
                                onValueChange={(valor) =>
                                  cambiarItem(indiceBloque, indiceItem, {
                                    material: valor,
                                  })
                                }
                              />
                            </td>
                            <td className="py-1 pr-1">
                              <Input
                                className="h-8"
                                placeholder="6 galones"
                                value={item.cantidad_um}
                                onChange={(e) =>
                                  cambiarItem(indiceBloque, indiceItem, {
                                    cantidad_um: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-1 pr-1">
                              <Input
                                className="h-8 text-right"
                                inputMode="decimal"
                                value={item.importe}
                                onChange={(e) =>
                                  cambiarItem(indiceBloque, indiceItem, {
                                    importe: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-1 pr-1">
                              <Select
                                value={item.moneda}
                                onValueChange={(v) =>
                                  cambiarItem(indiceBloque, indiceItem, {
                                    moneda: v as MonedaPresupuesto,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CUP">CUP</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-slate-400 hover:text-rose-600"
                                onClick={() => quitarItem(indiceBloque, indiceItem)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => agregarItem(indiceBloque)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Agregar ítem
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={agregarBloque}>
              <Plus className="mr-1 h-4 w-4" /> Agregar bloque
            </Button>
          </div>

          {totalesPreview && totalesPreview.por_sede.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Presupuesto Total
              </h4>
              <TablaTotales totales={totalesPreview} />
            </div>
          )}

          {errorLocal && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorLocal}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
