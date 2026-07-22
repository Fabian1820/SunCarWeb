"use client"

import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import {
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  UserCheck,
  ListChecks,
  PhoneForwarded,
  Edit,
  Download,
  Navigation,
  Globe,
  Zap,
  Battery,
  Sun,
  Radio,
  Copy,
  type LucideIcon,
} from "lucide-react"
import type { Cliente, ClienteFoto } from "@/lib/api-types"
import { downloadFile } from "@/lib/utils/download-file"
import { compareStrings } from "@/lib/utils/string-utils"
import { extraerComponentesDeOfertaConfeccion } from "@/lib/utils/oferta-confeccion-items"
import { useToast } from "@/hooks/use-toast"

interface ClienteDetallesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onEdit?: (cliente: Cliente) => void
  onDownloadComprobante?: (cliente: Cliente) => Promise<void>
  fotosCliente?: ClienteFoto[]
  loadingFotosCliente?: boolean
}

/** Fila compacta "etiqueta encima del valor", igual al patrón usado en el panel de detalle de Lead. */
function ClienteInfoRow({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon?: LucideIcon
  label: string
  value?: ReactNode
  strong?: boolean
}) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm text-gray-900 break-words mt-0.5 ${strong ? "font-semibold" : "font-medium"}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

/** Estados válidos de Cliente (ver Select de estado en create/edit-client-dialog). */
function getEstadoBadge(estado?: string): { className: string; label: string } {
  if (!estado) return { className: "text-gray-600 bg-transparent border-transparent hover:bg-transparent", label: "Sin estado" }
  const estadosConfig: Record<string, string> = {
    "Esperando equipo": "text-amber-600",
    "No interesado": "text-slate-500",
    "Pendiente de instalación": "text-green-600",
    "Pendiente de visita": "text-blue-600",
    "Equipo instalado con éxito": "text-emerald-600",
    "Instalación en Proceso": "text-blue-600",
  }
  const textColor = estadosConfig[estado.trim()] || "text-gray-600"
  return { className: `${textColor} bg-transparent border-transparent hover:bg-transparent`, label: estado }
}

/** Mismo mapeo canónico de 5 colores que components/shared/atom/priority-dot.tsx */
const PRIORIDAD_DOT_COLOR: Record<string, string> = {
  Urgente: "bg-purple-500",
  Alta: "bg-red-500",
  Media: "bg-emerald-500",
  Baja: "bg-blue-500",
  Ninguna: "bg-gray-400",
}

export function ClienteDetallesDialog({
  open,
  onOpenChange,
  cliente,
  onEdit,
  onDownloadComprobante,
  fotosCliente,
  loadingFotosCliente = false,
}: ClienteDetallesDialogProps) {
  const { toast } = useToast()

  if (!cliente) return null

  const hasLocation =
    cliente.latitud !== undefined && cliente.latitud !== null && cliente.longitud !== undefined && cliente.longitud !== null
  const latNumber = hasLocation
    ? typeof cliente.latitud === "number"
      ? cliente.latitud
      : parseFloat(cliente.latitud as string)
    : null
  const lngNumber = hasLocation
    ? typeof cliente.longitud === "number"
      ? cliente.longitud
      : parseFloat(cliente.longitud as string)
    : null

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateString
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
    return dateString
  }

  const formatTipoPersona = (tipoPersona?: string) => {
    if (!tipoPersona) return null
    const normalized = tipoPersona.trim().toLowerCase()
    if (normalized === "natural") return "Natural"
    if (normalized === "juridica" || normalized === "jurídica") return "Jurídica"
    return tipoPersona
  }

  const tipoPersonaLabel = formatTipoPersona(cliente.tipo_persona)
  const documentoLabel = tipoPersonaLabel === "Jurídica" ? "NIT Empresa" : "Carnet de Identidad"

  const handleDownloadComprobante = async () => {
    if (!cliente.comprobante_pago_url) return
    try {
      if (onDownloadComprobante) {
        await onDownloadComprobante(cliente)
        return
      }
      await downloadFile(cliente.comprobante_pago_url, `comprobante-cliente-${cliente.nombre || cliente.id || "archivo"}`)
    } catch (error) {
      console.error("Error downloading comprobante for cliente", cliente.id, error)
    }
  }

  const fotos = fotosCliente ?? cliente.fotos ?? []

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v|avi|mkv|3gp)(\?|#|$)/i.test(url)

  const formatFechaArchivo = (value?: string) => {
    if (!value) return "Sin fecha"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString("es-ES")
  }

  const handleDownloadArchivo = async (url: string, index: number) => {
    try {
      await downloadFile(url, `cliente-${cliente.numero}-archivo-${index + 1}`)
    } catch (error) {
      console.error("Error descargando archivo del cliente", cliente.numero, error)
    }
  }

  // Oferta: prioriza oferta_confeccion (real, vigente) sobre el legacy cliente.ofertas[]
  const ofertaLegacy = (cliente.ofertas ?? []).find(
    (o) => o.inversor_codigo || o.bateria_codigo || o.panel_codigo || o.elementos_personalizados,
  )
  const oc = cliente.oferta_confeccion
  type Componente = { cantidad: number; descripcion: string }
  let inv: Componente | null = null
  let bats: Componente[] = []
  let pan: Componente | null = null
  let elementoPersonalizado: string | null = null

  if (oc && oc.items?.length) {
    ;({ inv, bats, pan } = extraerComponentesDeOfertaConfeccion(oc))
  } else if (ofertaLegacy) {
    if (ofertaLegacy.inversor_codigo && ofertaLegacy.inversor_cantidad > 0) {
      inv = { cantidad: ofertaLegacy.inversor_cantidad, descripcion: ofertaLegacy.inversor_nombre || ofertaLegacy.inversor_codigo }
    }
    if (ofertaLegacy.bateria_codigo && ofertaLegacy.bateria_cantidad > 0) {
      bats = [{ cantidad: ofertaLegacy.bateria_cantidad, descripcion: ofertaLegacy.bateria_nombre || ofertaLegacy.bateria_codigo }]
    }
    if (ofertaLegacy.panel_codigo && ofertaLegacy.panel_cantidad > 0) {
      pan = { cantidad: ofertaLegacy.panel_cantidad, descripcion: ofertaLegacy.panel_nombre || ofertaLegacy.panel_codigo }
    }
    if (ofertaLegacy.elementos_personalizados) {
      elementoPersonalizado = ofertaLegacy.elementos_personalizados
    }
  }
  const hayOferta = Boolean(inv || bats.length > 0 || pan || elementoPersonalizado)

  const costoOferta = ofertaLegacy?.costo_oferta || 0
  const costoExtra = ofertaLegacy?.costo_extra || 0
  const costoTransporte = ofertaLegacy?.costo_transporte || 0
  const costoFinal = costoOferta + costoExtra + costoTransporte
  const hayCostos = Boolean(ofertaLegacy) || Boolean(cliente.metodo_pago || cliente.moneda || cliente.comprobante_pago_url)

  const estadoBadge = getEstadoBadge(cliente.estado)

  const handleCopyDatosPrincipales = async () => {
    const lineas = [
      cliente.nombre && `Nombre: ${cliente.nombre}`,
      cliente.direccion && `Dirección: ${cliente.direccion}`,
      cliente.provincia_montaje && `Provincia: ${cliente.provincia_montaje}`,
      cliente.municipio && `Municipio: ${cliente.municipio}`,
      cliente.telefono && `Teléfono: ${cliente.telefono}`,
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lineas.join("\n"))
      toast({ title: "Datos copiados", description: "Se copiaron los datos principales del cliente." })
    } catch (error) {
      console.error("Error al copiar datos del cliente", error)
      toast({ title: "No se pudo copiar", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4 pr-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base font-semibold text-emerald-700">
                {cliente.nombre?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold text-gray-900">{cliente.nombre}</DialogTitle>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge className={`${estadoBadge.className} px-2 py-0.5 text-xs`}>{estadoBadge.label}</Badge>
                  {cliente.prioridad && cliente.prioridad !== "Ninguna" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORIDAD_DOT_COLOR[cliente.prioridad] || "bg-gray-400"}`} />
                      {cliente.prioridad}
                    </span>
                  )}
                  {cliente.es_trabajador_suncar && (
                    <Badge className="bg-violet-100 px-2 py-0.5 text-xs text-violet-700">Trabajador SunCar</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyDatosPrincipales}
              className="h-7 shrink-0 gap-1.5 px-2 text-xs text-gray-600 hover:text-gray-900"
              title="Copiar datos principales (nombre, dirección, provincia, municipio, teléfono)"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Identificación */}
            <section>
              <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Identificación</h4>
              <div className="space-y-2.5">
                <ClienteInfoRow label="Código de cliente" value={`N° ${cliente.numero}`} />
                <ClienteInfoRow icon={CreditCard} label={documentoLabel} value={cliente.carnet_identidad} />
                <ClienteInfoRow label="Tipo de persona" value={tipoPersonaLabel} />
              </div>
            </section>

            {/* Contacto */}
            <section className="border-t border-gray-100 pt-5">
              <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contacto</h4>
              <div className="space-y-2.5">
                <ClienteInfoRow icon={Phone} label="Teléfono" value={cliente.telefono} />
                <ClienteInfoRow icon={PhoneForwarded} label="Teléfono adicional" value={cliente.telefono_adicional} />
                <ClienteInfoRow icon={Globe} label="País de contacto" value={cliente.pais_contacto} />
                <ClienteInfoRow label="Referencia" value={cliente.referencia} />
              </div>
            </section>

            {/* Ubicación */}
            {(cliente.direccion || cliente.provincia_montaje || cliente.municipio) && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ubicación</h4>
                <div className="space-y-2.5">
                  <ClienteInfoRow icon={MapPin} label="Dirección" value={cliente.direccion} />
                  <ClienteInfoRow label="Provincia" value={cliente.provincia_montaje} />
                  <ClienteInfoRow label="Municipio" value={cliente.municipio} />
                  {hasLocation && latNumber !== null && lngNumber !== null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber) && (
                    <ClienteInfoRow
                      icon={Navigation}
                      label="Coordenadas GPS"
                      value={`${latNumber.toFixed(6)}, ${lngNumber.toFixed(6)}`}
                    />
                  )}
                </div>
              </section>
            )}

            {/* Seguimiento */}
            <section className="border-t border-gray-100 pt-5">
              <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Seguimiento</h4>
              <div className="space-y-2.5">
                <ClienteInfoRow icon={Calendar} label="Fecha de contacto" value={formatDate(cliente.fecha_contacto)} />
                <ClienteInfoRow icon={Radio} label="Fuente" value={cliente.fuente} />
                <ClienteInfoRow icon={UserCheck} label="Comercial asignado" value={cliente.comercial} />
                {compareStrings(cliente.estado || "", "Pendiente de visita") && (
                  <ClienteInfoRow label="Motivo de visita" value={cliente.motivo_visita} />
                )}
              </div>
            </section>

            {/* Instalación */}
            {(cliente.fecha_montaje || cliente.fecha_instalacion || cliente.falta_instalacion) && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Instalación</h4>
                <div className="space-y-2.5">
                  <ClienteInfoRow icon={Calendar} label="Fecha de inicio" value={formatDate(cliente.fecha_montaje)} />
                  <ClienteInfoRow icon={Calendar} label="Fecha de fin" value={formatDate(cliente.fecha_instalacion)} />
                  {cliente.falta_instalacion &&
                    (compareStrings(cliente.estado || "", "Instalación en Proceso") ||
                      compareStrings(cliente.estado || "", "Equipo instalado con éxito")) && (
                      <div>
                        <p className="text-xs text-gray-500">¿Qué le falta a la instalación?</p>
                        <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-amber-50 p-3 text-sm text-gray-700 border border-amber-200">
                          {cliente.falta_instalacion}
                        </p>
                      </div>
                    )}
                </div>
              </section>
            )}

            {/* Oferta */}
            {hayOferta && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Oferta</h4>
                <div className="space-y-2.5">
                  <ClienteInfoRow
                    icon={Zap}
                    label="Inversor"
                    value={inv ? `${inv.descripcion} · Cant: ${inv.cantidad}` : undefined}
                  />
                  {bats.map((b, idx) => (
                    <ClienteInfoRow
                      key={`bat-${idx}`}
                      icon={Battery}
                      label="Batería"
                      value={`${b.descripcion} · Cant: ${b.cantidad}`}
                    />
                  ))}
                  <ClienteInfoRow
                    icon={Sun}
                    label="Paneles"
                    value={pan ? `${pan.descripcion} · Cant: ${pan.cantidad}` : undefined}
                  />
                  {ofertaLegacy && (ofertaLegacy.aprobada || ofertaLegacy.pagada) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {ofertaLegacy.aprobada && (
                        <Badge className="bg-green-100 px-2 py-0.5 text-xs text-green-700">Oferta aprobada</Badge>
                      )}
                      {ofertaLegacy.pagada && (
                        <Badge className="bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Oferta pagada</Badge>
                      )}
                    </div>
                  )}
                  <ClienteInfoRow label="Elementos personalizados" value={elementoPersonalizado} />
                </div>
              </section>
            )}

            {/* Costos y Pago */}
            {hayCostos && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Costos y pago</h4>
                <div className="space-y-2.5">
                  {ofertaLegacy && (
                    <>
                      <ClienteInfoRow label="Costo de oferta" value={`$${costoOferta.toFixed(2)}`} />
                      {costoExtra > 0 && <ClienteInfoRow label="Costo extra" value={`$${costoExtra.toFixed(2)}`} />}
                      {costoTransporte > 0 && (
                        <ClienteInfoRow label="Costo de transporte" value={`$${costoTransporte.toFixed(2)}`} />
                      )}
                      <ClienteInfoRow strong label="Costo final" value={`$${costoFinal.toFixed(2)}`} />
                    </>
                  )}
                  <ClienteInfoRow label="Método de pago" value={cliente.metodo_pago} />
                  <ClienteInfoRow label="Moneda" value={cliente.moneda} />
                  {cliente.comprobante_pago_url && (
                    <Button type="button" variant="outline" size="sm" onClick={handleDownloadComprobante} className="mt-1 w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar comprobante
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Evidencias */}
            <section className="border-t border-gray-100 pt-5">
              <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Evidencias</h4>
              {loadingFotosCliente && <p className="text-sm text-gray-500">Cargando archivos...</p>}
              {!loadingFotosCliente && fotos.length === 0 && <p className="text-sm text-gray-500">Este cliente no tiene archivos subidos.</p>}
              {!loadingFotosCliente && fotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {fotos.map((archivo, index) => (
                    <div key={`${archivo.url}-${index}`} className="rounded-md border border-gray-100 p-2">
                      <div className="mb-2 h-24 w-full overflow-hidden rounded bg-black/5">
                        {isVideoUrl(archivo.url) ? (
                          <video src={archivo.url} controls className="h-full w-full object-cover" />
                        ) : (
                          <img src={archivo.url} alt={`Evidencia ${index + 1}`} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <Badge className="border-blue-200 bg-blue-100 px-1.5 py-0 text-[10px] text-blue-700">
                          {archivo.tipo === "instalacion" ? "Instalación" : "Avería"}
                        </Badge>
                        <span className="text-[10px] text-gray-500">{formatFechaArchivo(archivo.fecha)}</span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(archivo.url, "_blank")}
                          className="h-7 flex-1 px-1 text-xs"
                        >
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDownloadArchivo(archivo.url, index)}
                          className="h-7 flex-1 px-1 text-xs"
                        >
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Comentarios */}
            {cliente.comentario && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Comentarios</h4>
                <p className="whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                  {cliente.comentario}
                </p>
              </section>
            )}

            {/* Elementos Personalizados */}
            {cliente.elementos_personalizados && cliente.elementos_personalizados.length > 0 && (
              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  <ListChecks className="h-3.5 w-3.5" />
                  Elementos personalizados
                </h4>
                <div className="divide-y divide-gray-100">
                  {cliente.elementos_personalizados.map((elemento, index) => (
                    <div key={index} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-900">{elemento.descripcion}</span>
                      <span className="ml-4 font-medium text-gray-500">Cant: {elemento.cantidad}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onEdit(cliente)
                onOpenChange(false)
              }}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar cliente
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
