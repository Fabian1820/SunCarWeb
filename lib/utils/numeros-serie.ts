/**
 * Números de serie de equipos en vales y devoluciones.
 *
 * Una serie es texto libre (letras, números, guiones, barras, comas...), así
 * que viajan como lista, nunca unidas por comas. Para comparar se ignoran
 * mayúsculas y espacios repetidos, igual que en el backend
 * (`domain/numeros_serie.py`): así "sn-01 " y "SN-01" son la misma unidad.
 */

export const claveSerie = (serie: string): string =>
  serie.trim().split(/\s+/).join(" ").toLocaleLowerCase("es");

/** Quita vacíos y espacios sobrantes; conserva el orden y las repetidas. */
export const limpiarSeries = (series: readonly string[]): string[] =>
  series.map((s) => s.trim().split(/\s+/).join(" ")).filter(Boolean);

/** Las series que aparecen más de una vez, cada una una sola vez. */
export const seriesRepetidas = (series: readonly string[]): string[] => {
  const vistas = new Set<string>();
  const dobles = new Map<string, string>();
  for (const serie of limpiarSeries(series)) {
    const clave = claveSerie(serie);
    if (vistas.has(clave) && !dobles.has(clave)) dobles.set(clave, serie);
    vistas.add(clave);
  }
  return [...dobles.values()];
};

/** Unidades enteras que pueden llevar serie (2,5 m de cable → 2). */
export const unidadesConSerie = (cantidad: number): number =>
  Number.isFinite(cantidad) && cantidad > 0 ? Math.floor(cantidad + 1e-9) : 0;
