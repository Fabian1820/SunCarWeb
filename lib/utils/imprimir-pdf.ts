/**
 * Manda un PDF directo al diálogo de impresión del navegador, sin abrir
 * pestañas nuevas (que los bloqueadores de pop-ups suelen frenar).
 *
 * El PDF se carga en un iframe que TIENE que estar realmente maquetado: con
 * 0x0, `display:none` o `visibility:hidden` el visor de PDF carga el archivo
 * pero no pinta nada, y el motor de impresión se queda sin página que
 * rasterizar — sale la hoja en blanco aunque el PDF esté perfecto. Por eso va
 * con tamaño de hoja real y se esconde mandándolo fuera de la pantalla.
 */
export function imprimirPdf(pdf: Blob): void {
  const url = URL.createObjectURL(pdf);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  // Tamaño carta, que es el papel con el que se imprime aquí y el formato en
  // el que se generan los PDF (vale de salida, comprobantes de billetera).
  iframe.style.width = "216mm";
  iframe.style.height = "279mm";
  iframe.style.border = "0";
  iframe.src = url;

  let limpiado = false;
  const limpiar = () => {
    if (limpiado) return;
    limpiado = true;
    iframe.remove();
    URL.revokeObjectURL(url);
  };

  iframe.onload = () => {
    // El visor pinta el PDF de forma asíncrona: llamar a print() en el mismo
    // load agarra el documento todavía vacío y también sale en blanco.
    window.setTimeout(() => {
      try {
        // Quitar el iframe mientras el diálogo de impresión sigue abierto
        // vacía la hoja igual, así que se limpia recién al cerrarlo.
        window.addEventListener("afterprint", limpiar, { once: true });
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Algún navegador bloquea imprimir desde un iframe: se abre el PDF en
        // una pestaña para imprimirlo desde el visor.
        window.open(url, "_blank");
      }
    }, 800);
  };

  document.body.appendChild(iframe);
  // Red de seguridad por si `afterprint` no llega a dispararse.
  window.setTimeout(limpiar, 5 * 60_000);
}
