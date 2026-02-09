"use client";

import { Button } from "@/components/shared/atom/button";
import { Package, Edit } from "lucide-react";
import type { BackendCatalogoProductos } from "@/lib/material-types";

interface CategoriesTableProps {
  categories: BackendCatalogoProductos[];
  onEdit?: (category: BackendCatalogoProductos) => void;
}

export function CategoriesTable({ categories, onEdit }: CategoriesTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No se encontraron categorías
        </h3>
        <p className="text-gray-600">
          No hay categorías que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Categoría
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Materiales
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900 w-[100px]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr
              key={category.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {category.categoria}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {category.materiales?.length || 0} materiales
                  </span>
                </div>
              </td>
              <td className="py-4 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(category)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  title="Editar nombre de categoría"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
