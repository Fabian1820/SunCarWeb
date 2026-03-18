"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  AlertCircle,
  Barcode,
  Hand,
  Loader2,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import type { Almacen, StockItem } from "@/lib/inventario-types";
import type { Material } from "@/lib/material-types";
import { MaterialService } from "@/lib/api-services";

type ModoRegistro = "scanner" | "manual";

interface SalidaLotePayload {
  items: Array<{
    material_codigo: string;
    cantidad: number;
    origen_captura: "scanner" | "manual";
    estado: string;
    ubicacion_en_almacen?: string;
  }>;
  motivo?: string;
  referencia?: string;
}

interface SalidaLoteFormProps {
  tipo: "entrada" | "salida";
  almacen: Almacen;
  materiales: Material[];
  stockActual?: StockItem[];
  onSubmit: (payload: SalidaLotePayload) => Promise<void> | void;
  onCancel: () => void;
}

interface SalidaLoteItem {
  material_codigo: string;
  material_descripcion: string;
  material_foto?: string;
  um?: string;
  cantidad: string;
  origen_captura: "scanner" | "manual";
  estado: string;
  ubicacion_en_almacen?: string | null;
  yaEnStock?: boolean;
  stockAnterior?: number;
}

const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase();
const normalizarTexto = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

export function SalidaLoteForm({
  tipo,
  almacen,
  materiales,
  stockActual,
  onSubmit,
  onCancel,
}: SalidaLoteFormProps) {
  const [modo, setModo] = useState<ModoRegistro>("scanner");
  const [codigoInput, setCodigoInput] = useState("");
  const [items, setItems] = useState<SalidaLoteItem[]>([]);
  const [motivo, setMotivo] = useState(
    tipo === "entrada" ? "Entrada de almacen" : "Salida de almacen",
  );
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sugerenciasRemotas, setSugerenciasRemotas] = useState<Material[]>([]);
  const codigoRef = useRef<HTMLInputElement | null>(null);
  const cantidadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const materialesPorCodigo = useMemo(() => {
    const map = new Map<string, Material>();
    for (const material of materiales) {
      const codigo = normalizarCodigo(String(material.codigo));
      if (!codigo) continue;
      map.set(codigo, material);
    }
    return map;
  }, [materiales]);

  const materialesOrdenados = useMemo(() => {
    return [...materiales].sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo)),
    );
  }, [materiales]);

  useEffect(() => {
    let active = true;

    const loadSuggestions = async () => {
      if (modo !== "manual") {
        setSugerenciasRemotas([]);
        return;
      }

      const term = codigoInput.trim();
      if (!term) {
        setSugerenciasRemotas([]);
        return;
      }

      setIsSearching(true);
      try {
        const result = await MaterialService.searchMaterialsByCode(term, 8);
        if (!active) return;
        setSugerenciasRemotas(Array.isArray(result) ? result : []);
      } catch {
        if (!active) return;
        setSugerenciasRemotas([]);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    void loadSuggestions();

    return () => {
      active = false;
    };
  }, [codigoInput, modo]);

  const sugerencias = useMemo(() => {
    if (modo !== "manual") return [];
    const term = normalizarCodigo(codigoInput);
    if (!term) return [];

    const locales = materialesOrdenados.filter((material) => {
      const codigo = normalizarCodigo(String(material.codigo));
      const nombre = normalizarTexto(material.nombre);
      const descripcion = normalizarTexto(material.descripcion);
      return (
        codigo.includes(term) ||
        nombre.includes(term) ||
        descripcion.includes(term)
      );
    });

    const merged = [...sugerenciasRemotas, ...locales];
    const uniques = new Map<string, Material>();
    for (const material of merged) {
      const codigo = normalizarCodigo(String(material.codigo));
      if (!codigo || uniques.has(codigo)) continue;
      uniques.set(codigo, material);
      if (uniques.size >= 8) break;
    }
    return Array.from(uniques.values());
  }, [codigoInput, materialesOrdenados, modo, sugerenciasRemotas]);

  const resumen = useMemo(() => {
    const materialesDistintos = items.length;
    const cantidadTotal = items.reduce((acc, item) => {
      const cantidad = Number(item.cantidad);
      return acc + (Number.isFinite(cantidad) ? cantidad : 0);
    }, 0);
    return { materialesDistintos, cantidadTotal };
  }, [items]);

  const stockPorCodigo = useMemo(() => {
    const map = new Map<string, number>();
    if (tipo !== "entrada") return map;
    for (const item of stockActual || []) {
      const key = normalizarCodigo(String(item.material_codigo || ""));
      if (!key) continue;
      map.set(key, Number(item.cantidad || 0));
    }
    return map;
  }, [stockActual, tipo]);

  const ubicacionPorCodigo = useMemo(() => {
    const map = new Map<string, string | null>();
    if (tipo !== "entrada") return map;
    for (const item of stockActual || []) {
      const key = normalizarCodigo(String(item.material_codigo || ""));
      if (!key) continue;
      map.set(key, item.ubicacion_en_almacen ?? null);
    }
    return map;
  }, [stockActual, tipo]);

  const enfocarCodigo = () => {
    if (!codigoRef.current) return;
    codigoRef.current.focus();
    codigoRef.current.select();
  };

  const resolverMaterialPorCodigo = async (
    codigo: string,
  ): Promise<Material | null> => {
    const term = normalizarCodigo(codigo);
    if (!term) return null;

    const localByCode = materialesPorCodigo.get(term);
    if (localByCode) return localByCode;

    const localByName = materialesOrdenados.find((item) => {
      const nombre = normalizarTexto(item.nombre);
      const descripcion = normalizarTexto(item.descripcion);
      const codigoMaterial = normalizarCodigo(String(item.codigo));
      return (
        nombre === term ||
        descripcion === term ||
        codigoMaterial.includes(term) ||
        nombre.includes(term) ||
        descripcion.includes(term)
      );
    });
    if (localByName) return localByName;

    try {
      const response = await MaterialService.searchMaterialsByCode(codigo, 10);
      const exact = response.find(
        (item) => normalizarCodigo(String(item.codigo)) === term,
      );
      return exact || response[0] || null;
    } catch {
      return null;
    }
  };

  const agregarMaterialPorCodigo = async (codigo: string) => {
    const codigoNormalizado = normalizarCodigo(codigo);
    if (!codigoNormalizado) {
      setError("Introduce un codigo de material");
      return;
    }

    const material = await resolverMaterialPorCodigo(codigo);
    if (!material) {
      setError(`No existe el material con codigo ${codigo}`);
      return;
    }

    const codigoMaterial = String(material.codigo);
    const existente = items.find(
      (item) =>
        normalizarCodigo(item.material_codigo) ===
        normalizarCodigo(codigoMaterial),
    );

    if (existente) {
      if (modo === "scanner") {
        setItems((prev) =>
          prev.map((item) => {
            if (item.material_codigo !== codigoMaterial) return item;
            const cantidadActual = Number(item.cantidad);
            const siguienteCantidad = Number.isFinite(cantidadActual)
              ? cantidadActual + 1
              : 1;
            return {
              ...item,
              cantidad: String(siguienteCantidad),
              origen_captura: "scanner",
            };
          }),
        );
        setCodigoInput("");
        setError(null);
        setTimeout(() => {
          enfocarCodigo();
        }, 0);
        return;
      }

      setError(null);
      setCodigoInput("");
      const inputCantidad = cantidadRefs.current[codigoMaterial];
      inputCantidad?.focus();
      inputCantidad?.select();
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        material_codigo: codigoMaterial,
        material_descripcion: material.descripcion || "Sin descripcion",
        material_foto: material.foto,
        um: material.um,
        cantidad: "1",
        origen_captura: modo,
        estado: "nuevo",
        ubicacion_en_almacen:
          tipo === "entrada"
            ? (ubicacionPorCodigo.get(normalizarCodigo(codigoMaterial)) ?? null)
            : null,
        yaEnStock:
          tipo === "entrada"
            ? stockPorCodigo.has(normalizarCodigo(codigoMaterial))
            : undefined,
        stockAnterior:
          tipo === "entrada"
            ? (stockPorCodigo.get(normalizarCodigo(codigoMaterial)) ?? 0)
            : undefined,
      },
    ]);
    setError(null);
    setCodigoInput("");
    setTimeout(() => {
      if (modo === "scanner") {
        enfocarCodigo();
      } else {
        cantidadRefs.current[codigoMaterial]?.focus();
        cantidadRefs.current[codigoMaterial]?.select();
      }
    }, 0);
  };

  const handleKeyDownCodigo = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void agregarMaterialPorCodigo(codigoInput);
  };

  const actualizarCantidad = (codigo: string, cantidad: string) => {
    const clean = cantidad.replace(/[^\d]/g, "");
    const normalized =
      clean === "" ? "" : String(Math.max(1, Number.parseInt(clean, 10)));
    setItems((prev) =>
      prev.map((item) =>
        item.material_codigo === codigo
          ? {
              ...item,
              cantidad: normalized,
            }
          : item,
      ),
    );
  };

  const actualizarEstado = (codigo: string, estado: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.material_codigo === codigo
          ? {
              ...item,
              estado,
            }
          : item,
      ),
    );
  };

  const actualizarUbicacion = (codigo: string, ubicacion: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.material_codigo === codigo
          ? {
              ...item,
              ubicacion_en_almacen: ubicacion.trim() || null,
            }
          : item,
      ),
    );
  };

  const eliminarItem = (codigo: string) => {
    setItems((prev) => prev.filter((item) => item.material_codigo !== codigo));
  };

  const validar = () => {
    if (items.length === 0) {
      setError(
        `Agrega al menos un material para registrar la ${tipo === "entrada" ? "entrada" : "salida"}`,
      );
      return false;
    }

    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isInteger(cantidad)
      ) {
        setError(`Cantidad invalida para ${item.material_codigo}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validar()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        items: items.map((item) => ({
          material_codigo: item.material_codigo,
          cantidad: Number(item.cantidad),
          origen_captura: item.origen_captura,
          estado: item.estado || "nuevo",
          ...(tipo === "entrada" && item.ubicacion_en_almacen
            ? { ubicacion_en_almacen: item.ubicacion_en_almacen }
            : {}),
        })),
        motivo: motivo.trim() || undefined,
        referencia: referencia.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No se pudo registrar la ${tipo === "entrada" ? "entrada" : "salida"} por lote`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Almacen
          </Label>
          <div className="rounded-md border px-3 py-2 text-sm text-gray-700 bg-gray-50">
            {almacen.nombre}
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
          <div>
            <Label className="text-sm font-medium text-gray-700 block">
              Forma de registro de {tipo === "entrada" ? "entrada" : "salida"}
            </Label>
            <p className="text-xs text-gray-600 mt-1">
              Selecciona como vas a capturar los materiales para la{" "}
              {tipo === "entrada" ? "entrada" : "salida"}.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModo("scanner")}
              className={`rounded-md border p-3 text-left transition-colors ${
                modo === "scanner"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Barcode className="h-4 w-4" />
                Escaner
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Cada escaneo agrega el material. Si repites codigo, suma
                cantidad.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setModo("manual")}
              className={`rounded-md border p-3 text-left transition-colors ${
                modo === "manual"
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Hand className="h-4 w-4" />
                Manual por codigo
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Escribe o busca el codigo del material y agrega los items al
                lote de {tipo === "entrada" ? "entrada" : "salida"}.
              </p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label
              htmlFor="salida-lote-codigo"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              {modo === "scanner"
                ? "Escanear codigo de material *"
                : "Codigo de material *"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="salida-lote-codigo"
                ref={codigoRef}
                autoFocus
                value={codigoInput}
                onChange={(event) => setCodigoInput(event.target.value)}
                onKeyDown={handleKeyDownCodigo}
                placeholder={
                  modo === "scanner"
                    ? "Escanea el codigo y presiona Enter"
                    : "Escribe codigo o nombre y selecciona el material"
                }
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void agregarMaterialPorCodigo(codigoInput)}
              >
                Agregar
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {modo === "scanner"
                ? "Escanea y presiona Enter. Si escaneas el mismo material mas de una vez, la cantidad se incrementa automaticamente."
                : "Escribe codigo o nombre y presiona Enter, o seleccionalo de la lista para agregarlo al lote."}
            </p>

            {modo === "manual" && isSearching ? (
              <p className="text-xs text-gray-500 mt-2">
                Buscando materiales...
              </p>
            ) : null}

            {modo === "manual" && sugerencias.length > 0 ? (
              <div className="mt-2 rounded-md border bg-white">
                {sugerencias.map((material) => (
                  <button
                    type="button"
                    key={material.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => {
                      void agregarMaterialPorCodigo(String(material.codigo));
                      enfocarCodigo();
                    }}
                  >
                    <span className="font-medium">{material.codigo}</span>
                    <span className="text-gray-600">
                      {" "}
                      - {material.descripcion}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Codigo
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Material
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Unidad
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Origen captura
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Estado
                </th>
                {tipo === "entrada" ? (
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                    Ubicación en almacén
                  </th>
                ) : null}
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Cantidad
                </th>
                {tipo === "entrada" ? (
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                    Estado en stock
                  </th>
                ) : null}
                <th className="text-right py-2 px-3 text-sm font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={tipo === "entrada" ? 9 : 7}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    No hay materiales agregados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.material_codigo}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-2 px-3 text-sm font-medium text-gray-900">
                      {item.material_codigo}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        {item.material_foto ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden border border-gray-200 bg-white shrink-0">
                            <img
                              src={item.material_foto}
                              alt={
                                item.material_descripcion ||
                                item.material_codigo
                              }
                              className="w-full h-full object-contain p-0.5"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-amber-100 border border-amber-200 shrink-0 flex items-center justify-center">
                            <Package className="h-4 w-4 text-amber-700" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate">
                            {item.material_descripcion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700">
                      {item.um || "-"}
                    </td>
                    <td className="py-2 px-3 text-sm">
                      {item.origen_captura === "scanner" ? (
                        <span className="inline-flex rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 text-xs">
                          scanner
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-xs">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm min-w-[140px]">
                      <Select
                        value={item.estado}
                        onValueChange={(value) =>
                          actualizarEstado(item.material_codigo, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo">Nuevo</SelectItem>
                          <SelectItem value="usado">Usado</SelectItem>
                          <SelectItem value="reacondicionado">
                            Reacondicionado
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    {tipo === "entrada" ? (
                      <td className="py-2 px-3 text-sm min-w-[180px]">
                        <Input
                          value={item.ubicacion_en_almacen ?? ""}
                          onChange={(event) =>
                            actualizarUbicacion(
                              item.material_codigo,
                              event.target.value,
                            )
                          }
                          placeholder={
                            item.ubicacion_en_almacen === null
                              ? "Sin ubicación"
                              : "Ej: Pasillo 3, Estante B"
                          }
                        />
                      </td>
                    ) : null}
                    <td className="py-2 px-3 text-sm text-gray-700 min-w-[100px]">
                      <Input
                        ref={(element) => {
                          cantidadRefs.current[item.material_codigo] = element;
                        }}
                        type="number"
                        min="1"
                        step="1"
                        value={item.cantidad}
                        onChange={(event) =>
                          actualizarCantidad(
                            item.material_codigo,
                            event.target.value,
                          )
                        }
                        className="w-full"
                      />
                    </td>
                    {tipo === "entrada" ? (
                      <td className="py-2 px-3 text-sm">
                        {item.yaEnStock ? (
                          <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs">
                            Ya en stock (actual: {item.stockAnterior ?? 0})
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 text-xs">
                            Nuevo en este almacen
                          </span>
                        )}
                      </td>
                    ) : null}
                    <td className="py-2 px-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarItem(item.material_codigo)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Quitar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Resumen del lote</p>
          <p className="text-sm text-gray-900 mt-2">
            Materiales distintos:{" "}
            <span className="font-semibold">{resumen.materialesDistintos}</span>
          </p>
          <p className="text-sm text-gray-900 mt-1">
            Cantidad total:{" "}
            <span className="font-semibold">{resumen.cantidadTotal}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="salida-lote-motivo"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Motivo
            </Label>
            <Input
              id="salida-lote-motivo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder={
                tipo === "entrada"
                  ? "Recepcion, ajuste, compra, etc."
                  : "Consumo interno, salida por obra, etc."
              }
            />
          </div>
          <div>
            <Label
              htmlFor="salida-lote-referencia"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Referencia
            </Label>
            <Input
              id="salida-lote-referencia"
              value={referencia}
              onChange={(event) => setReferencia(event.target.value)}
              placeholder="Requisicion o documento"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || items.length === 0}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Registrar {tipo === "entrada" ? "entrada" : "salida"} por lote
        </Button>
      </div>
    </form>
  );
}
