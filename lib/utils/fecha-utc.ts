/**
 * Instantes que el backend manda sin zona horaria.
 *
 * El backend los guarda en UTC (`datetime.now(timezone.utc)`), pero Motor los
 * lee de Mongo sin zona y la API los serializa sin la `Z`
 * (`2026-06-18T16:40:45.960000`). `new Date()` toma ese texto como hora local,
 * así que en Cuba salían 4 o 5 horas adelantados. Aquí se leen como UTC y
 * `toLocale*` los pinta en la hora del navegador.
 *
 * No usar con fechas de solo día (`YYYY-MM-DD`, como `fecha_recogida`): no son
 * un instante y convertirlas podría mover el día.
 */
export const parseFechaUtc = (value?: string | null): Date | null => {
  if (!value) return null;
  const conZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const fecha = new Date(conZona);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};
