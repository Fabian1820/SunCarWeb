"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  ContactoPicker,
  type ContactoSeleccionado,
} from "@/components/feats/citas/contacto-picker";
import type {
  CitaCreateData,
  CitaEspontaneaData,
  Disponibilidad,
} from "@/lib/types/feats/citas/citas-types";

const CONTACTO_VACIO: ContactoSeleccionado = {
  cliente_numero: null,
  lead_id: null,
  contacto_nombre: "",
  contacto_telefono: "",
};

interface CitaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "agendada" reserva un slot; "espontanea" registra a quien llegó sin cita. */
  modo: "agendada" | "espontanea";
  agenda: Disponibilidad | null;
  /** Slot preseleccionado al pulsar un hueco libre de la rejilla. */
  inicial?: { comercial_ci: string; hora_inicio: string } | null;
  guardando: boolean;
  onCrear: (data: CitaCreateData) => Promise<boolean>;
  onCrearEspontanea: (data: CitaEspontaneaData) => Promise<boolean>;
}

export function CitaFormDialog({
  open,
  onOpenChange,
  modo,
  agenda,
  inicial,
  guardando,
  onCrear,
  onCrearEspontanea,
}: CitaFormDialogProps) {
  const [contacto, setContacto] = useState<ContactoSeleccionado>(CONTACTO_VACIO);
  const [comercialCi, setComercialCi] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const esEspontanea = modo === "espontanea";

  useEffect(() => {
    if (!open) return;
    setContacto(CONTACTO_VACIO);
    setComercialCi(inicial?.comercial_ci || "");
    setHoraInicio(inicial?.hora_inicio || "");
    setMotivo("");
    setNotas("");
    setErrorLocal(null);
  }, [open, inicial]);

  // En espontánea atiende una comercial de WhatsApp; en agendada, una de las
  // que ese día recibe visitas.
  const comerciales = esEspontanea
    ? (agenda?.comerciales_whatsapp || []).map((c) => ({
        ci: c.comercial_ci,
        nombre: c.comercial_nombre,
      }))
    : (agenda?.comerciales || []).map((c) => ({
        ci: c.comercial_ci,
        nombre: c.comercial_nombre,
      }));

  // Solo se ofrecen los slots que esa comercial tiene libres: proponer uno
  // ocupado solo sirve para que el backend lo rechace después.
  const slotsLibres =
    agenda?.comerciales
      .find((c) => c.comercial_ci === comercialCi)
      ?.slots.filter((s) => s.libre) ?? [];

  const handleGuardar = async () => {
    setErrorLocal(null);

    if (!comercialCi) {
      setErrorLocal("Elige la comercial.");
      return;
    }
    if (!esEspontanea && !horaInicio) {
      setErrorLocal("Elige la hora de la cita.");
      return;
    }
    if (!contacto.cliente_numero && !contacto.lead_id && !contacto.contacto_nombre.trim()) {
      setErrorLocal("Indica a nombre de quién es la cita.");
      return;
    }

    const base = {
      comercial_ci: comercialCi,
      cliente_numero: contacto.cliente_numero || null,
      lead_id: contacto.lead_id || null,
      contacto_nombre: contacto.contacto_nombre.trim() || null,
      contacto_telefono: contacto.contacto_telefono?.trim() || null,
      motivo: motivo.trim() || null,
      notas: notas.trim() || null,
    };

    const ok = esEspontanea
      ? await onCrearEspontanea({ ...base, fecha: agenda?.fecha })
      : await onCrear({
          ...base,
          fecha: agenda!.fecha,
          hora_inicio: horaInicio,
        });

    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esEspontanea ? "Registrar visita sin cita" : "Agendar cita"}
          </DialogTitle>
          <DialogDescription>
            {esEspontanea
              ? "Alguien llegó sin cita. Queda registrado como atendido por una comercial de WhatsApp."
              : `Reserva un horario del ${agenda?.fecha ?? ""} con una comercial.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ContactoPicker
            value={contacto}
            onChange={setContacto}
            disabled={guardando}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cita-comercial">Comercial</Label>
              <Select
                value={comercialCi}
                onValueChange={(v) => {
                  setComercialCi(v);
                  setHoraInicio("");
                }}
                disabled={guardando}
              >
                <SelectTrigger id="cita-comercial">
                  <SelectValue placeholder="Elegir comercial..." />
                </SelectTrigger>
                <SelectContent>
                  {comerciales.map((c) => (
                    <SelectItem key={c.ci} value={c.ci}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {comerciales.length === 0 && (
                <p className="text-xs text-amber-700">
                  {esEspontanea
                    ? "Ninguna comercial atiende WhatsApp ese día. Configúralo primero."
                    : "Ninguna comercial recibe visitas ese día. Configúralo primero."}
                </p>
              )}
            </div>

            {!esEspontanea && (
              <div className="space-y-1.5">
                <Label htmlFor="cita-hora">Hora</Label>
                <Select
                  value={horaInicio}
                  onValueChange={setHoraInicio}
                  disabled={guardando || !comercialCi}
                >
                  <SelectTrigger id="cita-hora">
                    <SelectValue
                      placeholder={
                        comercialCi ? "Elegir hora..." : "Elige comercial primero"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsLibres.map((s) => (
                      <SelectItem key={s.hora_inicio} value={s.hora_inicio}>
                        {s.hora_inicio} – {s.hora_fin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {comercialCi && slotsLibres.length === 0 && (
                  <p className="text-xs text-amber-700">
                    Esa comercial no tiene horarios libres ese día.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cita-motivo">Motivo</Label>
            <Input
              id="cita-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="A qué viene (ej. ver oferta, firmar contrato...)"
              disabled={guardando}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cita-notas">Notas</Label>
            <Textarea
              id="cita-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Cualquier detalle útil para la comercial"
              rows={3}
              disabled={guardando}
            />
          </div>

          {errorLocal && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">
              {errorLocal}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {esEspontanea ? "Registrar visita" : "Agendar cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
