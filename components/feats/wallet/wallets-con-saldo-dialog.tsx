"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, Loader2, RefreshCcw, Search } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Badge } from "@/components/shared/atom/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { WalletService } from "@/lib/api-services"
import { normalizeSearchText } from "@/lib/utils/string-utils"
import type {
  WalletConSaldo,
  WalletTotalSaldo,
} from "@/lib/types/feats/wallet/wallet-types"

// No se usa style "currency": hay códigos que no son ISO y dos monedas pueden
// compartir código (USD efectivo y USD transferencia), por eso va el nombre debajo.
const formatAmount = (amount: number): string =>
  new Intl.NumberFormat("es-CU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

/**
 * Botón + diálogo ampliado con todas las billeteras que tienen más de 0 en
 * alguna moneda. La página solo lo monta para administradores de billetera y
 * el backend vuelve a comprobarlo.
 */
export function WalletsConSaldoButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
        title="Quién tiene saldo"
      >
        <Banknote className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Con saldo</span>
      </Button>
      <WalletsConSaldoDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

interface WalletsConSaldoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletsConSaldoDialog({ open, onOpenChange }: WalletsConSaldoDialogProps) {
  const [items, setItems] = useState<WalletConSaldo[]>([])
  const [totales, setTotales] = useState<WalletTotalSaldo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [monedaId, setMonedaId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await WalletService.getWalletsConSaldo()
      setItems(result.items)
      setTotales(result.totales_por_moneda)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el listado")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const visibles = useMemo(() => {
    const needle = normalizeSearchText(search)
    const filtrados = items.filter((item) => {
      if (monedaId && !item.balances.some((b) => b.currency_id === monedaId)) return false
      if (!needle) return true
      return normalizeSearchText(`${item.user_nombre} ${item.user_ci}`).includes(needle)
    })
    if (!monedaId) return filtrados
    // Con una moneda elegida, primero quien más tiene en ella.
    const montoEn = (item: WalletConSaldo) =>
      item.balances.find((b) => b.currency_id === monedaId)?.amount ?? 0
    return [...filtrados].sort((a, b) => montoEn(b) - montoEn(a))
  }, [items, search, monedaId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 pr-8">
            <div className="rounded-full p-1.5 bg-emerald-100 shrink-0">
              <Banknote className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-slate-800">
                Billeteras con saldo
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading
                  ? "Cargando..."
                  : `${items.length} billetera${items.length === 1 ? "" : "s"} con más de 0 en alguna moneda`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              title="Actualizar"
            >
              <RefreshCcw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {totales.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {totales.map((total) => {
                const activa = monedaId === total.currency_id
                return (
                  <button
                    key={total.currency_id}
                    type="button"
                    onClick={() => setMonedaId(activa ? null : total.currency_id)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${
                      activa
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    title={activa ? "Quitar filtro" : `Ver solo quien tiene ${total.currency_code}`}
                  >
                    <p className="text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {formatAmount(total.amount)} {total.currency_code}
                    </p>
                    <p className="text-[11px] text-slate-500 whitespace-nowrap">
                      {total.currency_name} · {total.cantidad_billeteras} billetera
                      {total.cantidad_billeteras === 1 ? "" : "s"}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o CI"
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : visibles.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-16">
              {items.length === 0 ? "Nadie tiene saldo ahora mismo" : "Ninguna billetera coincide con el filtro"}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibles.map((item) => (
                <li
                  key={item.wallet_id}
                  className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {(item.user_nombre || item.user_ci).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.user_nombre}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        CI {item.user_ci}
                        {item.estado === "bloqueada" && (
                          <Badge variant="outline" className="border-rose-200 text-rose-600 text-[10px] px-1.5 py-0">
                            Bloqueada
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end pl-12 sm:pl-0">
                    {item.balances.map((balance) => (
                      <div
                        key={balance.currency_id}
                        className={`rounded-lg border px-2.5 py-1 text-right ${
                          monedaId === balance.currency_id
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                          {formatAmount(balance.amount)} {balance.currency_code}
                        </p>
                        <p className="text-[10px] text-slate-500 whitespace-nowrap">
                          {balance.currency_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
