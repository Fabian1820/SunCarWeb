"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
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
import { Loader2, Landmark } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  useOfertasConfeccion,
  type OfertaConfeccion,
} from "@/hooks/use-ofertas-confeccion"
import { useTransferenciaBancaria } from "@/hooks/use-transferencia-bancaria"
import { BancoService } from "@/lib/api-services"
import type { Banco } from "@/lib/types/feats/wallet/banco-types"
import type {
  TransferenciaBancaria,
  TransferenciaBancariaCreateData,
  TransferenciaBancariaEstado,
  TransferenciaBancariaMoneda,
} from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types"

// Origen desde el que se abre el diálogo (Leads/Clientes). CONTRATO DE PROPS
// EXACTO — otros dos agentes importan este componente en paralelo con esta
// firma: no cambiar nombres ni tipos.
export interface TransferenciaBancariaOrigen {
  tipo: "lead" | "cliente"
  id: string // lead.id o cliente.id
  numero?: string // cliente.numero (solo aplica si tipo === "cliente")
  nombre: string
  telefono?: string
  direccion?: string
}

export interface TransferenciaBancariaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  origen: TransferenciaBancariaOrigen
  onSuccess?: () => void
}

interface ComprobanteClienteLocal {
  url: string
  nombre: string
  tamano?: number
  mimeType?: string
}

interface FormState {
  banco_id: string
  monto: string
  moneda: TransferenciaBancariaMoneda
  tasa_cambio: string
  nombre_completo_cliente: string
  pais_residencia: string
  tipo_documento_identidad: string
  numero_documento_identidad: string
  direccion_residencia: string
  telefono: string
  correo: string
  contacto_en_cuba: string
  direccion_instalacion_cuba: string
  notas: string
}

const MONEDAS: TransferenciaBancariaMoneda[] = ["USD", "EUR", "CUP", "MLC"]

const ESTADO_LABELS: Record<TransferenciaBancariaEstado, string> = {
  pendiente: "Pendiente",
  procesando: "Procesando",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
}

const ESTADO_BADGE_VARIANT: Record<
  TransferenciaBancariaEstado,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendiente: "secondary",
  procesando: "outline",
  aceptada: "default",
  rechazada: "destructive",
  cancelada: "outline",
}

const getDefaultForm = (
  origen: TransferenciaBancariaOrigen,
  oferta: OfertaConfeccion | null,
): FormState => ({
  banco_id: "",
  monto: oferta && typeof oferta.precio_final === "number" ? String(oferta.precio_final) : "",
  moneda: (oferta?.moneda_pago as TransferenciaBancariaMoneda | undefined) ?? "USD",
  tasa_cambio: oferta?.tasa_cambio ? String(oferta.tasa_cambio) : "1",
  nombre_completo_cliente: origen.nombre ?? "",
  pais_residencia: "",
  tipo_documento_identidad: "",
  numero_documento_identidad: "",
  direccion_residencia: "",
  telefono: origen.telefono ?? "",
  correo: "",
  contacto_en_cuba: "",
  direccion_instalacion_cuba: origen.direccion ?? "",
  notas: "",
})

const formFromExistente = (t: TransferenciaBancaria): FormState => ({
  banco_id: t.bancoId,
  monto: String(t.monto),
  moneda: t.moneda,
  tasa_cambio: String(t.tasaCambio),
  nombre_completo_cliente: t.nombreCompletoCliente,
  pais_residencia: t.paisResidencia,
  tipo_documento_identidad: t.tipoDocumentoIdentidad,
  numero_documento_identidad: t.numeroDocumentoIdentidad,
  direccion_residencia: t.direccionResidencia,
  telefono: t.telefono,
  correo: t.correo ?? "",
  contacto_en_cuba: t.contactoEnCuba ?? "",
  direccion_instalacion_cuba: t.direccionInstalacionCuba,
  notas: t.notas ?? "",
})

const formatMonto = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const ARCHIVOS_VALIDOS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]

export function TransferenciaBancariaDialog({
  open,
  onOpenChange,
  origen,
  onSuccess,
}: TransferenciaBancariaDialogProps) {
  const { toast } = useToast()
  const { obtenerOfertaPorLead, obtenerOfertaPorCliente } = useOfertasConfeccion({
    autoLoad: false,
  })
  const {
    transferencia: existente,
    loading: loadingTransferencia,
    guardando,
    subiendoComprobante,
    error,
    buscarPorOferta,
    crear,
    actualizar,
    cancelar,
    subirComprobante,
    clearError,
    limpiar,
  } = useTransferenciaBancaria()

  const [ofertasConfirmadas, setOfertasConfirmadas] = useState<OfertaConfeccion[]>([])
  const [loadingOfertas, setLoadingOfertas] = useState(false)
  const [ofertaSeleccionadaId, setOfertaSeleccionadaId] = useState<string | null>(null)

  const [bancos, setBancos] = useState<Banco[]>([])
  const [loadingBancos, setLoadingBancos] = useState(false)

  const [nuevaTrasResuelta, setNuevaTrasResuelta] = useState(false)
  const [form, setForm] = useState<FormState>(() => getDefaultForm(origen, null))
  const [comprobanteCliente, setComprobanteCliente] =
    useState<ComprobanteClienteLocal | null>(null)

  // Reset general al abrir/cerrar el diálogo.
  useEffect(() => {
    if (!open) {
      limpiar()
      setOfertasConfirmadas([])
      setOfertaSeleccionadaId(null)
      setNuevaTrasResuelta(false)
      setBancos([])
      setComprobanteCliente(null)
      return
    }

    let cancelled = false

    const cargarOfertas = async () => {
      setLoadingOfertas(true)
      try {
        const resultado =
          origen.tipo === "lead"
            ? await obtenerOfertaPorLead(origen.id)
            : await obtenerOfertaPorCliente(origen.numero || origen.id)
        if (cancelled) return
        const confirmadas = (resultado.ofertas || []).filter(
          (o) => o.estado === "confirmada_por_cliente",
        )
        setOfertasConfirmadas(confirmadas)
        if (confirmadas.length === 1) {
          setOfertaSeleccionadaId(confirmadas[0].id)
        }
      } finally {
        if (!cancelled) setLoadingOfertas(false)
      }
    }

    const cargarBancos = async () => {
      setLoadingBancos(true)
      try {
        const data = await BancoService.listarOpciones()
        if (!cancelled) setBancos(data)
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Error",
            description:
              err instanceof Error ? err.message : "No se pudieron cargar los bancos",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoadingBancos(false)
      }
    }

    cargarOfertas()
    cargarBancos()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, origen.tipo, origen.id, origen.numero])

  // Al fijar la oferta, buscar si ya existe una transferencia asociada.
  useEffect(() => {
    if (!open || !ofertaSeleccionadaId) return
    setNuevaTrasResuelta(false)
    buscarPorOferta(ofertaSeleccionadaId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ofertaSeleccionadaId])

  // Prellenar el formulario según haya (o no) una transferencia existente.
  useEffect(() => {
    if (!open || !ofertaSeleccionadaId || loadingTransferencia) return

    if (existente && !nuevaTrasResuelta) {
      setForm(formFromExistente(existente))
      setComprobanteCliente(
        existente.comprobanteCliente
          ? {
              url: existente.comprobanteCliente.url,
              nombre: existente.comprobanteCliente.nombre,
              tamano: existente.comprobanteCliente.tamano,
              mimeType: existente.comprobanteCliente.mimeType,
            }
          : null,
      )
      return
    }

    const ofertaSel =
      ofertasConfirmadas.find((o) => o.id === ofertaSeleccionadaId) ?? null
    setForm(getDefaultForm(origen, ofertaSel))
    setComprobanteCliente(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ofertaSeleccionadaId, existente, nuevaTrasResuelta, loadingTransferencia])

  // Errores del hook (búsqueda/crear/actualizar/cancelar/subir) → toast.
  useEffect(() => {
    if (!error) return
    toast({ title: "Error", description: error, variant: "destructive" })
    clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!ARCHIVOS_VALIDOS.includes(file.type)) {
        toast({
          title: "Archivo inválido",
          description: "Solo se permiten imágenes (JPG, PNG, WEBP) o PDF",
          variant: "destructive",
        })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no puede superar los 5MB",
          variant: "destructive",
        })
        return
      }

      try {
        const res = await subirComprobante(file)
        setComprobanteCliente({
          url: res.url,
          nombre: res.filename,
          tamano: res.size,
          mimeType: res.content_type,
        })
      } catch {
        // el error ya quedó reflejado en `error` y se muestra por el efecto de arriba
      }
    },
    [subirComprobante, toast],
  )

  const validar = (): string | null => {
    if (!ofertaSeleccionadaId) return "Seleccione la oferta correspondiente"
    if (!form.banco_id) return "Seleccione el banco destino"
    const monto = parseFloat(form.monto)
    if (!Number.isFinite(monto) || monto <= 0) return "El monto debe ser mayor a 0"
    if (form.moneda !== "USD") {
      const tasa = parseFloat(form.tasa_cambio)
      if (!Number.isFinite(tasa) || tasa <= 0) return "La tasa de cambio debe ser mayor a 0"
    }
    if (!form.nombre_completo_cliente.trim()) return "Falta el nombre completo del cliente"
    if (!form.pais_residencia.trim()) return "Falta el país de residencia"
    if (!form.tipo_documento_identidad.trim()) return "Falta el tipo de documento de identidad"
    if (!form.numero_documento_identidad.trim()) return "Falta el número de documento de identidad"
    if (!form.direccion_residencia.trim()) return "Falta la dirección de residencia"
    if (!form.telefono.trim()) return "Falta el teléfono"
    if (!form.direccion_instalacion_cuba.trim()) return "Falta la dirección de instalación en Cuba"
    return null
  }

  const enModoEdicion = !!existente && existente.estado === "pendiente" && !nuevaTrasResuelta

  const handleGuardar = async () => {
    const mensajeError = validar()
    if (mensajeError) {
      toast({ title: "Datos incompletos", description: mensajeError, variant: "destructive" })
      return
    }

    const payload: TransferenciaBancariaCreateData = {
      oferta_id: ofertaSeleccionadaId as string,
      banco_id: form.banco_id,
      monto: parseFloat(form.monto),
      moneda: form.moneda,
      tasa_cambio: form.moneda === "USD" ? 1 : parseFloat(form.tasa_cambio) || 1,
      nombre_completo_cliente: form.nombre_completo_cliente.trim(),
      pais_residencia: form.pais_residencia.trim(),
      tipo_documento_identidad: form.tipo_documento_identidad.trim(),
      numero_documento_identidad: form.numero_documento_identidad.trim(),
      direccion_residencia: form.direccion_residencia.trim(),
      telefono: form.telefono.trim(),
      direccion_instalacion_cuba: form.direccion_instalacion_cuba.trim(),
      correo: form.correo.trim() || undefined,
      contacto_en_cuba: form.contacto_en_cuba.trim() || undefined,
      notas: form.notas.trim() || undefined,
      ...(comprobanteCliente
        ? {
            comprobante_cliente: {
              url: comprobanteCliente.url,
              nombre: comprobanteCliente.nombre,
              tamano: comprobanteCliente.tamano ?? 0,
              mime_type: comprobanteCliente.mimeType ?? "application/octet-stream",
            },
          }
        : {}),
    }

    if (origen.tipo === "lead") {
      payload.lead_id = origen.id
    } else {
      payload.cliente_id = origen.id
      if (origen.numero) payload.cliente_numero = origen.numero
    }

    try {
      if (enModoEdicion && existente) {
        await actualizar(existente.id, payload)
        toast({
          title: "Transferencia actualizada",
          description: "Los datos se guardaron correctamente",
        })
      } else {
        await crear(payload)
        toast({
          title: "Transferencia registrada",
          description: "Queda pendiente de aprobación por el administrador del banco",
        })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch {
      // el error ya quedó reflejado en `error` y se muestra por el efecto de arriba
    }
  }

  const handleCancelarTransferencia = async () => {
    if (!existente) return
    if (!window.confirm("¿Cancelar esta transferencia bancaria pendiente?")) return
    try {
      await cancelar(existente.id)
      toast({ title: "Transferencia cancelada" })
    } catch {
      // el error ya quedó reflejado en `error` y se muestra por el efecto de arriba
    }
  }

  const origenLabel = origen.tipo === "lead" ? "lead" : "cliente"

  const renderResumenExistente = (t: TransferenciaBancaria) => (
    <div className="space-y-2 rounded-md border p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="font-medium flex items-center gap-2">
          <Landmark className="h-4 w-4" /> Transferencia bancaria
        </span>
        <Badge variant={ESTADO_BADGE_VARIANT[t.estado]}>{ESTADO_LABELS[t.estado]}</Badge>
      </div>
      <p className="text-sm text-gray-600">Banco: {t.bancoNombre}</p>
      <p className="text-sm text-gray-600">
        Monto: {formatMonto(t.monto)} {t.moneda}
      </p>
      <p className="text-sm text-gray-600">Cliente: {t.nombreCompletoCliente}</p>
      {t.estado === "rechazada" && t.motivoRechazo && (
        <p className="text-sm text-red-600">Motivo del rechazo: {t.motivoRechazo}</p>
      )}
      {t.comprobanteCliente && (
        <a
          href={t.comprobanteCliente.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 underline block"
        >
          Ver comprobante ({t.comprobanteCliente.nombre})
        </a>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Transferencia bancaria — {origen.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loadingOfertas ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando ofertas confirmadas...
            </div>
          ) : ofertasConfirmadas.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Este {origenLabel} no tiene ninguna oferta confirmada. La transferencia
              bancaria solo puede registrarse para una oferta que el cliente ya confirmó.
            </div>
          ) : (
            <>
              {/* Selección de oferta */}
              <div className="space-y-2">
                <Label>Oferta confirmada</Label>
                {ofertasConfirmadas.length === 1 ? (
                  <div className="rounded-md border bg-gray-50 p-3 text-sm">
                    <span className="font-medium">
                      {ofertasConfirmadas[0].numero_oferta || ofertasConfirmadas[0].id}
                    </span>{" "}
                    — {formatMonto(ofertasConfirmadas[0].precio_final)}{" "}
                    {ofertasConfirmadas[0].moneda_pago ?? ""}
                  </div>
                ) : (
                  <Select
                    value={ofertaSeleccionadaId ?? undefined}
                    onValueChange={(value) => setOfertaSeleccionadaId(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una oferta" />
                    </SelectTrigger>
                    <SelectContent>
                      {ofertasConfirmadas.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {(o.numero_oferta || o.id) +
                            " — " +
                            formatMonto(o.precio_final) +
                            " " +
                            (o.moneda_pago ?? "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {ofertaSeleccionadaId && loadingTransferencia && (
                <div className="flex items-center gap-2 text-sm text-gray-600 py-4 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando transferencias
                  existentes...
                </div>
              )}

              {ofertaSeleccionadaId && !loadingTransferencia && existente && existente.estado === "procesando" && !nuevaTrasResuelta && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Se está procesando la aceptación, no se puede editar.
                  </div>
                  {renderResumenExistente(existente)}
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cerrar
                    </Button>
                  </div>
                </>
              )}

              {ofertaSeleccionadaId &&
                !loadingTransferencia &&
                existente &&
                !nuevaTrasResuelta &&
                (existente.estado === "aceptada" ||
                  existente.estado === "rechazada" ||
                  existente.estado === "cancelada") && (
                  <>
                    {renderResumenExistente(existente)}
                    <div className="flex justify-between items-center pt-2">
                      <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                      </Button>
                      <Button onClick={() => setNuevaTrasResuelta(true)}>
                        Registrar una nueva transferencia para esta oferta
                      </Button>
                    </div>
                  </>
                )}

              {ofertaSeleccionadaId &&
                !loadingTransferencia &&
                (!existente || existente.estado === "pendiente" || nuevaTrasResuelta) && (
                  <div className="space-y-4">
                    {/* Banco destino */}
                    <div className="space-y-2">
                      <Label htmlFor="banco_id">
                        Banco destino <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.banco_id || undefined}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, banco_id: value }))}
                        disabled={loadingBancos}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingBancos ? "Cargando bancos..." : "Seleccione un banco"} />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Monto / Moneda */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monto">
                          Monto <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="monto"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={form.monto}
                          onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="moneda">
                          Moneda <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={form.moneda}
                          onValueChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              moneda: value as TransferenciaBancariaMoneda,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONEDAS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Tasa de cambio (solo si moneda != USD) */}
                    {form.moneda !== "USD" && (
                      <div className="space-y-2">
                        <Label htmlFor="tasa_cambio">
                          Tasa de cambio <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="tasa_cambio"
                          type="number"
                          step="any"
                          min="0.01"
                          value={form.tasa_cambio}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, tasa_cambio: e.target.value }))
                          }
                        />
                      </div>
                    )}

                    {/* Comprobante del cliente */}
                    <div className="space-y-2">
                      <Label htmlFor="comprobante_cliente">
                        Comprobante del cliente (opcional)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="comprobante_cliente"
                          type="file"
                          accept={ARCHIVOS_VALIDOS.join(",")}
                          onChange={handleFileChange}
                          disabled={subiendoComprobante}
                          className="flex-1"
                        />
                        {subiendoComprobante && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      {comprobanteCliente && (
                        <p className="text-xs text-green-600">
                          ✓ Comprobante ya subido: {comprobanteCliente.nombre}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Formatos permitidos: JPG, PNG, WEBP, PDF (máx. 5MB)
                      </p>
                    </div>

                    {/* Datos de facturación */}
                    <div className="border-t pt-4 space-y-4">
                      <p className="text-sm font-medium text-gray-700">
                        Datos de facturación
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="nombre_completo_cliente">
                          Nombre completo del cliente <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nombre_completo_cliente"
                          value={form.nombre_completo_cliente}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              nombre_completo_cliente: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pais_residencia">
                            País de residencia <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="pais_residencia"
                            value={form.pais_residencia}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, pais_residencia: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">
                            Teléfono <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="telefono"
                            value={form.telefono}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, telefono: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_documento_identidad">
                            Tipo de documento de identidad <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="tipo_documento_identidad"
                            value={form.tipo_documento_identidad}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                tipo_documento_identidad: e.target.value,
                              }))
                            }
                            placeholder="Ej: Carnet de identidad, Pasaporte"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero_documento_identidad">
                            Número de documento de identidad{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="numero_documento_identidad"
                            value={form.numero_documento_identidad}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                numero_documento_identidad: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direccion_residencia">
                          Dirección del cliente en el país de residencia{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="direccion_residencia"
                          value={form.direccion_residencia}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              direccion_residencia: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="correo">Correo</Label>
                        <Input
                          id="correo"
                          type="email"
                          value={form.correo}
                          onChange={(e) => setForm((prev) => ({ ...prev, correo: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contacto_en_cuba">Datos de contacto en Cuba</Label>
                        <Input
                          id="contacto_en_cuba"
                          value={form.contacto_en_cuba}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, contacto_en_cuba: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direccion_instalacion_cuba">
                          Dirección de instalación en Cuba <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="direccion_instalacion_cuba"
                          value={form.direccion_instalacion_cuba}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              direccion_instalacion_cuba: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                      <Label htmlFor="notas">Notas (opcional)</Label>
                      <Textarea
                        id="notas"
                        value={form.notas}
                        onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-between items-center gap-3 pt-4">
                      <div>
                        {enModoEdicion && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleCancelarTransferencia}
                            disabled={guardando}
                          >
                            Cancelar transferencia
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenChange(false)}
                          disabled={guardando}
                        >
                          Cancelar
                        </Button>
                        <Button type="button" onClick={handleGuardar} disabled={guardando}>
                          {guardando ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                            </>
                          ) : (
                            "Guardar"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}

          {!loadingOfertas && ofertasConfirmadas.length === 0 && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
