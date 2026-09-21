"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { SmartPagination } from "@/components/shared/molecule/smart-pagination"
import { useToast } from "@/hooks/use-toast"
import { useCarga, usePermisosSolineras } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { cn } from "@/lib/utils"
import { formatearMonto } from "@/lib/utils/solineras"
import type { ListaPaginada, PagoSolinera } from "@/lib/types/feats/solineras/solinera-types"
import { MotivoPagoDialog, type ModoMotivoPago } from "./motivo-pago-dialog"
import { PagosTabla, type AccionEnCurso } from "./pagos-tabla"
import type { TabSolineraProps } from "./tab-props"

type FiltroComprobante = "todos" | "pendiente" | "validado" | "rechazado"

const POR_PAGINA = 30
const REFRESCO_MS = 30_000

const FILTROS: { valor: FiltroComprobante; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "pendiente", etiqueta: "Por validar" },
  { valor: "validado", etiqueta: "Validados" },
  { valor: "rechazado", etiqueta: "Rechazados" },
]

const TEXTO_VACIO: Record<FiltroComprobante, { titulo: string; detalle: string }> = {
  pendiente: {
    titulo: "No hay comprobantes por validar",
    detalle:
      "Los pagos por transferencia, Transfermóvil o EnZona aparecen aquí en cuanto el operador los registra.",
  },
  validado: {
    titulo: "No hay comprobantes validados",
    detalle: "Aquí aparecerán los comprobantes que se den por buenos.",
  },
  rechazado: {
    titulo: "No hay comprobantes rechazados",
    detalle: "Aquí aparecerán los comprobantes que se rechacen, con su motivo.",
  },
  todos: {
    titulo: "Todavía no hay pagos en esta solinera",
    detalle: "Los pagos se registran desde cada carga.",
  },
}

export function PagosTab({ solinera }: TabSolineraProps) {
  const { toast } = useToast()
  const { puedeValidarComprobantes, puedeAnular } = usePermisosSolineras()

  // null = todavía no se sabe: por defecto se abre en «Por validar» si hay alguno.
  const [filtro, setFiltro] = useState<FiltroComprobante | null>(null)
  const [pagina, setPagina] = useState(1)
  const [enCurso, setEnCurso] = useState<AccionEnCurso | null>(null)
  const [dialogo, setDialogo] = useState<{ modo: ModoMotivoPago; pago: PagoSolinera } | null>(null)

  const pendientes = useCarga<number>(
    async () =>
      (await SolineraService.listarPagos(solinera.id, { comprobante: "pendiente", limit: 1 })).total,
    [solinera.id],
    { intervaloMs: REFRESCO_MS },
  )

  useEffect(() => {
    if (filtro !== null) return
    if (pendientes.data === undefined && !pendientes.error) return
    setFiltro((pendientes.data ?? 0) > 0 ? "pendiente" : "todos")
  }, [filtro, pendientes.data, pendientes.error])

  const lista = useCarga<ListaPaginada<PagoSolinera>>(
    () =>
      SolineraService.listarPagos(solinera.id, {
        comprobante: filtro && filtro !== "todos" ? filtro : undefined,
        skip: (pagina - 1) * POR_PAGINA,
        limit: POR_PAGINA,
      }),
    [solinera.id, filtro, pagina],
    { intervaloMs: REFRESCO_MS, activo: filtro !== null },
  )

  const pagos = lista.data?.data ?? []
  const total = lista.data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  // Si al validar o rechazar la última fila de una página esta queda vacía, se vuelve a la anterior.
  useEffect(() => {
    if (lista.data && lista.data.data.length === 0 && pagina > 1) setPagina((p) => p - 1)
  }, [lista.data, pagina])

  const recargarTodo = async () => {
    await Promise.all([lista.recargar(), pendientes.recargar()])
  }

  const cambiarFiltro = (valor: FiltroComprobante) => {
    setFiltro(valor)
    setPagina(1)
  }

  const avisarError = (titulo: string, error: unknown) =>
    toast({
      title: titulo,
      description: error instanceof Error ? error.message : "Inténtalo de nuevo",
      variant: "destructive",
    })

  const ver = async (pago: PagoSolinera) => {
    // La pestaña se abre en el momento del clic (antes de esperar la URL) para que el
    // navegador no la tome por una ventana emergente no pedida.
    const ventana = window.open("about:blank", "_blank")
    if (!ventana) {
      toast({
        title: "El navegador bloqueó la pestaña nueva",
        description: "Permite las ventanas emergentes de este sitio e inténtalo otra vez.",
        variant: "destructive",
      })
      return
    }
    ventana.opener = null
    setEnCurso({ id: pago.id, accion: "ver" })
    try {
      // La URL firmada dura pocos minutos: no se guarda, se pide en cada clic.
      ventana.location.href = await SolineraService.urlComprobante(solinera.id, pago.id)
    } catch (error) {
      ventana.close()
      avisarError("No se pudo abrir el comprobante", error)
    } finally {
      setEnCurso(null)
    }
  }

  const validar = async (pago: PagoSolinera) => {
    setEnCurso({ id: pago.id, accion: "validar" })
    try {
      await SolineraService.validarComprobante(solinera.id, pago.id)
      toast({
        title: "Comprobante validado",
        description: `${pago.carga_codigo} · ${formatearMonto(pago.monto, pago.moneda)}`,
      })
      await recargarTodo()
    } catch (error) {
      avisarError("No se pudo validar el comprobante", error)
      void recargarTodo()
    } finally {
      setEnCurso(null)
    }
  }

  const porValidar = pendientes.data ?? 0
  const cargando = filtro === null || lista.loading || (lista.data === undefined && !lista.error)
  const vacio = TEXTO_VACIO[filtro ?? "todos"]
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const hasta = (pagina - 1) * POR_PAGINA + pagos.length

  let cuerpo: ReactNode
  if (cargando) {
    cuerpo = (
      <div
        role="status"
        className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando pagos...
      </div>
    )
  } else if (lista.error && !lista.data) {
    cuerpo = (
      <div role="alert" className="grid justify-items-center gap-3 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium">No se pudieron cargar los pagos</p>
          <p className="mt-1 text-sm text-muted-foreground">{lista.error}</p>
        </div>
        <Button variant="outline" onClick={() => void recargarTodo()}>
          Reintentar
        </Button>
      </div>
    )
  } else if (pagos.length === 0) {
    cuerpo = (
      <div className="grid justify-items-center gap-1 p-10 text-center">
        <p className="font-medium">{vacio.titulo}</p>
        <p className="max-w-md text-sm text-muted-foreground">{vacio.detalle}</p>
      </div>
    )
  } else {
    cuerpo = (
      <PagosTabla
        pagos={pagos}
        puedeValidar={puedeValidarComprobantes}
        puedeAnular={puedeAnular}
        enCurso={enCurso}
        onVer={(pago) => void ver(pago)}
        onValidar={(pago) => void validar(pago)}
        onRechazar={(pago) => setDialogo({ modo: "rechazar", pago })}
        onCancelar={(pago) => setDialogo({ modo: "cancelar", pago })}
      />
    )
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Comprobantes por validar</p>
          <p
            aria-live="polite"
            className={cn(
              "mt-1 text-4xl font-semibold leading-none tabular-nums",
              porValidar > 0 ? "text-amber-700" : "text-foreground",
            )}
          >
            {pendientes.data ?? "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filtrar por estado del comprobante"
            className="flex flex-wrap gap-2"
          >
            {FILTROS.map((f) => {
              const activo = filtro === f.valor
              return (
                <Button
                  key={f.valor}
                  variant={activo ? "default" : "outline"}
                  aria-pressed={activo}
                  onClick={() => cambiarFiltro(f.valor)}
                >
                  {f.etiqueta}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Actualizar la lista de pagos"
            title="Actualizar"
            onClick={() => void recargarTodo()}
            disabled={filtro === null || cargando}
          >
            <RefreshCw className={cn(lista.refrescando && "animate-spin")} />
          </Button>
        </div>
      </div>

      {lista.error && lista.data && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-t bg-red-50 px-4 py-2 text-sm text-red-800 sm:px-5"
        >
          <span>No se pudo actualizar la lista: {lista.error}</span>
          <Button variant="outline" size="sm" onClick={() => void recargarTodo()}>
            Reintentar
          </Button>
        </div>
      )}

      <div className="border-t">{cuerpo}</div>

      {!cargando && total > 0 && (
        <div className="flex flex-col items-center gap-3 border-t px-4 py-3 sm:flex-row sm:justify-between sm:px-5">
          <p className="text-sm tabular-nums text-muted-foreground">
            Mostrando {desde}–{hasta} de {total}
          </p>
          <SmartPagination
            currentPage={pagina}
            totalPages={totalPaginas}
            onPageChange={(p) => setPagina(Math.min(Math.max(p, 1), totalPaginas))}
            className="mx-0 w-auto"
          />
        </div>
      )}

      <MotivoPagoDialog
        solineraId={solinera.id}
        modo={dialogo?.modo ?? "rechazar"}
        pago={dialogo?.pago ?? null}
        onOpenChange={(abierto) => {
          if (!abierto) setDialogo(null)
        }}
        onHecho={() => void recargarTodo()}
      />
    </div>
  )
}
