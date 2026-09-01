"use client";

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
  ESQUEMAS_PAGO_PRESETS,
  ESQUEMA_PAGO_PERSONALIZADO,
  ESQUEMA_PAGO_POR_DEFECTO,
  HITOS_ESQUEMA_PAGO,
  esEsquemaPagoValido,
  sumaEsquemaPago,
  type EsquemaPago,
} from "@/lib/utils/esquema-pago";

interface EsquemaPagoSelectorProps {
  /** Preset elegido, "personalizado" o "por_defecto". */
  value: string;
  onValueChange: (value: string) => void;
  /** Porcentajes del modo personalizado; se ignoran en los demás modos. */
  personalizado: EsquemaPago;
  onPersonalizadoChange: (esquema: EsquemaPago) => void;
  disabled?: boolean;
  /** Se muestra un aviso: los pagos acordados ganan sobre el esquema. */
  hayPagosAcordados?: boolean;
  idPrefix?: string;
}

/**
 * Elige el reparto porcentual de los tres hitos de pago que se imprime en la
 * oferta. Se usa en la confección y en el diálogo de exportación; en ambos
 * casos el valor termina guardado en la oferta.
 */
export function EsquemaPagoSelector({
  value,
  onValueChange,
  personalizado,
  onPersonalizadoChange,
  disabled = false,
  hayPagosAcordados = false,
  idPrefix = "esquema-pago",
}: EsquemaPagoSelectorProps) {
  const esPersonalizado = value === ESQUEMA_PAGO_PERSONALIZADO;
  const suma = sumaEsquemaPago(personalizado);
  const personalizadoValido = esEsquemaPagoValido(personalizado);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-600" htmlFor={`${idPrefix}-select`}>
        Esquema de pago
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={`${idPrefix}-select`}>
          <SelectValue placeholder="Selecciona un esquema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ESQUEMA_PAGO_POR_DEFECTO}>
            Por defecto (el de los términos)
          </SelectItem>
          {ESQUEMAS_PAGO_PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value={ESQUEMA_PAGO_PERSONALIZADO}>
            Personalizado
          </SelectItem>
        </SelectContent>
      </Select>

      {esPersonalizado && (
        <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-3 gap-2">
            {HITOS_ESQUEMA_PAGO.map((hito) => (
              <div key={hito.key} className="space-y-1">
                <Label
                  className="text-[11px] text-slate-500"
                  htmlFor={`${idPrefix}-${hito.key}`}
                >
                  {hito.label}
                </Label>
                <Input
                  id={`${idPrefix}-${hito.key}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={personalizado[hito.key]}
                  disabled={disabled}
                  onChange={(e) =>
                    onPersonalizadoChange({
                      ...personalizado,
                      [hito.key]: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <p
            className={`text-[11px] ${
              personalizadoValido ? "text-slate-500" : "text-red-600"
            }`}
          >
            {personalizadoValido
              ? "Suma 100 %."
              : `Los tres porcentajes deben sumar 100 % (suman ${suma} %).`}
          </p>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Cambia solo los porcentajes de la sección &quot;Formas de pago&quot; de
        la oferta exportada. El resto del texto viene de los términos y
        condiciones.
      </p>

      {hayPagosAcordados && value !== ESQUEMA_PAGO_POR_DEFECTO && (
        <p className="text-[11px] text-amber-700">
          Esta oferta tiene pagos acordados: en el PDF sale la sección &quot;Pagos
          acordados&quot; y este esquema no se imprime.
        </p>
      )}
    </div>
  );
}
