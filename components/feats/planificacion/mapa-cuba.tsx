"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rutaSvg, type MapaCuba } from "@/components/feats/planificacion/zonas";

type Vista = [number, number, number, number];

/** Color de una zona según cuántos pendientes tiene. */
export function colorZona(n: number): string {
  if (n <= 0) return "#E4EBE8";
  if (n <= 2) return "#C6EADB";
  if (n <= 5) return "#8BD3B5";
  if (n <= 10) return "#3FAF86";
  return "#16835D";
}

const ASPECTO = 2;

function vistaDe(b: [number, number, number, number], margen: number, aspecto: number): Vista {
  let w = b[2] - b[0];
  let h = b[3] - b[1];
  let x = b[0] - w * margen;
  let y = b[1] - h * margen;
  w *= 1 + 2 * margen;
  h *= 1 + 2 * margen;
  // Se ajusta al aspecto del recuadro para que el zoom no deforme la forma.
  if (w / h > aspecto) {
    const nh = w / aspecto;
    y -= (nh - h) / 2;
    h = nh;
  } else {
    const nw = h * aspecto;
    x -= (nw - w) / 2;
    w = nw;
  }
  return [x, y, w, h];
}

interface Props {
  mapa: MapaCuba;
  /** Clave de la provincia abierta; null es Cuba entera. */
  provincia: string | null;
  /** Id del municipio marcado. */
  municipio: string | null;
  conteoProvincia: Map<string, number>;
  conteoMunicipio: Map<string, number>;
  /** Cuántos hay ya seleccionados en cada municipio o provincia. */
  seleccion: Map<string, number>;
  onProvincia: (clave: string) => void;
  onMunicipio: (id: string) => void;
  /** Ocupa todo el alto que le den (pantalla completa) en vez de ir con proporción fija. */
  llenar?: boolean;
}

/**
 * Cuba por provincias y, al entrar en una, por municipios, con cuántos
 * pendientes hay en cada sitio. El zoom se anima para no perder dónde se está.
 */
export function MapaCubaSvg({
  mapa,
  provincia,
  municipio,
  conteoProvincia,
  conteoMunicipio,
  seleccion,
  onProvincia,
  onMunicipio,
  llenar = false,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoPx, setAnchoPx] = useState(800);
  const [altoPx, setAltoPx] = useState(400);
  const aspecto = llenar && altoPx > 0 ? anchoPx / altoPx : ASPECTO;
  const rutas = useMemo(() => new Map(mapa.municipios.map((m) => [m.id, rutaSvg(m.r)])), [mapa]);
  const bordes = useMemo(
    () =>
      mapa.bordes.map((l) => {
        let d = `M${l[0]} ${l[1]}`;
        for (let i = 2; i < l.length; i += 2) d += `L${l[i]} ${l[i + 1]}`;
        return d;
      }),
    [mapa],
  );

  const objetivo = useMemo<Vista>(() => {
    // Con un municipio elegido se acerca a él, dejando ver un poco de los de
    // alrededor para no perder dónde está.
    const m = municipio ? mapa.municipios.find((x) => x.id === municipio) : null;
    if (m) return vistaDe(m.b, 0.45, aspecto);
    const p = provincia ? mapa.provincias.find((x) => x.k === provincia) : null;
    return p ? vistaDe(p.b, 0.06, aspecto) : vistaDe([0, 0, mapa.ancho, mapa.alto], 0.01, aspecto);
  }, [mapa, provincia, municipio, aspecto]);

  const [vista, setVista] = useState<Vista>(objetivo);
  const vistaRef = useRef(vista);

  useEffect(() => {
    const desde = vistaRef.current;
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducido) {
      vistaRef.current = objetivo;
      setVista(objetivo);
      return;
    }
    const inicio = performance.now();
    const duracion = 380;
    let marco = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const e = 1 - Math.pow(1 - t, 3);
      const v = desde.map((d, i) => d + (objetivo[i] - d) * e) as Vista;
      vistaRef.current = v;
      setVista(v);
      if (t < 1) marco = requestAnimationFrame(paso);
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [objetivo]);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      setAnchoPx(e.contentRect.width || 800);
      setAltoPx(e.contentRect.height || 400);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /** Unidades del mapa que ocupa un píxel de pantalla ahora mismo. */
  const u = vista[2] / anchoPx;
  const enProvincia = provincia !== null;

  const burbujas = enProvincia
    ? mapa.municipios
        .filter((m) => m.pk === provincia)
        .map((m) => ({
          id: m.id,
          nombre: m.n,
          c: m.c,
          n: conteoMunicipio.get(m.id) ?? 0,
          sel: seleccion.get(m.id) ?? 0,
          activo: m.id === municipio,
          onClick: () => onMunicipio(m.id),
        }))
    : mapa.provincias.map((p) => ({
        id: p.k,
        nombre: p.n,
        c: p.c,
        n: conteoProvincia.get(p.k) ?? 0,
        sel: seleccion.get(p.k) ?? 0,
        activo: false,
        onClick: () => onProvincia(p.k),
      }));

  const marcado = municipio ? mapa.municipios.find((m) => m.id === municipio) : null;

  // Los nombres se ponen empezando por lo que más importa (el marcado, luego
  // las zonas con más pendientes) y se salta el que pisaría a otro: en el
  // centro de La Habana los municipios están pegados.
  const visibles = burbujas
    .filter((b) => b.n > 0 || b.sel > 0 || b.activo)
    .sort((a, b) => Number(b.activo) - Number(a.activo) || b.n - a.n);
  const ocupados: [number, number, number, number][] = [];
  const conNombre = new Set<string>();
  for (const b of visibles) {
    const r = (b.n >= 100 ? 14 : 12) * u;
    const ancho = (b.nombre.length * 6.4 + 6) * u;
    const caja: [number, number, number, number] = [
      b.c[0] - ancho / 2,
      b.c[1] + r + 1 * u,
      b.c[0] + ancho / 2,
      b.c[1] + r + 15 * u,
    ];
    if (ocupados.some((o) => caja[0] < o[2] && caja[2] > o[0] && caja[1] < o[3] && caja[3] > o[1])) continue;
    ocupados.push(caja);
    conNombre.add(b.id);
  }

  return (
    <div
      ref={contenedor}
      className={llenar ? "relative h-full w-full" : "relative w-full"}
      style={llenar ? undefined : { aspectRatio: `${ASPECTO} / 1` }}
    >
      <svg
        viewBox={vista.join(" ")}
        className="absolute inset-0 h-full w-full select-none"
        role="img"
        aria-label={enProvincia ? "Mapa de los municipios de la provincia" : "Mapa de Cuba por provincias"}
      >
        {mapa.municipios.map((m) => {
          const propia = enProvincia && m.pk === provincia;
          const fill = enProvincia
            ? propia
              ? colorZona(conteoMunicipio.get(m.id) ?? 0)
              : "#EEF2F0"
            : colorZona(conteoProvincia.get(m.pk) ?? 0);
          return (
            <path
              key={m.id}
              d={rutas.get(m.id)}
              fill={fill}
              fillRule="evenodd"
              // En Cuba entera el trazo es del mismo color: se ven provincias, no municipios.
              stroke={propia ? "#FFFFFF" : fill}
              strokeWidth={propia ? 1.2 : 0.6}
              vectorEffect="non-scaling-stroke"
              className={propia ? "cursor-pointer transition-[fill] hover:brightness-95" : "cursor-pointer"}
              onClick={() => (propia ? onMunicipio(m.id) : onProvincia(m.pk))}
            >
              <title>{propia ? `${m.n}: ${conteoMunicipio.get(m.id) ?? 0}` : m.p}</title>
            </path>
          );
        })}

        {bordes.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={enProvincia ? "#9AA8A2" : "#FFFFFF"}
            strokeWidth={enProvincia ? 1 : 1.4}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ))}

        {marcado && (
          <path
            d={rutas.get(marcado.id)}
            fill="none"
            stroke="#0F172A"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {[...visibles]
          .reverse()
          .map((b) => {
            const r = (b.n >= 100 ? 14 : 12) * u;
            return (
              <g key={b.id} className="cursor-pointer" onClick={b.onClick}>
                <circle cx={b.c[0]} cy={b.c[1]} r={r} fill={b.activo ? "#0F172A" : "#064E3B"} stroke="#FFFFFF" strokeWidth={1.5 * u} />
                <text
                  x={b.c[0]}
                  y={b.c[1]}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={11 * u}
                  fontWeight={700}
                  fill="#FFFFFF"
                >
                  {b.n}
                </text>
                {b.sel > 0 && (
                  <g>
                    <circle cx={b.c[0] + r * 0.95} cy={b.c[1] - r * 0.95} r={8 * u} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1.5 * u} />
                    <text
                      x={b.c[0] + r * 0.95}
                      y={b.c[1] - r * 0.95}
                      dy="0.35em"
                      textAnchor="middle"
                      fontSize={9 * u}
                      fontWeight={700}
                      fill="#1F2937"
                    >
                      {b.sel}
                    </text>
                  </g>
                )}
                {conNombre.has(b.id) && (
                <text
                  x={b.c[0]}
                  y={b.c[1] + r + 11 * u}
                  textAnchor="middle"
                  fontSize={11 * u}
                  fontWeight={600}
                  fill="#1F2937"
                  stroke="#FFFFFF"
                  strokeWidth={3 * u}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {b.nombre}
                </text>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
