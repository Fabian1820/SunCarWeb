"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/shared/molecule/sheet"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Badge } from "@/components/shared/atom/badge"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Loader2,
  Plus,
  RefreshCcw,
  CreditCard,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WalletService } from "@/lib/api-services"
import type {
  Wallet,
  WalletCurrency,
  WalletTransaction,
} from "@/lib/types/feats/wallet/wallet-types"

interface StripePaidSession {
  sessionId: string
  amountTotal: number
  currency: string
  customerEmail: string | null
  paymentLinkId: string | null
  receiptUrl: string | null
}

interface BancoGlobalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatMoney = (amount: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const formatDateTime = (value: string): string => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("es-CU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Havana",
  })
}

export function BancoGlobalSheet({ open, onOpenChange }: BancoGlobalSheetProps) {
  const { toast } = useToast()

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [currencies, setCurrencies] = useState<WalletCurrency[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Stripe sync
  const [stripeSessions, setStripeSessions] = useState<StripePaidSession[]>([])
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [importingSessionId, setImportingSessionId] = useState<string | null>(null)
  const [showStripePanel, setShowStripePanel] = useState(false)

  // Form nueva transacción
  const [showForm, setShowForm] = useState(false)
  const [formTipo, setFormTipo] = useState<"ingreso" | "gasto">("ingreso")
  const [formMonto, setFormMonto] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
  const [formCurrencyId, setFormCurrencyId] = useState("")
  const [formReferencia, setFormReferencia] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bancoData, currenciesData] = await Promise.all([
        WalletService.getBancoGlobal({ limit: 50 }),
        WalletService.getCurrencies(),
      ])
      setWallet(bancoData.wallet)
      setTransactions(bancoData.transacciones)
      setTotalTransactions(bancoData.total)
      setCurrencies(currenciesData)
      if (!formCurrencyId && currenciesData.length > 0) {
        setFormCurrencyId(currenciesData[0].id)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo cargar el Banco Global",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, formCurrencyId])

  useEffect(() => {
    if (open) void loadData()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveTransaction = async () => {
    const montoNum = parseFloat(formMonto)
    if (!formCurrencyId || !formMonto || isNaN(montoNum) || montoNum <= 0) {
      toast({ title: "Error", description: "Completa todos los campos correctamente", variant: "destructive" })
      return
    }
    if (formMotivo.trim().length < 5) {
      toast({ title: "Error", description: "El motivo debe tener al menos 5 caracteres", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await WalletService.createBancoGlobalTransaction({
        tipo: formTipo,
        currency_id: formCurrencyId,
        monto: montoNum,
        motivo: formMotivo.trim(),
        referencia_externa: formReferencia.trim() || undefined,
      })
      toast({ title: "Transacción registrada", description: `${formTipo === "ingreso" ? "Ingreso" : "Gasto"} añadido al Banco CubespAuto` })
      setFormMonto("")
      setFormMotivo("")
      setFormReferencia("")
      setShowForm(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar la transacción",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const loadStripeSessions = async () => {
    setLoadingStripe(true)
    try {
      const res = await fetch("/api/stripe/listar-pagos?limit=50")
      const data = await res.json()
      setStripeSessions(Array.isArray(data.pagos) ? data.pagos : [])
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los pagos de Stripe", variant: "destructive" })
    } finally {
      setLoadingStripe(false)
    }
  }

  const importStripeSession = async (session: StripePaidSession) => {
    const usdCurrency = currencies.find(
      (c) => c.codigo === "USD" || c.codigo === session.currency.toUpperCase()
    )
    if (!usdCurrency) {
      toast({ title: "Error", description: "No se encontró la moneda correspondiente. Créala primero.", variant: "destructive" })
      return
    }

    setImportingSessionId(session.sessionId)
    try {
      const amountInUnits = session.amountTotal / 100
      await WalletService.createBancoGlobalTransaction({
        tipo: "ingreso",
        currency_id: usdCurrency.id,
        monto: amountInUnits,
        motivo: `Pago Stripe${session.customerEmail ? ` — ${session.customerEmail}` : ""}`,
        referencia_externa: session.sessionId,
      })
      toast({ title: "Importado", description: `Pago de ${formatMoney(amountInUnits, session.currency.toUpperCase())} añadido al banco` })
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo importar el pago",
        variant: "destructive",
      })
    } finally {
      setImportingSessionId(null)
    }
  }

  const totalBalance = wallet?.balances?.reduce((sum, b) => sum + b.amount, 0) ?? wallet?.saldo_actual ?? 0
  const primaryCurrency = wallet?.balances?.[0]?.currency_code ?? wallet?.moneda ?? "USD"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5 text-blue-600" />
            Banco CubespAuto
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Saldo */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 p-5 text-white shadow-lg">
              <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">Saldo Global</p>
              <p className="text-3xl font-bold">{formatMoney(totalBalance, primaryCurrency)}</p>
              {wallet?.balances && wallet.balances.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {wallet.balances.map((b) => (
                    <span key={b.currency_id} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                      {b.currency_code}: {b.amount.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-blue-300 mt-2">{totalTransactions} movimientos totales</p>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                onClick={() => { setShowForm(true); setFormTipo("ingreso") }}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Ingreso
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => { setShowForm(true); setFormTipo("gasto") }}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Gasto
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setShowStripePanel(!showStripePanel)
                  if (!showStripePanel) void loadStripeSessions()
                }}
              >
                <CreditCard className="h-4 w-4 text-purple-600" />
                Sync Stripe
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadData}
                disabled={loading}
                className="gap-1.5 ml-auto"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Formulario nueva transacción */}
            {showForm && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {formTipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"}
                  </h3>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={formTipo === "ingreso" ? "default" : "outline"}
                    onClick={() => setFormTipo("ingreso")}
                    className="flex-1 gap-1"
                  >
                    <ArrowDownCircle className="h-3.5 w-3.5" />
                    Ingreso
                  </Button>
                  <Button
                    size="sm"
                    variant={formTipo === "gasto" ? "default" : "outline"}
                    onClick={() => setFormTipo("gasto")}
                    className="flex-1 gap-1"
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    Gasto
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={formMonto}
                      onChange={(e) => setFormMonto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Moneda</Label>
                    <Select value={formCurrencyId} onValueChange={setFormCurrencyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.codigo} — {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Motivo</Label>
                  <Textarea
                    placeholder="Descripción del movimiento (mín. 5 caracteres)"
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Referencia externa (opcional)</Label>
                  <Input
                    placeholder="Nº factura, ID pago, etc."
                    value={formReferencia}
                    onChange={(e) => setFormReferencia(e.target.value)}
                  />
                </div>

                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleSaveTransaction}
                  className="w-full gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Guardar
                </Button>
              </div>
            )}

            {/* Panel Stripe Sync */}
            {showStripePanel && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    Pagos confirmados en Stripe
                  </h3>
                  <Button size="sm" variant="ghost" onClick={loadStripeSessions} disabled={loadingStripe}>
                    <RefreshCcw className={`h-3.5 w-3.5 ${loadingStripe ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <p className="text-xs text-purple-600">
                  Selecciona un pago para importarlo como ingreso al banco. Solo importa lo que aún no hayas agregado.
                </p>

                {loadingStripe ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : stripeSessions.length === 0 ? (
                  <p className="text-xs text-center text-slate-500 py-3">No hay pagos recientes en Stripe</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stripeSessions.map((s) => {
                      const amount = s.amountTotal / 100
                      const isImporting = importingSessionId === s.sessionId
                      return (
                        <div
                          key={s.sessionId}
                          className="flex items-center justify-between rounded-lg bg-white border border-purple-100 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {formatMoney(amount, s.currency.toUpperCase())}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {s.customerEmail ?? "Sin email"} · {s.sessionId.slice(0, 18)}…
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isImporting}
                            onClick={() => void importStripeSession(s)}
                            className="ml-3 shrink-0 text-xs"
                          >
                            {isImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Importar"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Historial de transacciones */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Movimientos recientes
                {totalTransactions > transactions.length && (
                  <span className="ml-1 text-xs text-slate-400 font-normal">
                    (mostrando {transactions.length} de {totalTransactions})
                  </span>
                )}
              </h3>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm border rounded-xl bg-slate-50">
                  Sin movimientos registrados
                </div>
              ) : (
                <div className="space-y-1.5">
                  {transactions.map((t) => {
                    const isIngreso = t.tipo === "ingreso"
                    return (
                      <div
                        key={t.id}
                        className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5"
                      >
                        <div className={`mt-0.5 shrink-0 ${isIngreso ? "text-emerald-500" : "text-rose-500"}`}>
                          {isIngreso
                            ? <ArrowDownCircle className="h-4 w-4" />
                            : <ArrowUpCircle className="h-4 w-4" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold ${isIngreso ? "text-emerald-700" : "text-rose-700"}`}>
                              {isIngreso ? "+" : "-"}{formatMoney(t.monto, t.currency_code ?? "USD")}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {t.currency_code ?? "USD"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 truncate">{t.motivo}</p>
                          {t.referencia_externa && (
                            <p className="text-xs text-slate-400 truncate">Ref: {t.referencia_externa}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(t.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
