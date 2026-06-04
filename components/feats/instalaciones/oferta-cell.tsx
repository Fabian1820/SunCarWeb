import { Battery, Sun, Zap } from "lucide-react";
import { extraerComponentesDeOfertaConfeccion } from "@/lib/utils/oferta-confeccion-items";
import type { OfertaConfeccionResumen } from "@/lib/types/feats/leads/lead-types";

interface Props {
  oferta_confeccion?: OfertaConfeccionResumen | null;
  ofertas?: Array<{
    inversor_codigo?: string | null;
    inversor_cantidad?: number;
    inversor_nombre?: string | null;
    bateria_codigo?: string | null;
    bateria_cantidad?: number;
    bateria_nombre?: string | null;
    panel_codigo?: string | null;
    panel_cantidad?: number;
    panel_nombre?: string | null;
    elementos_personalizados?: string | null;
    aprobada?: boolean;
    [key: string]: unknown;
  }>;
}

export function OfertaCell({ oferta_confeccion, ofertas }: Props) {
  const oc = oferta_confeccion ?? null;
  const embebidas = (ofertas ?? []).filter(
    (o) => o.inversor_codigo || o.bateria_codigo || o.panel_codigo || o.elementos_personalizados,
  );

  let inv: { cantidad: number; descripcion: string } | null = null;
  let bats: { cantidad: number; descripcion: string }[] = [];
  let pan: { cantidad: number; descripcion: string } | null = null;

  if (oc && oc.items?.length) {
    ({ inv, bats, pan } = extraerComponentesDeOfertaConfeccion(oc));
  } else if (embebidas.length > 0) {
    const o = embebidas[0];
    if (o.inversor_codigo && (o.inversor_cantidad ?? 0) > 0)
      inv = { cantidad: o.inversor_cantidad!, descripcion: o.inversor_nombre || o.inversor_codigo! };
    if (o.bateria_codigo && (o.bateria_cantidad ?? 0) > 0)
      bats = [{ cantidad: o.bateria_cantidad!, descripcion: o.bateria_nombre || o.bateria_codigo! }];
    if (o.panel_codigo && (o.panel_cantidad ?? 0) > 0)
      pan = { cantidad: o.panel_cantidad!, descripcion: o.panel_nombre || o.panel_codigo! };
  }

  const sinComponentes = !inv && bats.length === 0 && !pan;

  if (sinComponentes && !oc) {
    return <span className="text-[13px] text-gray-400">Sin oferta</span>;
  }

  const totalOfertas = oc?.total_ofertas ?? 0;
  const totalConfirmadas = oc?.total_confirmadas ?? 0;

  return (
    <div className="space-y-1.5">
      {oc && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-gray-700">
            {totalOfertas} {totalOfertas === 1 ? "oferta" : "ofertas"}
          </span>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium ${
              totalConfirmadas > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {totalConfirmadas} confirmada{totalConfirmadas === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="space-y-0.5 text-[13px]">
        {inv && (
          <div className="flex items-center gap-1 text-gray-700" title={inv.descripcion}>
            <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="font-medium">{inv.cantidad}x</span>
            <span className="truncate max-w-[180px]">{inv.descripcion}</span>
          </div>
        )}
        {bats.map((bat, i) => (
          <div key={i} className="flex items-center gap-1 text-gray-700" title={bat.descripcion}>
            <Battery className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span className="font-medium">{bat.cantidad}x</span>
            <span className="truncate max-w-[180px]">{bat.descripcion}</span>
          </div>
        ))}
        {pan && (
          <div className="flex items-center gap-1 text-gray-700" title={pan.descripcion}>
            <Sun className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
            <span className="font-medium">{pan.cantidad}x</span>
            <span className="truncate max-w-[180px]">{pan.descripcion}</span>
          </div>
        )}
        {sinComponentes && oc && (
          <span className="text-gray-400 text-[12px]">Sin componentes principales</span>
        )}

      </div>
    </div>
  );
}
