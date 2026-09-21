"use client"

import { useEffect, useState } from "react"
import { Ban, ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Skeleton } from "@/components/shared/molecule/skeleton"
import { useCarga } from "@/hooks/use-solineras"
import { SolineraService } from "@/lib/services/feats/solineras/solinera-service"
import { describirVehiculo, etiquetaVehiculo } from "@/lib/utils/solineras"
import { cn } from "@/lib/utils"
import type { ClienteSolinera, ListaPaginada } from "@/lib/types/feats/solineras/solinera-types"
import { ClienteDialog } from "./cliente-dialog"
import type { TabSolineraProps } from "./tab-props"

const POR_PAGINA = 20
const PAUSA_BUSQUEDA_MS = 300

/** Columnas de la lista en escritorio; en móvil cada cliente se apila. */
const COLUMNAS = "md:grid-cols-[minmax(0,1.5fr)_10rem_10rem_minmax(0,2fr)]"

/**
 * El teléfono y el carné se guardan sin espacios ni guiones: quien teclea «5352 12-34»
 * o «85 09 15» los encuentra igual. Una búsqueda con letras se deja como está.
 */
function normalizarBusqueda(texto: string): string {
  const limpio = texto.trim()
  return /^[\d\s+-]+$/.test(limpio) ? limpio.replace(/[\s-]/g, "") : limpio
}

export function ClientesTab({ solinera }: TabSolineraProps) {
  const [busqueda, setBusqueda] = useState("")
  const [q, setQ] = useState("")
  const [pagina, setPagina] = useState(0)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState<ClienteSolinera | null>(null)

  // La búsqueda espera a que se deje de teclear. Al cambiar el texto se vuelve a la primera página.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setQ(normalizarBusqueda(busqueda))
      setPagina(0)
    }, PAUSA_BUSQUEDA_MS)
    return () => clearTimeout(temporizador)
  }, [busqueda])

  const { data, loading, refrescando, error, recargar } = useCarga<ListaPaginada<ClienteSolinera>>(
    () => SolineraService.buscarClientes(solinera.id, q, pagina * POR_PAGINA, POR_PAGINA),
    [solinera.id, q, pagina],
  )

  // useCarga vacía los datos al cambiar la búsqueda o la página; se conserva lo último para que
  // la lista no salte a un esqueleto en cada pausa al teclear.
  const [previo, setPrevio] = useState<ListaPaginada<ClienteSolinera> | undefined>(undefined)
  useEffect(() => {
    if (data) setPrevio(data)
  }, [data])
  const lista = data ?? previo

  // Si la página se quedó sin filas (p. ej. tras cambiar los datos), se retrocede.
  useEffect(() => {
    if (data && data.data.length === 0 && pagina > 0) setPagina(pagina - 1)
  }, [data, pagina])

  const abrirNuevo = () => {
    setSeleccion(null)
    setDialogoAbierto(true)
  }

  const abrir = (cliente: ClienteSolinera) => {
    setSeleccion(cliente)
    setDialogoAbierto(true)
  }

  const total = lista?.total ?? 0
  const desde = total === 0 ? 0 : pagina * POR_PAGINA + 1
  const hasta = Math.min((pagina + 1) * POR_PAGINA, total)
  const hayAnterior = pagina > 0
  const haySiguiente = hasta < total
  const esperando = loading || refrescando

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, carné, teléfono o chapa"
            aria-label="Buscar clientes por nombre, carné, teléfono o chapa"
            maxLength={60}
            autoComplete="off"
            className="pl-9 pr-10"
          />
          {busqueda !== "" && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Borrar la búsqueda"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={abrirNuevo} className="sm:shrink-0">
          <Plus />
          Nuevo cliente
        </Button>
      </div>

      {error && !loading && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{lista ? `No se pudo actualizar la lista: ${error}` : error}</span>
          <Button variant="outline" onClick={() => void recargar()} disabled={refrescando}>
            {refrescando && <Loader2 className="animate-spin" />}
            Reintentar
          </Button>
        </div>
      )}

      {loading && !lista && (
        <div className="grid gap-2" aria-busy="true" aria-label="Cargando clientes">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {lista && lista.data.length === 0 && !error && (
        <div className="rounded-lg border border-dashed p-6 text-sm">
          {q ? (
            <>
              <p className="font-medium">Ningún cliente coincide con «{q}»</p>
              <p className="mt-1 text-muted-foreground">
                Prueba con el nombre, el carné, el teléfono o la chapa del vehículo.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Aún no hay clientes en esta solinera</p>
              <p className="mt-1 text-muted-foreground">
                Se registran aquí con «Nuevo cliente», o al iniciar la primera carga o reserva.
              </p>
            </>
          )}
        </div>
      )}

      {lista && lista.data.length > 0 && (
        <>
          <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {q
              ? `${total} ${total === 1 ? "resultado" : "resultados"} para «${q}»`
              : `${total} ${total === 1 ? "cliente" : "clientes"}`}
          </p>

          <div
            className={cn("overflow-hidden rounded-lg border bg-card transition-opacity", esperando && "opacity-60")}
            aria-busy={esperando}
          >
            <div
              className={cn(
                "hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:gap-4",
                COLUMNAS,
              )}
            >
              <span>Cliente</span>
              <span>Teléfono</span>
              <span>Carné</span>
              <span>Vehículos</span>
            </div>
            <ul className="divide-y">
              {lista.data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => abrir(c)}
                    className={cn(
                      "grid min-h-[56px] w-full gap-1.5 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:items-center md:gap-4",
                      COLUMNAS,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{c.nombre}</span>
                      {c.bloqueado && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          <Ban className="h-3 w-3" aria-hidden="true" />
                          Bloqueado
                        </span>
                      )}
                    </span>

                    <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground md:contents">
                      <span className={cn("tabular-nums md:text-foreground", !c.telefono && "hidden md:inline md:text-muted-foreground")}>
                        {c.telefono || "—"}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums md:text-foreground",
                          !c.carnet_identidad && "hidden md:inline md:text-muted-foreground",
                        )}
                      >
                        <span className="md:hidden">Carné </span>
                        {c.carnet_identidad || "—"}
                      </span>
                    </span>

                    <span className="flex flex-wrap gap-1.5">
                      {c.vehiculos.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Sin vehículos</span>
                      ) : (
                        c.vehiculos.map((v) => (
                          <span
                            key={v.id}
                            title={describirVehiculo(v)}
                            className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs"
                          >
                            {v.chapa || etiquetaVehiculo(v.tipo)}
                          </span>
                        ))
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {(hayAnterior || haySiguiente) && (
            <nav
              aria-label="Paginación de clientes"
              className="flex items-center justify-between gap-3"
            >
              <p className="text-sm tabular-nums text-muted-foreground">
                {desde}–{hasta} de {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPagina(pagina - 1)}
                  disabled={!hayAnterior || esperando}
                >
                  <ChevronLeft />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPagina(pagina + 1)}
                  disabled={!haySiguiente || esperando}
                >
                  Siguiente
                  <ChevronRight />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <ClienteDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        solineraId={solinera.id}
        cliente={seleccion}
        onCambio={() => void recargar()}
      />
    </div>
  )
}
