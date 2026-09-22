"use client";

import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shared/molecule/dialog";

const BASE = "/manual/informe-direccion";

type Paso = { titulo: string; texto: React.ReactNode; imagen: string; alto: number; nota?: string };

/** Botón "?" + modal con el manual de uso de una pestaña: capturas reales del
 * propio panel, no texto suelto. Pocos pasos y solo lo más importante — se
 * lee en un minuto, no reemplaza a la pantalla, la ilustra. */
export function ManualUsoDialog({
  titulo,
  colorNumero,
  pasos,
}: {
  titulo: string;
  colorNumero: string;
  pasos: Paso[];
}) {
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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#012928]">
            <HelpCircle className="h-5 w-5" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {pasos.map((paso, i) => (
            <div key={paso.titulo} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: colorNumero, color: "#012928" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-[#012928]">{paso.titulo}</p>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{paso.texto}</p>
              {paso.nota && <p className="mt-1 text-xs italic text-gray-400">{paso.nota}</p>}
              <div className="mt-3 overflow-hidden rounded-lg border">
                <Image
                  src={`${BASE}/${paso.imagen}`}
                  alt={paso.titulo}
                  width={1200}
                  height={paso.alto}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManualContabilidad() {
  return (
    <ManualUsoDialog
      titulo="Cómo usar Contabilidad"
      colorNumero="#AFEB17"
      pasos={[
        {
          titulo: "Elige el periodo",
          texto: (
            <>
              <b>Mes</b> trae un mes completo (el actual, por defecto); <b>Rango</b> deja fijar Desde y
              Hasta. El botón circular vuelve a calcular; <b>PDF</b> descarga un resumen.
            </>
          ),
          nota: "Categorías y Personas solo aparecen con permiso de configuración.",
          imagen: "01_contab_toolbar.png",
          alto: 129,
        },
        {
          titulo: "Ingresos, Gastos y Saldo",
          texto: (
            <>
              Las tres cifras del periodo, por moneda. Toca una tarjeta y su detalle aparece debajo;{" "}
              <b>Saldo disponible</b> muestra en qué billeteras está hoy ese dinero.
            </>
          ),
          imagen: "02_contab_tarjetas.png",
          alto: 176,
        },
        {
          titulo: "Distribución de ingresos",
          texto: (
            <>
              Cada porción es una sede o categoría (Suncar Ventas Habana, Instaladora Habana, UEB
              Santa Clara…). Tócala para ver su detalle — agrupado <b>por tipo</b> o <b>por
              persona</b> — más abajo.
            </>
          ),
          imagen: "04_contab_pastel.png",
          alto: 636,
        },
        {
          titulo: "Incluir, excluir o mover un ingreso",
          texto: (
            <>
              El interruptor decide si ese ingreso cuenta en los totales — se puede deshacer al
              momento. El selector de <b>Categoría</b> lo reasigna a otra sede. El pago original
              nunca se toca.
            </>
          ),
          nota: "Los nombres de esta fila son ficticios; el resto es un movimiento real.",
          imagen: "03_contab_detalle_switch.png",
          alto: 220,
        },
      ]}
    />
  );
}

export function ManualDesempeno() {
  return (
    <ManualUsoDialog
      titulo="Cómo usar Desempeño de la empresa"
      colorNumero="#F2C300"
      pasos={[
        {
          titulo: "Elige el mes y cuánto comparar",
          texto: (
            <>
              El calendario fija el mes a analizar. <b>Comparar</b> decide cuántos meses hacia atrás
              se traen para las gráficas y la tabla.
            </>
          ),
          imagen: "05_desemp_toolbar.png",
          alto: 92,
        },
        {
          titulo: "Comercial Instaladora y Ventas",
          texto: (
            <>
              Resumen de lo vendido en el mes y su cambio frente al anterior. Toca una tarjeta para
              que el resto de la pantalla muestre esa línea de negocio.
            </>
          ),
          imagen: "06_desemp_tarjetas.png",
          alto: 181,
        },
        {
          titulo: "Lee la variación",
          texto: (
            <>
              <b style={{ color: "#0b6b3a" }}>Verde</b> es buena noticia,{" "}
              <b style={{ color: "#9b1c1c" }}>rojo</b> es mala — no depende de si el número sube o
              baja. Los &ldquo;de los cuales&rdquo; van dentro de su métrica.
            </>
          ),
          imagen: "07_desemp_indicadores.png",
          alto: 243,
        },
        {
          titulo: "Por comercial",
          texto: (
            <>
              Una fila por comercial, con el total al final. La etiqueta <b>otro cargo</b> marca a
              quien vendió sin tener el puesto exacto de comercial. Toca un nombre para ver su
              evolución.
            </>
          ),
          imagen: "08_desemp_comercial.png",
          alto: 540,
        },
      ]}
    />
  );
}
