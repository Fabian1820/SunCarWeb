"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shared/molecule/dialog";

/** Botón "?" + modal con instrucciones de uso de una pestaña. Los textos
 * citan las mismas etiquetas que ve el usuario en pantalla (nombres de
 * botones, filtros, columnas), para que el manual y la pantalla no se
 * desalineen si uno cambia. */
export function ManualUsoDialog({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-gray-400 hover:text-[#012928]"
          title="Cómo usar esta pestaña"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#012928]">
            <HelpCircle className="h-5 w-5" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="manual-uso space-y-4 text-sm leading-relaxed text-gray-700">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

/** Un bloque del manual: título corto + su explicación. */
function Paso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-[#012928]">{titulo}</p>
      <div className="mt-0.5 text-gray-600">{children}</div>
    </div>
  );
}

export function ManualContabilidad() {
  return (
    <ManualUsoDialog titulo="Cómo usar Contabilidad">
      <Paso titulo="Elegir el periodo">
        Con <b>Mes</b> ves un mes completo (por defecto, el actual); con <b>Rango</b> defines Desde
        y Hasta a tu gusto. El botón circular con la flecha vuelve a calcular con los filtros actuales.
      </Paso>
      <Paso titulo="Las tres tarjetas de arriba">
        <b>Ingresos</b>, <b>Gastos</b> y <b>Saldo disponible</b>, cada una por moneda (USD, EUR, CUP…).
        Al tocar una tarjeta, debajo se muestra su detalle. Tocar <b>Saldo disponible</b> muestra en
        qué billeteras está hoy ese dinero.
      </Paso>
      <Paso titulo="Distribución de ingresos">
        El pastel divide los ingresos del periodo por sede o categoría de negocio (Suncar Ventas
        Habana, Instaladora Habana, UEB Santa Clara…). Toca una porción, o su nombre en la lista, para
        ver el detalle de esa categoría más abajo — agrupado <b>por tipo</b> de ingreso o{" "}
        <b>por persona</b>, según la categoría. Junto al pastel, el gráfico de líneas muestra la
        misma cifra en los meses anteriores.
      </Paso>
      <Paso titulo="Incluir o excluir un ingreso">
        En el detalle de cada movimiento hay un interruptor <b>Incluido en los totales</b>. Si lo
        apagas, ese ingreso deja de sumar en esa categoría y en el total general, pero el pago
        original no se toca — el resto del sistema lo sigue viendo igual. Se puede deshacer al
        momento con el botón <b>Deshacer</b> que aparece, o volviendo a encender el interruptor
        cuando quieras.
      </Paso>
      <Paso titulo="Mover un ingreso de categoría">
        El selector de <b>Categoría</b> de cada movimiento permite reasignarlo a otra sede si el
        sistema lo clasificó mal (por ejemplo, una transferencia sin datos suficientes). El cambio
        queda marcado como <b>Movido</b> y solo afecta a este módulo.
      </Paso>
      <Paso titulo="Filtrar por moneda">
        El selector <b>Todas</b> de la barra superior limita toda la vista a una sola moneda.
      </Paso>
      <Paso titulo="Gastos y Saldo disponible">
        Al tocar la tarjeta de <b>Gastos</b> ves los movimientos de gasto por fecha y persona (los
        gastos no se dividen por categoría, siempre son generales de la empresa).
      </Paso>
      <Paso titulo="Categorías y Personas (si tienes acceso)">
        <b>Categorías</b> permite crear nuevas categorías de ingreso o renombrar las existentes
        (nunca se borran). <b>Personas</b> permite decir a qué sede pertenece cada persona, para que
        sus ingresos se clasifiquen solos la próxima vez.
      </Paso>
      <Paso titulo="Exportar">
        El botón <b>PDF</b> descarga un resumen del periodo y la división por categoría que estás
        viendo.
      </Paso>
    </ManualUsoDialog>
  );
}

export function ManualDesempeno() {
  return (
    <ManualUsoDialog titulo="Cómo usar Desempeño de la empresa">
      <Paso titulo="Elegir el mes y cuánto comparar">
        El calendario fija el mes que se analiza (por defecto, el actual). <b>Comparar</b> decide
        cuántos meses hacia atrás se traen para las gráficas y la tabla: 3, 6 o 12 meses.
      </Paso>
      <Paso titulo="Comercial Instaladora y Ventas">
        Las dos tarjetas de arriba resumen lo vendido en el mes elegido y su cambio frente al mes
        anterior. Toca una para que el resto de la pantalla muestre esa línea de negocio.
      </Paso>
      <Paso titulo="Indicadores del mes">
        Cada tarjeta es una métrica del mes (leads, clientes, ofertas, montos…) con su cambio frente
        al mes anterior: verde si es una buena noticia, rojo si es mala — por ejemplo, que suban las
        averías pendientes se marca en rojo aunque el número crezca. Las filas "de los cuales" van
        dentro de su métrica principal. Toca una tarjeta para ver su evolución en el gráfico de
        abajo.
      </Paso>
      <Paso titulo="Evolución">
        Dibuja, mes a mes, la métrica que hayas elegido arriba o en la tabla de comparativo.
      </Paso>
      <Paso titulo="Comparativo mes a mes">
        Todas las métricas en una tabla, un mes por columna, con el mes elegido resaltado y su
        cambio frente al anterior en la última columna. Toca una fila para verla en el gráfico de
        evolución.
      </Paso>
      <Paso titulo="Por comercial">
        Todas las métricas del mes, una fila por comercial, con el total al final. Lo que no se pudo
        atribuir a nadie aparece en <b>Sin comercial asignado</b>. Una etiqueta <b>otro cargo</b>{" "}
        marca a quien vendió sin tener el puesto exacto de comercial. Toca un comercial para ver su
        evolución en los últimos meses.
      </Paso>
      <Paso titulo="Monto cobrado: dos cifras distintas">
        <b>Cobrado — total del periodo</b> es el dinero que entró ese mes, de cualquier oferta.{" "}
        <b>Cobrado — de lo confirmado en el periodo</b> es, de las ofertas que se confirmaron ese
        mismo mes, lo que se pagó también dentro de ese mes (no incluye anticipos de antes ni
        plazos pagados después).
      </Paso>
    </ManualUsoDialog>
  );
}
