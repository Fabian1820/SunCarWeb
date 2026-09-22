"use client";

import { Package, Plus, Search } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { MaterialImage } from "@/components/shared/molecule/material-image";
import { SmartPagination } from "@/components/shared/molecule/smart-pagination";
import { usePaginatedMaterials } from "@/hooks/use-paginated-materials";
import type { MaterialSolicitudEnvio } from "@/lib/types/feats/solicitudes-envio/solicitud-envio-types";

interface Props {
  /** material_id de lo ya agregado, para deshabilitar la fila. */
  yaAgregados: Set<string>;
  onAgregar: (material: MaterialSolicitudEnvio) => void;
}

/**
 * Buscador del catálogo para armar una solicitud sin partir de una alerta.
 * Se apoya en el catálogo paginado (búsqueda server-side ya con debounce).
 */
export function MaterialPicker({ yaAgregados, onAgregar }: Props) {
  const { materials, loading, error, meta, filters, setFilters, setPage } =
    usePaginatedMaterials();

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/60">
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="Buscar en el catálogo por código o descripción…"
            className="pl-8 bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 px-3 py-2">{error}</div>
      )}

      <div className="max-h-[38vh] overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="text-sm text-slate-500 text-center py-6">Buscando…</div>
        ) : materials.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-6">
            {filters.q.trim()
              ? "Ningún material coincide con la búsqueda."
              : "Escribe para buscar un material."}
          </div>
        ) : (
          materials.map((m) => {
            // El código se reescribe y deja huérfanos; el material_id es lo fiable.
            const materialId = m.material_id ?? m.id;
            const nombre = m.nombre || m.descripcion;
            const yaEsta = yaAgregados.has(materialId);
            return (
              <div
                key={materialId}
                className="flex items-center gap-3 p-2.5 bg-white"
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                  <MaterialImage
                    foto={m.foto}
                    fotoDisponible={m.foto_disponible ?? undefined}
                    alt={nombre}
                    imgClassName="w-full h-full object-contain p-0.5"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-amber-50">
                        <Package className="h-4 w-4 text-amber-700" />
                      </div>
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-500 truncate">
                    {m.codigo}
                  </div>
                  <div className="text-sm text-slate-900 truncate">{nombre}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {m.categoria}
                    {m.um ? ` · ${m.um}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={yaEsta}
                  className="shrink-0"
                  onClick={() =>
                    onAgregar({
                      material_id: materialId,
                      material_codigo: m.codigo,
                      material_nombre: nombre,
                      material_descripcion: m.descripcion,
                      material_foto: m.foto ?? null,
                      um: m.um,
                      cantidad: 1,
                      motivo: "nuevo",
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {yaEsta ? "Agregado" : "Agregar"}
                </Button>
              </div>
            );
          })
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-200 text-xs text-slate-500">
          <span>
            {meta.total} resultado{meta.total === 1 ? "" : "s"}
          </span>
          <SmartPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
