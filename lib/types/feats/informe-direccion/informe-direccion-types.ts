export type InstaladoraGeneral = {
  leads_nuevos: number;
  clientes_nuevos_total: number;
  clientes_nuevos_trabajadores: number;
  clientes_nuevos_reales: number;
  conversion_pct: number;
  instalaciones_completadas: number;
  dias_promedio_confirmacion_instalacion: number | null;
  ofertas_confirmadas_con_anticipo: number;
  averias_reportadas: number;
  averias_resueltas: number;
  averias_pendientes: number;
  ofertas_creadas: number;
  ofertas_confirmadas: number;
  monto_vendido: number;
  monto_cobrado_total_mes: number;
  monto_cobrado_de_confirmadas: number;
  vales_salida_total: number;
  vales_salida_promedio_dia: number;
};

export type ComercialInstaladora = {
  nombre: string;
  leads: number;
  clientes: number;
  conversion_pct: number;
  ofertas_creadas: number;
  ofertas_confirmadas: number;
  monto_vendido: number;
  monto_cobrado: number;
};

export type VentasResumen = {
  solicitudes_creadas: number;
  solicitudes_de_clientes_nuevos: number;
  solicitudes_de_clientes_recurrentes: number;
  monto_vendido: number;
  descuento_otorgado: number;
  solicitudes_pagadas: number;
  solicitudes_no_pagadas: number;
};

export type ComercialVentas = {
  nombre: string;
  clientes_nuevos: number;
  solicitudes: number;
  monto_vendido: number;
  pagadas: number;
  no_pagadas: number;
};

export type PeriodoInforme = {
  inicio: string;
  fin: string;
  instaladora_general: InstaladoraGeneral;
  comercial_instaladora: ComercialInstaladora[];
  ventas: VentasResumen;
  comercial_ventas: ComercialVentas[];
};

export type InformeComparativo = {
  periodo_a: PeriodoInforme;
  periodo_b: PeriodoInforme;
};
