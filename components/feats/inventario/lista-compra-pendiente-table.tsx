"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Package, RefreshCw, Trash2 } from "lucide-react";
import type {
  ItemListaCompra,
  ItemListaCompraUpdateData,
  UrgenciaCompra,
} from "@/lib/types/feats/lista-compra/lista-compra-types";
import {
  URGENCIA_BADGE_CLASSES,
  URGENCIA_EMOJI,
  URGENCIA_LABELS,
} from "@/lib/types/feats/lista-compra/lista-compra-types";

function construirMensajeWhatsapp(items: ItemListaCompra[]): string {
  const porUrgencia: Record<UrgenciaCompra, ItemListaCompra[]> = {
    alta: [],
    media: [],
    baja: [],
  };
  items.forEach((i) => porUrgencia[i.urgencia].push(i));

  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  let texto = `📦 *Lista de materiales a comprar* (${fecha})\n`;

  (Object.keys(porUrgencia) as UrgenciaCompra[]).forEach((urg) => {
    const lista = porUrgencia[urg];
    if (lista.length === 0) return;
    texto += `\n${URGENCIA_EMOJI[urg]} *${URGENCIA_LABELS[urg]}*\n`;
    lista.forEach((i) => {
      texto += `- ${i.material_nombre}: ${i.cantidad} uds${i.nota ? ` (${i.nota})` : ""}\n`;
    });
  });

  texto += `\n_Generado desde SunCarAdmin_`;
  return texto;
}

interface ListaCompraPendienteTableProps {
  items: ItemListaCompra[];
  loading?: boolean;
  onUpdate: (id: string, data: ItemListaCompraUpdateData) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onEnviar: (ids: string[]) => Promise<void>;
}

export function ListaCompraPendienteTable({
  items,
  loading,
  onUpdate,
  onDelete,
  onEnviar,
}: ListaCompraPendienteTableProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const todosSeleccionados = items.length > 0 && selectedIds.size === items.length;

  const toggleSeleccion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    setSelectedIds(todosSeleccionados ? new Set() : new Set(items.map((i) => i.id)));
  };

  const seleccionados = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  );

  const handleGenerarWhatsapp = async () => {
    if (seleccionados.length === 0) return;
    const mensaje = construirMensajeWhatsapp(seleccionados);
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");

    setEnviando(true);
    try {
      await onEnviar(seleccionados.map((i) => i.id));
      setSelectedIds(new Set());
      toast({
        title: "Mensaje generado",
        description: `${seleccionados.length} item(s) marcados como enviados.`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo marcar los items como enviados",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-sm">Cargando lista de compra…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <Package className="h-12 w-12 opacity-30" />
        <p className="text-sm">
          No hay items pendientes. Agrégalos desde el análisis de stock mínimo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5">
        <span className="text-sm font-medium text-blue-900">
          {selectedIds.size} de {items.length} seleccionado(s)
        </span>
        <Button
          size="sm"
          disabled={selectedIds.size === 0 || enviando}
          onClick={handleGenerarWhatsapp}
          className="h-8 bg-green-600 hover:bg-green-700 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {enviando ? "Generando..." : "Generar mensaje de WhatsApp"}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={toggleTodos}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 w-28">Cantidad</th>
              <th className="px-3 py-2 w-32">Urgencia</th>
              <th className="px-3 py-2">Nota</th>
              <th className="px-3 py-2 w-24">Origen</th>
              <th className="px-3 py-2 w-16 text-center">Quitar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <FilaItem
                key={item.id}
                item={item}
                seleccionado={selectedIds.has(item.id)}
                onToggleSeleccion={() => toggleSeleccion(item.id)}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilaItem({
  item,
  seleccionado,
  onToggleSeleccion,
  onUpdate,
  onDelete,
}: {
  item: ItemListaCompra;
  seleccionado: boolean;
  onToggleSeleccion: () => void;
  onUpdate: (id: string, data: ItemListaCompraUpdateData) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const [cantidadDraft, setCantidadDraft] = useState(String(item.cantidad));
  const [notaDraft, setNotaDraft] = useState(item.nota ?? "");
  const [eliminando, setEliminando] = useState(false);

  const commitCantidad = async () => {
    const parsed = Number(cantidadDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCantidadDraft(String(item.cantidad));
      return;
    }
    if (parsed === item.cantidad) return;
    try {
      await onUpdate(item.id, { cantidad: parsed });
    } catch (e: any) {
      setCantidadDraft(String(item.cantidad));
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar la cantidad",
        variant: "destructive",
      });
    }
  };

  const commitNota = async () => {
    if ((item.nota ?? "") === notaDraft) return;
    try {
      await onUpdate(item.id, { nota: notaDraft });
    } catch (e: any) {
      setNotaDraft(item.nota ?? "");
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar la nota",
        variant: "destructive",
      });
    }
  };

  const handleUrgenciaChange = async (urgencia: UrgenciaCompra) => {
    try {
      await onUpdate(item.id, { urgencia });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo actualizar la urgencia",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    setEliminando(true);
    try {
      await onDelete(item.id);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo quitar el item",
        variant: "destructive",
      });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={onToggleSeleccion}
          className="rounded border-gray-300"
        />
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-gray-900 leading-tight">{item.material_nombre}</p>
        <p className="text-xs text-gray-400">{item.material_codigo}</p>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={1}
          value={cantidadDraft}
          onChange={(e) => setCantidadDraft(e.target.value)}
          onBlur={commitCantidad}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-20 h-8 rounded border border-gray-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </td>
      <td className="px-3 py-2">
        <Select value={item.urgencia} onValueChange={(v) => handleUrgenciaChange(v as UrgenciaCompra)}>
          <SelectTrigger
            className={`h-8 text-xs font-medium border ${URGENCIA_BADGE_CLASSES[item.urgencia]}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alta">🔴 Alta</SelectItem>
            <SelectItem value="media">🟡 Media</SelectItem>
            <SelectItem value="baja">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={notaDraft}
          placeholder="Opcional"
          onChange={(e) => setNotaDraft(e.target.value)}
          onBlur={commitNota}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full h-8 rounded border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-gray-500">
          {item.origen === "automatico" ? "🤖 Auto" : "✍️ Manual"}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <Button
          size="sm"
          variant="ghost"
          disabled={eliminando}
          onClick={handleDelete}
          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
          title="Quitar de la lista"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
