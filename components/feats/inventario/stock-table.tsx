"use client";

import { Button } from "@/components/shared/atom/button";
import { Package, Pencil } from "lucide-react";
import type { StockItem } from "@/lib/inventario-types";
import type { Material } from "@/lib/material-types";

interface MarcaItem {
  id: string;
  nombre: string;
}

interface StockTableProps {
  stock: StockItem[];
  onEditStock?: (item: StockItem) => void;
  detailed?: boolean;
  materials?: Material[];
  marcas?: MarcaItem[];
  almacenNombreFallback?: string;
}

const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase();

export function StockTable({
  stock,
  onEditStock,
  detailed = false,
  materials = [],
  marcas = [],
  almacenNombreFallback,
}: StockTableProps) {
  if (stock.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sin stock disponible
        </h3>
        <p className="text-gray-600">
          Registra movimientos para ver el inventario actualizado.
        </p>
      </div>
    );
  }

  const materialPorCodigo = new Map<string, Material>();
  for (const material of materials) {
    materialPorCodigo.set(normalizarCodigo(String(material.codigo)), material);
  }

  const marcaPorId = new Map<string, string>();
  for (const marca of marcas) {
    marcaPorId.set(marca.id, marca.nombre);
  }

  if (detailed) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[80px]">
                Foto
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900">
                Nombre
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">
                Código
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">
                Potencia
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[130px]">
                Marca
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">
                Categoría
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[150px]">
                Cantidad en stock
              </th>
              {onEditStock ? (
                <th className="text-right py-3 px-2 font-semibold text-gray-900 w-[130px]">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {stock.map((item, index) => {
              const material = materialPorCodigo.get(
                normalizarCodigo(String(item.material_codigo || "")),
              );
              const marcaNombre = material?.marca_id
                ? (marcaPorId.get(material.marca_id) ??
                  `ID: ${material.marca_id.slice(0, 6)}`)
                : null;
              const nombreMaterial =
                material?.nombre ||
                material?.descripcion ||
                item.material_descripcion ||
                "Sin nombre";

              return (
                <tr
                  key={
                    item.id ||
                    `${item.almacen_id}-${item.material_codigo}-${index}`
                  }
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-2">
                    {material?.foto ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                        <img
                          src={material.foto}
                          alt={nombreMaterial}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                        <Package className="h-5 w-5 text-amber-700" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {nombreMaterial}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.material_codigo}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.potenciaKW ? `${material.potenciaKW} KW` : "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {marcaNombre || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.categoria || item.categoria || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-sm font-semibold">
                      {item.cantidad}
                      {item.um ? ` ${item.um}` : ""}
                    </span>
                  </td>
                  {onEditStock ? (
                    <td className="py-3 px-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onEditStock(item)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Almacen
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Material
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Unidad
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cantidad
            </th>
            {onEditStock ? (
              <th className="text-right py-3 px-4 font-semibold text-gray-900">
                Acciones
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => (
            <tr
              key={
                item.id || `${item.almacen_id}-${item.material_codigo}-${index}`
              }
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">
                  {item.almacen_nombre ||
                    almacenNombreFallback ||
                    item.almacen_id}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">
                  {item.material_codigo}
                </div>
                <div className="text-sm text-gray-600">
                  {item.material_descripcion || "Sin descripcion"}
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{item.um || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm font-semibold text-gray-900">
                  {item.cantidad}
                </span>
              </td>
              {onEditStock ? (
                <td className="py-4 px-4 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEditStock(item)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar stock
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
