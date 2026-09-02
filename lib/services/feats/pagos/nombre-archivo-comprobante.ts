/**
 * Nombre del PDF de los comprobantes (pago y devolución de cobro).
 *
 * Antes el archivo se llamaba `Comprobante_Pago_<numero_oferta>_<fecha>.pdf`:
 * el cliente recibía un adjunto identificado solo por un número interno. Ahora
 * el nombre lleva su propio nombre delante y el número de oferta al final,
 * entre paréntesis, que es como se pidió. La fecha se mantiene porque es lo
 * único que distingue dos comprobantes de la misma oferta.
 *
 * El contenido del comprobante no cambia: esto es solo el nombre del archivo.
 */

/** Quita lo que ningún sistema de archivos acepta y colapsa espacios. */
const limpiar = (valor: string | null | undefined) =>
  (valor || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function nombreArchivoComprobante({
  documento,
  nombreContacto,
  numeroOferta,
  fecha,
}: {
  /** "Comprobante de Pago", "Comprobante de Devolución de Cobro". */
  documento: string;
  nombreContacto: string | null | undefined;
  numeroOferta: string | null | undefined;
  /** Fecha del pago o de la devolución, en ISO. */
  fecha: string;
}): string {
  const partes = [documento];

  const contacto = limpiar(nombreContacto);
  // "No especificado" es el relleno que ponen las tablas cuando la oferta no
  // tiene contacto; en el nombre del archivo no aporta nada.
  if (contacto && contacto !== "No especificado") partes.push(contacto);

  const fechaValida = new Date(fecha);
  if (!Number.isNaN(fechaValida.getTime())) {
    partes.push(fechaValida.toISOString().split("T")[0]);
  }

  const numero = limpiar(numeroOferta);
  const sufijo = numero ? ` (${numero})` : "";

  return `${partes.join(" - ")}${sufijo}.pdf`;
}
