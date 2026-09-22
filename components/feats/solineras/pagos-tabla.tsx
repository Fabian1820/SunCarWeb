"use client"

import type { ReactNode } from "react"
import { Ban, Check, Eye, Loader2, X } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { cn } from "@/lib/utils"
import {
  ETIQUETA_COMPROBANTE,
  etiquetaMetodo,
  formatearFechaHora,
  formatearMonto,
} from "@/lib/utils/solineras"
import type { EstadoComprobante, PagoSolinera } from "@/lib/types/feats/solineras/solinera-types"

export interface AccionEnCurso {
  id: string
  accion: "ver" | "validar"
}

interface Props {
  pagos: PagoSolinera[]
  puedeValidar: boolean
  puedeAnular: boolean
  enCurso: AccionEnCurso | null
  onVer: (pago: PagoSolinera) => void
  onValidar: (pago: PagoSolinera) => void
  onRechazar: (pago: PagoSolinera) => void
  onCancelar: (pago: PagoSolinera) => void
}

const COLOR_COMPROBANTE: Record<EstadoComprobante, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  validado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-red-100 text-red-800",
}

const formatoTasa = new Intl.NumberFormat("es-CU", { maximumFractionDigits: 2 })

function Etiqueta({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PagosTabla({
  pagos,
  puedeValidar,
  puedeAnular,
  enCurso,
  onVer,
  onValidar,
  onRechazar,
  onCancelar,
}: Props) {
  return (
    <Table className="min-w-[64rem]">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="h-10 px-3 text-xs font-semibold">Fecha y hora</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Carga</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Cliente</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Método</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Monto</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Comprobante</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Registrado por</TableHead>
          <TableHead className="h-10 px-3 text-xs font-semibold">Estado</TableHead>
          <TableHead className="h-10 px-3 text-right text-xs font-semibold">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagos.map((pago) => {
          const cancelado = pago.estado === "cancelado"
          const comprobante = pago.comprobante
          const otraMoneda = pago.moneda !== pago.moneda_carga
          const propia = enCurso?.id === pago.id ? enCurso : null
          const puedeResolver =
            puedeValidar && !cancelado && comprobante !== null && comprobante.estado === "pendiente"
          const puedeCancelar = puedeAnular && !cancelado

          return (
            <TableRow key={pago.id} className={cn(cancelado && "text-muted-foreground")}>
              <TableCell className="whitespace-nowrap px-3 py-3 align-top tabular-nums">
                {formatearFechaHora(pago.creado_en)}
              </TableCell>
              <TableCell className="px-3 py-3 align-top">
                <span className="font-mono text-xs">{pago.carga_codigo}</span>
              </TableCell>
              <TableCell className="px-3 py-3 align-top">{pago.cliente_nombre || "—"}</TableCell>
              <TableCell className="whitespace-nowrap px-3 py-3 align-top">
                {etiquetaMetodo(pago.metodo)}
              </TableCell>
              <TableCell className="whitespace-nowrap px-3 py-3 align-top tabular-nums">
                <p className={cn("font-medium", cancelado && "line-through")}>
                  {formatearMonto(pago.monto, pago.moneda)}
                </p>
                {otraMoneda && (
                  <p className="text-xs text-muted-foreground">
                    = {formatearMonto(pago.monto_aplicado, pago.moneda_carga)}
                    {pago.tasa_cambio ? ` · tasa ${formatoTasa.format(pago.tasa_cambio)}` : ""}
                  </p>
                )}
              </TableCell>
              <TableCell className="px-3 py-3 align-top">
                {comprobante ? (
                  <div className="grid max-w-[15rem] justify-items-start gap-1">
                    <Etiqueta className={COLOR_COMPROBANTE[comprobante.estado]}>
                      {ETIQUETA_COMPROBANTE[comprobante.estado]}
                    </Etiqueta>
                    <span className="break-all font-mono text-xs">
                      {comprobante.numero_transaccion}
                    </span>
                    {comprobante.estado === "rechazado" && comprobante.motivo_rechazo && (
                      <span className="text-xs text-red-700">{comprobante.motivo_rechazo}</span>
                    )}
                    {comprobante.estado !== "pendiente" && comprobante.resuelto_por_nombre && (
                      <span className="text-xs text-muted-foreground">
                        por {comprobante.resuelto_por_nombre}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No lleva</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-3 align-top">
                {pago.registrado_por_nombre || "—"}
              </TableCell>
              <TableCell className="px-3 py-3 align-top text-foreground">
                {cancelado ? (
                  <div className="grid max-w-[14rem] justify-items-start gap-1">
                    <Etiqueta className="bg-red-100 text-red-800">Cancelado</Etiqueta>
                    {pago.motivo_cancelacion && (
                      <span className="text-xs text-muted-foreground">
                        {pago.motivo_cancelacion}
                      </span>
                    )}
                  </div>
                ) : (
                  <span>Registrado</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-3 align-top">
                <div className="flex min-w-[12rem] flex-wrap justify-end gap-2">
                  {comprobante && (
                    <Button
                      variant="outline"
                      onClick={() => onVer(pago)}
                      disabled={propia !== null}
                      aria-label={`Ver el comprobante de la carga ${pago.carga_codigo}`}
                    >
                      {propia?.accion === "ver" ? <Loader2 className="animate-spin" /> : <Eye />}
                      Ver
                    </Button>
                  )}
                  {puedeResolver && (
                    <>
                      <Button
                        onClick={() => onValidar(pago)}
                        disabled={propia !== null}
                        aria-label={`Validar el comprobante de la carga ${pago.carga_codigo}`}
                      >
                        {propia?.accion === "validar" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check />
                        )}
                        Validar
                      </Button>
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onRechazar(pago)}
                        disabled={propia !== null}
                        aria-label={`Rechazar el comprobante de la carga ${pago.carga_codigo}`}
                      >
                        <X />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {puedeCancelar && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onCancelar(pago)}
                      disabled={propia !== null}
                      aria-label={`Cancelar el pago de la carga ${pago.carga_codigo}`}
                    >
                      <Ban />
                      Cancelar pago
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
