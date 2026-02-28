"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import {
  AlertCircle,
  Barcode,
  Hand,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { Almacen, StockItem } from "@/lib/inventario-types";
import type { Material } from "@/lib/material-types";

type ModoRegistro = "scanner" | "manual";

interface SalidaLotePayload {
  items: Array<{ material_codigo: string; cantidad: number }>;
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
  um?: string;
  cantidad: string;
  yaEnStock?: boolean;
  stockAnterior?: number;
}

const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase();

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
    tipo === "entrada" ? "Entrada de almacén" : "Salida de almacén",
  );
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codigoRef = useRef<HTMLInputElement | null>(null);
  const cantidadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const materialesOrdenados = useMemo(() => {
    return [...materiales].sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo)),
    );
  }, [materiales]);

  const sugerencias = useMemo(() => {
    if (modo !== "manual") return [];
    const term = normalizarCodigo(codigoInput);
    if (!term) return [];
    return materialesOrdenados
      .filter((material) =>
        normalizarCodigo(String(material.codigo)).includes(term),
      )
      .slice(0, 8);
  }, [codigoInput, materialesOrdenados, modo]);

  const resumen = useMemo(() => {
    const materiales = items.length;
    const cantidadTotal = items.reduce((acc, item) => {
      const cantidad = Number(item.cantidad);
      return acc + (Number.isFinite(cantidad) ? cantidad : 0);
    }, 0);
    return { materiales, cantidadTotal };
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

  const enfocarCodigo = () => {
    if (!codigoRef.current) return;
    codigoRef.current.focus();
    codigoRef.current.select();
  };

  const agregarMaterialPorCodigo = (codigo: string) => {
    const codigoNormalizado = normalizarCodigo(codigo);
    if (!codigoNormalizado) {
      setError("Introduce un código de material");
      return;
    }

    const material = materiales.find(
      (item) => normalizarCodigo(String(item.codigo)) === codigoNormalizado,
    );
    if (!material) {
      setError(`No existe el material con código ${codigo}`);
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
        material_descripcion: material.descripcion || "Sin descripción",
        um: material.um,
        cantidad: "1",
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
    agregarMaterialPorCodigo(codigoInput);
  };

  const actualizarCantidad = (codigo: string, cantidad: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.material_codigo === codigo
          ? {
              ...item,
              cantidad,
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
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError(`Cantidad inválida para ${item.material_codigo}`);
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
              Selecciona cómo vas a capturar los materiales para la{" "}
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
                Escáner
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Cada escaneo agrega el material. Si repites código, suma
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
                Manual por código
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Escribe o busca el código del material y agrega los ítems al
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
                ? "Escanear código de material *"
                : "Código de material *"}
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
                    ? "Escanea el código y presiona Enter"
                    : "Escribe el código y selecciona el material"
                }
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {modo === "scanner"
                ? "Escanea y presiona Enter. Si escaneas el mismo material más de una vez, la cantidad se incrementa automáticamente."
                : "Escribe el código y presiona Enter, o selecciónalo de la lista para agregarlo al lote."}
            </p>

            {modo === "manual" && sugerencias.length > 0 ? (
              <div className="mt-2 rounded-md border bg-white">
                {sugerencias.map((material) => (
                  <button
                    type="button"
                    key={material.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => {
                      agregarMaterialPorCodigo(String(material.codigo));
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
                  Código
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Material
                </th>
                <th className="text-left py-2 px-3 text-sm font-semibold text-gray-900">
                  Unidad
                </th>
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
                    colSpan={tipo === "entrada" ? 6 : 5}
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
                      {item.material_descripcion}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700">
                      {item.um || "-"}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-700 w-[140px]">
                      <Input
                        ref={(element) => {
                          cantidadRefs.current[item.material_codigo] = element;
                        }}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(event) =>
                          actualizarCantidad(
                            item.material_codigo,
                            event.target.value,
                          )
                        }
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
                            Nuevo en este almacén
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
            Materiales:{" "}
            <span className="font-semibold">{resumen.materiales}</span>
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
                  ? "Recepción, ajuste, compra, etc."
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
              placeholder="Requisición o documento"
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
