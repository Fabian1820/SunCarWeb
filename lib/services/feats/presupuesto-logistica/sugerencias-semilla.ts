/**
 * Semilla de sugerencias del presupuesto de Logística.
 *
 * El backend construye la lista de "más usados" con la frecuencia del propio
 * historial del módulo, que es lo correcto a medio plazo: se auto-alimenta y no
 * ata a Logística a ningún catálogo de materiales (compran cemento, neumáticos
 * y mano de obra, cosas que no están en ninguno de los tres catálogos del
 * sistema).
 *
 * El problema es el arranque: sin presupuestos cargados el historial está
 * vacío y el desplegable no ofrece nada. Estas listas salen del presupuesto
 * real de septiembre 2026 y rellenan ese hueco. Se combinan por detrás del
 * historial, así que en cuanto haya meses cargados mandan los datos reales y
 * esto pasa a ser el relleno del final.
 *
 * Se pueden editar a mano sin tocar nada más.
 */

export const MATERIALES_SEMILLA: string[] = [
  // Electricidad e iluminación
  "Lámparas de 20w",
  "Lámparas Solares",
  "Lámpara Solar 3500W",
  "Lámparas Solares 350W",
  "Split 1T",
  "Split 2T",
  // Construcción
  "Cemento",
  "Arena Gris",
  "Polvo de Piedra",
  "Cabillas",
  "Tejas",
  "Pladur",
  "Mano de Obra",
  "Pulir Pisos",
  "Resano de paredes",
  "Falso techo",
  // Pintura
  "Pintura Aceite Verde",
  "Pintura Vinil Verde",
  "Pintura Vinil Blanca",
  // Cerca y perímetro
  "Rollos de Cerca Perle",
  "Alambre de Púa",
  "Tubos Galvanizados",
  'Tubos de 2"',
  "Barillas de Soldar",
  // Hidráulica y sanitario
  "Tuberías",
  "Llave de Paso",
  "Latiguillos",
  "Tanque elevado",
  "Lavamanos",
  "Manguera 30m con regadera",
  // Carpintería y cerrajería
  "Yale de pomo",
  "Yale de puerta",
  // Equipamiento y seguridad
  "Dispenser de agua",
  "Walkie talkie",
  "Cocina de gas",
  "Adaptación Gas de la Calle",
  // Herramientas
  "Machetes",
  "Tijeras",
  "Rastrillos Lineales",
  "Rastrillos Abanico",
];

export const LOCALES_SEMILLA: string[] = [
  "Almacen",
  "Almacen 1",
  "Almacen 2",
  "Almacen no.2",
  "Baño",
  "Baño del Almacén",
  "Casa 10",
  "Casa 24",
  "Cerca Perimetral",
  "Cerca Perimetral Derecha",
  "Chullima",
  "Chullima Ventas",
  "Custodios",
  "Desarrollo y Marketing",
  "Entrada de Servicio y Comercial",
  "Entrada Principal",
  "Facturación",
  "Garita Custodio",
  "Jardin",
  "Kasalta",
  "Muros y Garita",
  "Oficina 2do Piso",
  "Oficina Ventas",
  "Pantry",
  "Patio de Servicio",
  "Zona Parqueo",
];

export const BLOQUES_SEMILLA: string[] = [
  "Seguridad y Protección",
  "Inversiones 3ra y 2",
  "Inversiones casa 24",
  "Inversiones Almacen calle 30",
  "Inversiones Chullima Ceprona",
  "Inversiones Chullima Oficina",
  "Inversiones Solinera Kasalta",
];

/**
 * Historial primero (son los datos reales del módulo, ordenados por uso) y
 * detrás la semilla, sin repetir. La comparación ignora mayúsculas y acentos
 * para no ofrecer "Cemento" y "cemento" como si fueran distintos.
 */
export function combinarConSemilla(
  historial: string[],
  semilla: string[],
): string[] {
  const vistos = new Set(historial.map((s) => s.trim().toLowerCase()));
  const extras = semilla.filter((s) => !vistos.has(s.trim().toLowerCase()));
  return [...historial, ...extras];
}
