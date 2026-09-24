"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { AdjuntoComprobanteField } from "@/components/feats/wallet/adjunto-comprobante-field";
import { useToast } from "@/hooks/use-toast";
import { useMyWalletPermiso } from "@/hooks/use-wallet-permisos";
import { useTransferenciasBancariasPendientes } from "@/hooks/use-transferencias-bancarias-pendientes";
import { TransferenciaBancariaService } from "@/lib/api-services";
import type { TransferenciaBancaria } from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types";
import { RegistroTrazabilidad } from "@/components/shared/molecule/registro-trazabilidad";

const formatMoney = (amount: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const formatFecha = (date: Date | null): string => {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("es-CU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const esImagen = (mimeType: string | undefined | null): boolean =>
  !!mimeType && mimeType.startsWith("image/");

/**
 * Botón/link que abre el comprobante (imagen o PDF) en una pestaña nueva,
 * replicando el patrón visual de `ComprobanteButton`/`ComprobanteAdjuntoSection`
 * de `app/wallet/page.tsx` (esas funciones no están exportadas de ese archivo,
 * por eso se replica su comportamiento en vez de importarlas).
 */
function ComprobanteLink({
  url,
  nombre,
  mimeType,
}: {
  url: string;
  nombre: string;
  mimeType?: string | null;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
    >
      {esImagen(mimeType) ? (
        <img
          src={url}
          alt={nombre}
          className="h-10 w-10 rounded object-cover border border-slate-200 shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-slate-400" />
        </div>
      )}
      <span className="text-xs text-slate-700 truncate flex-1 min-w-0">
        {nombre}
      </span>
      <Download className="h-3.5 w-3.5 text-slate-400 shrink-0" />
    </a>
  );
}

function CampoDetalle({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
        {label}
      </p>
      <p className="text-sm text-slate-700 break-words">{value || "—"}</p>
    </div>
  );
}

interface TransferenciaBancariaDetalleAdminDialogProps {
  transferencia: TransferenciaBancaria | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResuelto?: () => void;
}

/**
 * Diálogo de detalle para el admin de wallet: muestra todos los datos de
 * facturación recopilados por la comercial, el comprobante del cliente,
 * permite subir un comprobante propio opcional y Aceptar/Rechazar la
 * transferencia (rechazar exige motivo).
 */
export function TransferenciaBancariaDetalleAdminDialog({
  transferencia,
  open,
  onOpenChange,
  onResuelto,
}: TransferenciaBancariaDetalleAdminDialogProps) {
  const { toast } = useToast();
  const { permiso } = useMyWalletPermiso();
  // El hook está pensado para la alerta (lista + acciones), pero expone
  // `aceptar`/`rechazar` igual de válidos para cualquier transferencia del
  // mismo banco, así que se reusa aquí en vez de duplicar esas llamadas.
  const { aceptar, rechazar, procesando } =
    useTransferenciasBancariasPendientes(
      transferencia?.bancoId ?? null,
      false,
    );

  const [comprobanteAdminFile, setComprobanteAdminFile] =
    useState<File | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  useEffect(() => {
    if (open) {
      setComprobanteAdminFile(null);
      setMotivoRechazo("");
      setMostrarRechazo(false);
    }
  }, [open, transferencia?.id]);

  if (!transferencia) return null;

  const esAdminWallet = !!permiso?.esAdmin;

  const handleAceptar = async () => {
    try {
      let comprobanteAdmin;
      if (comprobanteAdminFile) {
        setSubiendoComprobante(true);
        const subido = await TransferenciaBancariaService.subirComprobante(
          comprobanteAdminFile,
        );
        comprobanteAdmin = {
          comprobante_admin_url: subido.url,
          comprobante_admin_nombre: subido.filename,
          comprobante_admin_tamano: subido.size,
          comprobante_admin_mime_type: subido.content_type,
        };
      }
      await aceptar(transferencia.id, comprobanteAdmin);
      toast({
        title: "Transferencia aceptada",
        description: `Se registró el ingreso en ${transferencia.bancoNombre} y el pago correspondiente.`,
      });
      onResuelto?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo aceptar la transferencia bancaria",
        variant: "destructive",
      });
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const handleRechazar = async () => {
    if (motivoRechazo.trim().length < 5) return;
    try {
      await rechazar(transferencia.id, motivoRechazo.trim());
      toast({
        title: "Transferencia rechazada",
        description: "Se notificó el rechazo con el motivo indicado.",
      });
      onResuelto?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo rechazar la transferencia bancaria",
        variant: "destructive",
      });
    }
  };

  const ocupado = procesando || subiendoComprobante;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transferencia bancaria pendiente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50">
            <CampoDetalle label="Banco" value={transferencia.bancoNombre} />
            <CampoDetalle label="Oferta" value={transferencia.ofertaId} />
            <CampoDetalle
              label="Monto"
              value={formatMoney(transferencia.monto, transferencia.moneda)}
            />
            <CampoDetalle
              label="Tasa de cambio"
              value={String(transferencia.tasaCambio)}
            />
            {transferencia.montoUsd != null && (
              <CampoDetalle
                label="Equivalente USD"
                value={formatMoney(transferencia.montoUsd, "USD")}
              />
            )}
            <CampoDetalle
              label="Creada"
              value={formatFecha(transferencia.createdAt)}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Datos de facturación (recopilados por la comercial)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoDetalle
                label="Nombre completo"
                value={transferencia.nombreCompletoCliente}
              />
              <CampoDetalle
                label="País de residencia"
                value={transferencia.paisResidencia}
              />
              <CampoDetalle
                label="Tipo de documento"
                value={transferencia.tipoDocumentoIdentidad}
              />
              <CampoDetalle
                label="Número de documento"
                value={transferencia.numeroDocumentoIdentidad}
              />
              <CampoDetalle
                label="Dirección de residencia"
                value={transferencia.direccionResidencia}
              />
              <CampoDetalle label="Teléfono" value={transferencia.telefono} />
              <CampoDetalle label="Correo" value={transferencia.correo} />
              <CampoDetalle
                label="Contacto en Cuba"
                value={transferencia.contactoEnCuba}
              />
              <CampoDetalle
                label="Dirección de instalación en Cuba"
                value={transferencia.direccionInstalacionCuba}
              />
            </div>
            {transferencia.notas && (
              <div className="mt-3">
                <CampoDetalle label="Notas" value={transferencia.notas} />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Comprobante del cliente
            </p>
            {transferencia.comprobanteCliente ? (
              <ComprobanteLink
                url={transferencia.comprobanteCliente.url}
                nombre={transferencia.comprobanteCliente.nombre}
                mimeType={transferencia.comprobanteCliente.mimeType}
              />
            ) : (
              <p className="text-xs text-slate-400">
                La comercial no adjuntó comprobante.
              </p>
            )}
          </div>

          {esAdminWallet && (
            <div>
              <AdjuntoComprobanteField
                file={comprobanteAdminFile}
                onChange={setComprobanteAdminFile}
                disabled={ocupado}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Opcional: tu propio comprobante (distinto del que subió la
                comercial), se adjunta al aceptar.
              </p>
            </div>
          )}

          {!esAdminWallet && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Necesitas permiso de admin de wallet para aceptar o rechazar
              esta transferencia.
            </div>
          )}

          {esAdminWallet && mostrarRechazo && (
            <div className="space-y-1.5 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <Label className="text-xs text-rose-700">
                Motivo del rechazo (obligatorio)
              </Label>
              <Textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Explica por qué se rechaza esta transferencia (mín. 5 caracteres)"
                rows={3}
                className="resize-none text-sm bg-white"
                disabled={ocupado}
              />
            </div>
          )}
          <RegistroTrazabilidad recurso="transferencias-bancarias" id={transferencia?.id} />
        </div>

        {esAdminWallet && (
          <DialogFooter className="flex gap-2 sm:justify-between">
            {mostrarRechazo ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMostrarRechazo(false)}
                  disabled={ocupado}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => void handleRechazar()}
                  disabled={ocupado || motivoRechazo.trim().length < 5}
                >
                  {ocupado ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Confirmar rechazo
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
                  onClick={() => setMostrarRechazo(true)}
                  disabled={ocupado}
                >
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </Button>
                <Button
                  type="button"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => void handleAceptar()}
                  disabled={ocupado}
                >
                  {ocupado ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Aceptar
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
