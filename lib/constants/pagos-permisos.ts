/**
 * Sub-permisos ADITIVOS de `facturas/pagos-clientes`.
 *
 * Los dos se verifican con `hasExactPermission`: tener el módulo padre
 * (`facturas` o `facturas/pagos-clientes`) NO los concede, hay que asignarlos
 * explícitamente desde el panel /permisos. Solo el superAdmin los tiene de
 * oficio.
 *
 * Están declarados en el catálogo (`lib/modulos-catalogo.ts`, bajo
 * `facturas/pagos-clientes`), que es quien los sincroniza con la colección
 * `modulos` de la BD.
 *
 * La trazabilidad de cada acción (quién y cuándo) la registra siempre el
 * backend, con permiso o sin él.
 */

/** Habilita el botón "Editar cobro" (reescribe monto, moneda, método, etc.). */
export const PERMISO_EDITAR_COBRO = "facturas/pagos-clientes/editar-cobro";

/**
 * Habilita el botón "Cancelar pago" en la tabla "Todos los cobros". Cancelar
 * revierte el monto pendiente de la oferta y el depósito en wallet si el cobro
 * fue en efectivo.
 */
export const PERMISO_CANCELAR_COBRO = "facturas/pagos-clientes/cancelar-cobro";
