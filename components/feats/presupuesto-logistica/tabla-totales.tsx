import type { TotalesPresupuesto } from "@/lib/types/feats/presupuesto-logistica/presupuesto-logistica-types";

const fmt = (valor: number): string =>
  valor.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Con hasta 6 bloques se pinta como el Word: una columna por sede y una fila
 * por moneda. Pasado ese punto la tabla ancha deja de leerse, así que se
 * transpone (sedes en filas) sin perder ninguna cifra. El backend decide cuál
 * toca en `layout_tabla`.
 */
export function TablaTotales({ totales }: { totales: TotalesPresupuesto }) {
  const th = "px-3 py-2 text-xs font-semibold text-white";
  const td = "px-3 py-2 text-sm tabular-nums text-right border-t border-slate-100";

  if (totales.layout_tabla === "ancha") {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px]">
          <thead className="bg-emerald-700">
            <tr>
              <th className={`${th} text-left`}>Importe</th>
              {totales.por_sede.map((sede) => (
                <th key={`${sede.orden}-${sede.sede_nombre}`} className={`${th} text-right`}>
                  {sede.sede_nombre}
                </th>
              ))}
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>Total USD</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td className={`${td} text-left font-semibold`}>USD</td>
              {totales.por_sede.map((sede) => (
                <td key={`usd-${sede.orden}`} className={td}>
                  {fmt(sede.total_usd)}
                </td>
              ))}
              <td className={`${td} font-medium`}>{fmt(totales.total_usd)}</td>
              <td className={`${td} font-medium`}>{fmt(totales.total_usd)}</td>
            </tr>
            <tr>
              <td className={`${td} text-left font-semibold`}>CUP</td>
              {totales.por_sede.map((sede) => (
                <td key={`cup-${sede.orden}`} className={td}>
                  {fmt(sede.total_cup)}
                </td>
              ))}
              <td className={`${td} font-medium`}>{fmt(totales.total_cup)}</td>
              <td className={`${td} font-medium`}>{fmt(totales.total_cup_en_usd)}</td>
            </tr>
            <tr className="bg-emerald-50">
              <td className={`${td} text-left font-bold`}>TOTAL GENERAL</td>
              {totales.por_sede.map((sede) => (
                <td key={`tot-${sede.orden}`} className={td} />
              ))}
              <td className={td} />
              <td className={`${td} font-bold text-emerald-800`}>
                {fmt(totales.total_general_usd)} USD
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px]">
        <thead className="bg-emerald-700">
          <tr>
            <th className={`${th} text-left`}>Bloque</th>
            <th className={`${th} text-right`}>Importe CUP</th>
            <th className={`${th} text-right`}>Importe USD</th>
            <th className={`${th} text-right`}>Total en USD</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {totales.por_sede.map((sede) => (
            <tr key={`${sede.orden}-${sede.sede_nombre}`}>
              <td className={`${td} text-left`}>
                {sede.sede_nombre}
                {!sede.es_sede_registrada && (
                  <span className="ml-2 text-[11px] text-slate-400">(libre)</span>
                )}
              </td>
              <td className={td}>{fmt(sede.total_cup)}</td>
              <td className={td}>{fmt(sede.total_usd)}</td>
              <td className={td}>{fmt(sede.total_en_usd)}</td>
            </tr>
          ))}
          <tr className="bg-emerald-50">
            <td className={`${td} text-left font-bold`}>TOTAL GENERAL</td>
            <td className={`${td} font-bold`}>{fmt(totales.total_cup)}</td>
            <td className={`${td} font-bold`}>{fmt(totales.total_usd)}</td>
            <td className={`${td} font-bold text-emerald-800`}>
              {fmt(totales.total_general_usd)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
