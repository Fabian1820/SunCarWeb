"use client";

import { useMemo, type CSSProperties } from "react";
import type { NodoOrganigrama } from "@/lib/types/feats/organigramas/organigrama-types";
import {
  calcularLayoutOrganigrama,
  COLORES_ORGANIGRAMA as C,
  GROSOR_BORDE_CARGO,
  GROSOR_LINEA,
  type ElementoOrganigrama,
} from "@/lib/services/feats/organigramas/organigrama-layout";

const FUENTE = "Helvetica, Arial, sans-serif";

export interface SeleccionOrganigrama {
  nodoId: string;
  cargoId?: string;
}

interface OrganigramaLienzoProps {
  raiz: NodoOrganigrama;
  titulo?: string;
  /** Sin escala, el SVG ocupa el ancho del contenedor. */
  escala?: number;
  className?: string;
  style?: CSSProperties;
  seleccion?: SeleccionOrganigrama | null;
  onSeleccionar?: (seleccion: SeleccionOrganigrama) => void;
}

/** Vista del organigrama. Dibuja el mismo diagramado que el PDF. */
export function OrganigramaLienzo({
  raiz,
  titulo,
  escala,
  className,
  style,
  seleccion,
  onSeleccionar,
}: OrganigramaLienzoProps) {
  const layout = useMemo(() => calcularLayoutOrganigrama(raiz), [raiz]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${layout.ancho} ${layout.alto}`}
      width={escala ? layout.ancho * escala : undefined}
      height={escala ? layout.alto * escala : undefined}
      className={className}
      style={style}
      role="img"
      aria-label={titulo ? `Organigrama ${titulo}` : "Organigrama"}
    >
      {layout.elementos.map((el, i) => (
        <Elemento key={i} el={el} seleccion={seleccion} onSeleccionar={onSeleccionar} />
      ))}
    </svg>
  );
}

function Elemento({
  el,
  seleccion,
  onSeleccionar,
}: {
  el: ElementoOrganigrama;
  seleccion?: SeleccionOrganigrama | null;
  onSeleccionar?: (seleccion: SeleccionOrganigrama) => void;
}) {
  switch (el.tipo) {
    case "linea":
      return (
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={C.linea}
          strokeWidth={GROSOR_LINEA}
          strokeLinecap="square"
        />
      );

    case "caja": {
      const esCargo = el.variante === "cargo";
      const seleccionada =
        !!seleccion &&
        seleccion.nodoId === el.nodoId &&
        (esCargo ? seleccion.cargoId === el.cargoId : !seleccion.cargoId);
      return (
        <g
          onClick={
            onSeleccionar
              ? () => onSeleccionar({ nodoId: el.nodoId, cargoId: el.cargoId })
              : undefined
          }
          style={onSeleccionar ? { cursor: "pointer" } : undefined}
        >
          <rect
            x={el.x}
            y={el.y}
            width={el.w}
            height={el.h}
            rx={el.radio}
            fill={esCargo ? C.cargoFondo : el.variante === "raiz" ? C.raiz : C.area}
            stroke={seleccionada ? C.seleccion : esCargo ? C.cargoBorde : "none"}
            strokeWidth={seleccionada ? 2.4 : esCargo ? GROSOR_BORDE_CARGO : 0}
          />
          <text
            x={el.x + el.w / 2}
            y={el.y + el.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={FUENTE}
            fontWeight={700}
            fontSize={el.tamano}
            fill={esCargo ? (el.vacio ? C.vacio : C.cargoTexto) : C.textoCaja}
            fillOpacity={!esCargo && el.vacio ? 0.7 : 1}
          >
            {el.texto}
          </text>
        </g>
      );
    }

    case "numero":
      return (
        <text
          x={el.x}
          y={el.y}
          textAnchor={el.alinear === "right" ? "end" : "start"}
          dominantBaseline="central"
          fontFamily={FUENTE}
          fontWeight={700}
          fontSize={el.tamano}
          fill={C.numero}
        >
          {el.texto}
        </text>
      );

    case "insignia":
      return (
        <g>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={el.h / 2} fill={C.insignia} />
          <text
            x={el.x + el.w / 2}
            y={el.y + el.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={FUENTE}
            fontWeight={700}
            fontSize={el.tamano}
            fill={C.textoCaja}
          >
            {el.texto}
          </text>
        </g>
      );
  }
}
