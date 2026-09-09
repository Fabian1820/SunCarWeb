"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Camera, MapPin, Plus, Trash2, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Tipos — deben calzar EXACTO (mismos nombres de campo) con
// SunCarBackend/domain/entities/estudio_energetico.py, porque este objeto se
// envía tal cual como Visita.estudio_energetico.
// ---------------------------------------------------------------------------

export interface ValorPorFase {
  a?: number;
  b?: number;
  c?: number;
}

export interface PuntoSuministro {
  numero_metrocontador?: string;
  tiene_pgd?: boolean;
}

export interface ConsumoAcometida {
  consumo_anual_kwh?: number;
  sistema?: "monofasico" | "trifasico";
  tension_por_fase?: ValorPorFase;
  corriente_por_fase?: ValorPorFase;
  corriente_neutro?: number;
}

export interface Vivienda {
  tipo?: "casa" | "edificio" | "biplanta";
  piso?: number;
  estado_edificacion?: "buena" | "regular" | "mala";
}

export type TipoCubierta =
  | "teja"
  | "zinc"
  | "placa"
  | "asfaltica"
  | "terracota"
  | "asbesto_cemento";

export interface InstalacionPaneles {
  ubicacion?: "techo" | "terreno";
  tipo_cubierta?: TipoCubierta;
  forma_techo?: "dos_aguas" | "plano" | "otro";
  forma_techo_otro?: string;
  buenas_condiciones?: boolean;
  orientacion?: "norte" | "sur" | "este" | "oeste";
  area_disponible_m2?: number;
  inclinacion_grados?: number;
  altura_superficie_m?: number;
  necesita_escaleras_andamios?: boolean;
  porciento_sombra?: number;
  existe_puesta_tierra?: boolean;
}

export interface EquipamientoEstimado {
  modelo_inversor?: string;
  potencia_inversor_kw?: number;
  cantidad_inversores?: number;
  modelo_bateria?: string;
  capacidad_bateria_kwh?: number;
  cantidad_baterias?: number;
  es_modular?: boolean;
  cantidad_paneles?: number;
  strings?: number;
  voltaje?: number;
  potencia_total_kwp?: number;
  restriccion_horario_laboral?: boolean;
  tiene_wifi_ethernet?: boolean;
}

export interface Protecciones {
  proteccion_ca_entrada_amp?: number;
  proteccion_ca_backup_amp?: number;
  proteccion_cd_amp?: number;
}

export interface Cableado {
  ubicacion_inversor?: "cubierto" | "intemperie";
  descripcion_lugar?: string;
  longitud_linea_ca_m?: number;
  longitud_linea_cd_m?: number;
  distancia_inversor_pgd_m?: number;
}

export interface CargaElectrica {
  descripcion: string;
  potencia_unitaria_kw?: number;
  cantidad?: number;
  es_vital?: boolean;
}

export interface UbicacionGPS {
  latitud?: number;
  longitud?: number;
}

export interface EstudioEnergeticoData {
  ubicacion_gps?: UbicacionGPS;
  punto_suministro?: PuntoSuministro;
  consumo_acometida?: ConsumoAcometida;
  vivienda?: Vivienda;
  instalara_paneles?: boolean;
  instalacion_paneles?: InstalacionPaneles;
  equipamiento_estimado?: EquipamientoEstimado;
  protecciones?: Protecciones;
  cableado?: Cableado;
  cargas_instaladas?: CargaElectrica[];
  observaciones?: string;
}

export const ESTUDIO_ENERGETICO_VACIO: EstudioEnergeticoData = {};

/** Foto seleccionada localmente, pendiente de subir (aún no tiene URL real). */
export interface FotoSeleccionada {
  file: File;
  nombre: string;
  previewUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers de estado inmutable (actualizar un sub-objeto sin pisar el resto)
// ---------------------------------------------------------------------------

function withPatch<T extends object>(
  base: T | undefined,
  patch: Partial<T>,
): T {
  return { ...(base as T), ...patch };
}

// Un valor vacío de <Input type="number"> llega como "" — lo normalizamos a
// undefined en vez de guardar NaN/0 falsos.
function parseNumberInput(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

interface FieldGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FieldGroup({ title, description, children }: FieldGroupProps) {
  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold">{title}</Label>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

interface NumField {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
}

function NumberField({ label, value, onChange, suffix }: NumField) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(parseNumberInput(e.target.value))}
        placeholder="—"
      />
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}

function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
      />
    </div>
  );
}

interface BoolFieldProps {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}

function BoolField({ label, value, onChange }: BoolFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm sm:col-span-2">
      <Checkbox
        checked={value === true}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      {label}
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: { value: T; label: string }[];
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps<T>) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(v) => onChange(v as T)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface FotoSlotProps {
  label: string;
  value: FotoSeleccionada | null;
  onChange: (foto: FotoSeleccionada | null) => void;
  inputId: string;
}

function FotoSlot({ label, value, onChange, inputId }: FotoSlotProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onChange({ file, nombre: file.name, previewUrl: URL.createObjectURL(file) });
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <img
            src={value.previewUrl}
            alt={label}
            className="h-10 w-10 rounded object-cover"
          />
          <span className="flex-1 truncate text-xs text-gray-600">
            {value.nombre}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => {
              URL.revokeObjectURL(value.previewUrl);
              onChange(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 p-2 text-xs text-gray-500 cursor-pointer hover:border-emerald-400"
        >
          <Camera className="h-4 w-4" />
          Tomar/adjuntar foto
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export interface EstudioEnergeticoFormProps {
  value: EstudioEnergeticoData;
  onChange: (value: EstudioEnergeticoData) => void;

  fotoFachada: FotoSeleccionada | null;
  onFotoFachadaChange: (f: FotoSeleccionada | null) => void;
  fotoMetrocontador: FotoSeleccionada | null;
  onFotoMetrocontadorChange: (f: FotoSeleccionada | null) => void;
  fotoPgd: FotoSeleccionada | null;
  onFotoPgdChange: (f: FotoSeleccionada | null) => void;
  fotoAreaInstalacion: FotoSeleccionada | null;
  onFotoAreaInstalacionChange: (f: FotoSeleccionada | null) => void;
}

export function EstudioEnergeticoForm({
  value,
  onChange,
  fotoFachada,
  onFotoFachadaChange,
  fotoMetrocontador,
  onFotoMetrocontadorChange,
  fotoPgd,
  onFotoPgdChange,
  fotoAreaInstalacion,
  onFotoAreaInstalacionChange,
}: EstudioEnergeticoFormProps) {
  const instalaPaneles = value.instalara_paneles === true;
  const esTecho = value.instalacion_paneles?.ubicacion === "techo";
  const esEdificioOBiplanta =
    value.vivienda?.tipo === "edificio" || value.vivienda?.tipo === "biplanta";

  // La ubicación NO se captura sola al abrir el formulario: a veces se
  // rellena estando en la oficina, no en casa del cliente/lead, y capturar
  // el GPS del dispositivo en ese caso guardaría una ubicación incorrecta.
  // Se pide explícitamente con este interruptor, y solo si está activado se
  // captura y se guarda.
  const [gpsStatus, setGpsStatus] = useState<
    "inactivo" | "obteniendo" | "ok" | "error" | "sin_soporte"
  >(value.ubicacion_gps?.latitud != null ? "ok" : "inactivo");
  const [enSitio, setEnSitio] = useState(value.ubicacion_gps?.latitud != null);

  const handleEnSitioChange = (activado: boolean) => {
    setEnSitio(activado);

    if (!activado) {
      setGpsStatus("inactivo");
      onChange({ ...value, ubicacion_gps: undefined });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("sin_soporte");
      return;
    }

    setGpsStatus("obteniendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...value,
          ubicacion_gps: {
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
          },
        });
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const desbalancePreview = useMemo(() => {
    const f = value.consumo_acometida?.corriente_por_fase;
    if (!f || f.a == null || f.b == null || f.c == null) return null;
    const valores = [f.a, f.b, f.c];
    const promedio = valores.reduce((s, v) => s + v, 0) / 3;
    if (!promedio) return null;
    const maxDesv = Math.max(...valores.map((v) => Math.abs(v - promedio)));
    return Math.round((maxDesv / promedio) * 10000) / 100;
  }, [value.consumo_acometida?.corriente_por_fase]);

  const cargas = value.cargas_instaladas ?? [];
  const cargaTotalKw = useMemo(
    () =>
      cargas.reduce((sum, c) => {
        if (c.potencia_unitaria_kw != null && c.cantidad) {
          return sum + c.potencia_unitaria_kw * c.cantidad;
        }
        return sum;
      }, 0),
    [cargas],
  );

  const setCargas = (nuevas: CargaElectrica[]) =>
    onChange({ ...value, cargas_instaladas: nuevas });

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Todos los campos son opcionales — rellena lo que se pueda obtener en la visita.
      </p>

      <div className="rounded-md border border-gray-200 p-3 space-y-1.5">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={enSitio}
            onCheckedChange={(checked) => handleEnSitioChange(checked === true)}
          />
          ¿Estás en la ubicación del cliente/lead ahora mismo?
        </label>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-6">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          {gpsStatus === "inactivo" && "No se guardará ubicación (marca la casilla si estás en el sitio)"}
          {gpsStatus === "obteniendo" && "Obteniendo ubicación..."}
          {gpsStatus === "ok" && value.ubicacion_gps && (
            <span>
              Ubicación capturada ({value.ubicacion_gps.latitud?.toFixed(5)},{" "}
              {value.ubicacion_gps.longitud?.toFixed(5)})
            </span>
          )}
          {gpsStatus === "error" && (
            <span>No se pudo obtener la ubicación (revisa el permiso del navegador)</span>
          )}
          {gpsStatus === "sin_soporte" && (
            <span>Este navegador no soporta geolocalización</span>
          )}
        </div>
      </div>

      {/* Foto general */}
      <FieldGroup title="Foto de la fachada">
        <FotoSlot
          label="Fachada de la vivienda"
          value={fotoFachada}
          onChange={onFotoFachadaChange}
          inputId="foto-fachada"
        />
      </FieldGroup>

      {/* Punto de suministro */}
      <FieldGroup title="Punto de suministro">
        <TextField
          label="Número de metrocontador"
          value={value.punto_suministro?.numero_metrocontador}
          onChange={(v) =>
            onChange({
              ...value,
              punto_suministro: withPatch(value.punto_suministro, {
                numero_metrocontador: v,
              }),
            })
          }
          placeholder="Puede no conocerse"
        />
        <FotoSlot
          label="Foto del metrocontador"
          value={fotoMetrocontador}
          onChange={onFotoMetrocontadorChange}
          inputId="foto-metrocontador"
        />
        <BoolField
          label="¿Tiene PGD (panel general de distribución)?"
          value={value.punto_suministro?.tiene_pgd}
          onChange={(v) =>
            onChange({
              ...value,
              punto_suministro: withPatch(value.punto_suministro, {
                tiene_pgd: v,
              }),
            })
          }
        />
        {value.punto_suministro?.tiene_pgd && (
          <FotoSlot
            label="Foto del PGD"
            value={fotoPgd}
            onChange={onFotoPgdChange}
            inputId="foto-pgd"
          />
        )}
      </FieldGroup>

      {/* Consumo y acometida */}
      <FieldGroup title="Consumo y acometida eléctrica">
        <NumberField
          label="Consumo eléctrico anual"
          suffix="kWh/año"
          value={value.consumo_acometida?.consumo_anual_kwh}
          onChange={(v) =>
            onChange({
              ...value,
              consumo_acometida: withPatch(value.consumo_acometida, {
                consumo_anual_kwh: v,
              }),
            })
          }
        />
        <SelectField
          label="Sistema"
          value={value.consumo_acometida?.sistema}
          onChange={(v) =>
            onChange({
              ...value,
              consumo_acometida: withPatch(value.consumo_acometida, {
                sistema: v,
              }),
            })
          }
          options={[
            { value: "monofasico", label: "Monofásico" },
            { value: "trifasico", label: "Trifásico" },
          ]}
        />

        <div className="sm:col-span-2 grid grid-cols-3 gap-2">
          <NumberField
            label="Tensión fase A"
            suffix="V"
            value={value.consumo_acometida?.tension_por_fase?.a}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  tension_por_fase: withPatch(
                    value.consumo_acometida?.tension_por_fase,
                    { a: v },
                  ),
                }),
              })
            }
          />
          <NumberField
            label="Tensión fase B"
            suffix="V"
            value={value.consumo_acometida?.tension_por_fase?.b}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  tension_por_fase: withPatch(
                    value.consumo_acometida?.tension_por_fase,
                    { b: v },
                  ),
                }),
              })
            }
          />
          <NumberField
            label="Tensión fase C"
            suffix="V"
            value={value.consumo_acometida?.tension_por_fase?.c}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  tension_por_fase: withPatch(
                    value.consumo_acometida?.tension_por_fase,
                    { c: v },
                  ),
                }),
              })
            }
          />
        </div>

        <div className="sm:col-span-2 grid grid-cols-3 gap-2">
          <NumberField
            label="Corriente fase A"
            suffix="A"
            value={value.consumo_acometida?.corriente_por_fase?.a}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  corriente_por_fase: withPatch(
                    value.consumo_acometida?.corriente_por_fase,
                    { a: v },
                  ),
                }),
              })
            }
          />
          <NumberField
            label="Corriente fase B"
            suffix="A"
            value={value.consumo_acometida?.corriente_por_fase?.b}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  corriente_por_fase: withPatch(
                    value.consumo_acometida?.corriente_por_fase,
                    { b: v },
                  ),
                }),
              })
            }
          />
          <NumberField
            label="Corriente fase C"
            suffix="A"
            value={value.consumo_acometida?.corriente_por_fase?.c}
            onChange={(v) =>
              onChange({
                ...value,
                consumo_acometida: withPatch(value.consumo_acometida, {
                  corriente_por_fase: withPatch(
                    value.consumo_acometida?.corriente_por_fase,
                    { c: v },
                  ),
                }),
              })
            }
          />
        </div>

        <NumberField
          label="Corriente por neutro"
          suffix="A"
          value={value.consumo_acometida?.corriente_neutro}
          onChange={(v) =>
            onChange({
              ...value,
              consumo_acometida: withPatch(value.consumo_acometida, {
                corriente_neutro: v,
              }),
            })
          }
        />
        {desbalancePreview !== null && (
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">% de desbalance</Label>
            <p className="text-sm font-medium pt-2">
              {desbalancePreview}% <span className="text-xs text-gray-400">(calculado)</span>
            </p>
          </div>
        )}
      </FieldGroup>

      {/* Vivienda */}
      <FieldGroup title="Vivienda">
        <SelectField
          label="Tipo de vivienda"
          value={value.vivienda?.tipo}
          onChange={(v) =>
            onChange({ ...value, vivienda: withPatch(value.vivienda, { tipo: v }) })
          }
          options={[
            { value: "casa", label: "Casa" },
            { value: "edificio", label: "Edificio" },
            { value: "biplanta", label: "Biplanta" },
          ]}
        />
        {esEdificioOBiplanta && (
          <NumberField
            label="Piso / planta"
            value={value.vivienda?.piso}
            onChange={(v) =>
              onChange({ ...value, vivienda: withPatch(value.vivienda, { piso: v }) })
            }
          />
        )}
        <SelectField
          label="Estado de la edificación"
          value={value.vivienda?.estado_edificacion}
          onChange={(v) =>
            onChange({
              ...value,
              vivienda: withPatch(value.vivienda, { estado_edificacion: v }),
            })
          }
          options={[
            { value: "buena", label: "Buena" },
            { value: "regular", label: "Regular" },
            { value: "mala", label: "Mala" },
          ]}
        />
      </FieldGroup>

      {/* ¿Instalará paneles? */}
      <FieldGroup title="¿Va a instalar paneles solares?">
        <BoolField
          label="Sí, instalará paneles solares"
          value={value.instalara_paneles}
          onChange={(v) => onChange({ ...value, instalara_paneles: v })}
        />
      </FieldGroup>

      {instalaPaneles && (
        <>
          {/* Ubicación e instalación */}
          <FieldGroup title="Ubicación e instalación">
            <SelectField
              label="Dónde se instalará"
              value={value.instalacion_paneles?.ubicacion}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    ubicacion: v,
                  }),
                })
              }
              options={[
                { value: "techo", label: "Techo" },
                { value: "terreno", label: "Terreno" },
              ]}
            />
            {esTecho && (
              <>
                <SelectField
                  label="Tipo de cubierta"
                  value={value.instalacion_paneles?.tipo_cubierta}
                  onChange={(v) =>
                    onChange({
                      ...value,
                      instalacion_paneles: withPatch(value.instalacion_paneles, {
                        tipo_cubierta: v,
                      }),
                    })
                  }
                  options={[
                    { value: "teja", label: "Teja" },
                    { value: "zinc", label: "Zinc" },
                    { value: "placa", label: "Placa" },
                    { value: "asfaltica", label: "Asfáltica" },
                    { value: "terracota", label: "Terracota" },
                    { value: "asbesto_cemento", label: "Asbesto-cemento" },
                  ]}
                />
                <SelectField
                  label="Forma del techo"
                  value={value.instalacion_paneles?.forma_techo}
                  onChange={(v) =>
                    onChange({
                      ...value,
                      instalacion_paneles: withPatch(value.instalacion_paneles, {
                        forma_techo: v,
                      }),
                    })
                  }
                  options={[
                    { value: "dos_aguas", label: "A dos aguas" },
                    { value: "plano", label: "Plano" },
                    { value: "otro", label: "Otro" },
                  ]}
                />
                {value.instalacion_paneles?.forma_techo === "otro" && (
                  <TextField
                    label="Describe la forma del techo"
                    value={value.instalacion_paneles?.forma_techo_otro}
                    onChange={(v) =>
                      onChange({
                        ...value,
                        instalacion_paneles: withPatch(value.instalacion_paneles, {
                          forma_techo_otro: v,
                        }),
                      })
                    }
                  />
                )}
                <FotoSlot
                  label="Foto del techo/área de instalación"
                  value={fotoAreaInstalacion}
                  onChange={onFotoAreaInstalacionChange}
                  inputId="foto-area-instalacion"
                />
              </>
            )}
            {!esTecho && value.instalacion_paneles?.ubicacion === "terreno" && (
              <FotoSlot
                label="Foto del área de instalación"
                value={fotoAreaInstalacion}
                onChange={onFotoAreaInstalacionChange}
                inputId="foto-area-instalacion"
              />
            )}
            <BoolField
              label="¿Buenas condiciones del área?"
              value={value.instalacion_paneles?.buenas_condiciones}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    buenas_condiciones: v,
                  }),
                })
              }
            />
            <SelectField
              label="Orientación de los paneles"
              value={value.instalacion_paneles?.orientacion}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    orientacion: v,
                  }),
                })
              }
              options={[
                { value: "norte", label: "Norte" },
                { value: "sur", label: "Sur" },
                { value: "este", label: "Este" },
                { value: "oeste", label: "Oeste" },
              ]}
            />
            <NumberField
              label="Área disponible"
              suffix="m²"
              value={value.instalacion_paneles?.area_disponible_m2}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    area_disponible_m2: v,
                  }),
                })
              }
            />
            <NumberField
              label="Inclinación de los paneles"
              suffix="°"
              value={value.instalacion_paneles?.inclinacion_grados}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    inclinacion_grados: v,
                  }),
                })
              }
            />
            <NumberField
              label="Altura de la superficie de instalación"
              suffix="m"
              value={value.instalacion_paneles?.altura_superficie_m}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    altura_superficie_m: v,
                  }),
                })
              }
            />
            <BoolField
              label="¿Necesita escaleras/andamios?"
              value={value.instalacion_paneles?.necesita_escaleras_andamios}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    necesita_escaleras_andamios: v,
                  }),
                })
              }
            />
            <NumberField
              label="% de sombra que afecta la generación"
              suffix="%"
              value={value.instalacion_paneles?.porciento_sombra}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    porciento_sombra: v,
                  }),
                })
              }
            />
            <BoolField
              label="¿Existe puesta a tierra?"
              value={value.instalacion_paneles?.existe_puesta_tierra}
              onChange={(v) =>
                onChange({
                  ...value,
                  instalacion_paneles: withPatch(value.instalacion_paneles, {
                    existe_puesta_tierra: v,
                  }),
                })
              }
            />
          </FieldGroup>
        </>
      )}

      {/* Fuera de la condicion de los paneles a proposito: puede haber
          inversor y baterias sin paneles, y las protecciones y el
          cableado hacen falta en cualquier instalacion. */}
      {/* Equipamiento estimado */}
      <FieldGroup title="Equipamiento estimado">
        <TextField
          label="Modelo de inversor"
          value={value.equipamiento_estimado?.modelo_inversor}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                modelo_inversor: v,
              }),
            })
          }
        />
        <NumberField
          label="Potencia del inversor"
          suffix="kW"
          value={value.equipamiento_estimado?.potencia_inversor_kw}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                potencia_inversor_kw: v,
              }),
            })
          }
        />
        <NumberField
          label="Cantidad de inversores"
          value={value.equipamiento_estimado?.cantidad_inversores}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                cantidad_inversores: v,
              }),
            })
          }
        />
        <TextField
          label="Modelo de batería"
          value={value.equipamiento_estimado?.modelo_bateria}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                modelo_bateria: v,
              }),
            })
          }
        />
        <NumberField
          label="Capacidad de batería"
          suffix="kWh"
          value={value.equipamiento_estimado?.capacidad_bateria_kwh}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                capacidad_bateria_kwh: v,
              }),
            })
          }
        />
        <NumberField
          label="Cantidad de baterías"
          value={value.equipamiento_estimado?.cantidad_baterias}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                cantidad_baterias: v,
              }),
            })
          }
        />
        <BoolField
          label="¿Es modular?"
          value={value.equipamiento_estimado?.es_modular}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                es_modular: v,
              }),
            })
          }
        />
        <NumberField
          label="Cantidad de paneles"
          value={value.equipamiento_estimado?.cantidad_paneles}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                cantidad_paneles: v,
              }),
            })
          }
        />
        <NumberField
          label="Strings"
          value={value.equipamiento_estimado?.strings}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                strings: v,
              }),
            })
          }
        />
        <NumberField
          label="Voltaje"
          value={value.equipamiento_estimado?.voltaje}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                voltaje: v,
              }),
            })
          }
        />
        <NumberField
          label="Potencia total"
          suffix="kWp"
          value={value.equipamiento_estimado?.potencia_total_kwp}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                potencia_total_kwp: v,
              }),
            })
          }
        />
        <BoolField
          label="¿Restricción de horario laboral para instalar?"
          value={value.equipamiento_estimado?.restriccion_horario_laboral}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                restriccion_horario_laboral: v,
              }),
            })
          }
        />
        <BoolField
          label="¿Hay WiFi/Ethernet en el sitio?"
          value={value.equipamiento_estimado?.tiene_wifi_ethernet}
          onChange={(v) =>
            onChange({
              ...value,
              equipamiento_estimado: withPatch(value.equipamiento_estimado, {
                tiene_wifi_ethernet: v,
              }),
            })
          }
        />
      </FieldGroup>

      {/* Protecciones */}
      <FieldGroup title="Protecciones">
        <NumberField
          label="Protección CA entrada"
          suffix="Amp"
          value={value.protecciones?.proteccion_ca_entrada_amp}
          onChange={(v) =>
            onChange({
              ...value,
              protecciones: withPatch(value.protecciones, {
                proteccion_ca_entrada_amp: v,
              }),
            })
          }
        />
        <NumberField
          label="Protección CA backup"
          suffix="Amp"
          value={value.protecciones?.proteccion_ca_backup_amp}
          onChange={(v) =>
            onChange({
              ...value,
              protecciones: withPatch(value.protecciones, {
                proteccion_ca_backup_amp: v,
              }),
            })
          }
        />
        <NumberField
          label="Protección CD"
          suffix="Amp"
          value={value.protecciones?.proteccion_cd_amp}
          onChange={(v) =>
            onChange({
              ...value,
              protecciones: withPatch(value.protecciones, {
                proteccion_cd_amp: v,
              }),
            })
          }
        />
      </FieldGroup>

      {/* Cableado */}
      <FieldGroup title="Cableado">
        <SelectField
          label="Ubicación del inversor"
          value={value.cableado?.ubicacion_inversor}
          onChange={(v) =>
            onChange({
              ...value,
              cableado: withPatch(value.cableado, { ubicacion_inversor: v }),
            })
          }
          options={[
            { value: "cubierto", label: "Cubierto" },
            { value: "intemperie", label: "Intemperie" },
          ]}
        />
        <NumberField
          label="Longitud de línea CA"
          suffix="m"
          value={value.cableado?.longitud_linea_ca_m}
          onChange={(v) =>
            onChange({
              ...value,
              cableado: withPatch(value.cableado, { longitud_linea_ca_m: v }),
            })
          }
        />
        <NumberField
          label="Longitud de línea CD"
          suffix="m"
          value={value.cableado?.longitud_linea_cd_m}
          onChange={(v) =>
            onChange({
              ...value,
              cableado: withPatch(value.cableado, { longitud_linea_cd_m: v }),
            })
          }
        />
        <NumberField
          label="Distancia inversor → PGD"
          suffix="m"
          value={value.cableado?.distancia_inversor_pgd_m}
          onChange={(v) =>
            onChange({
              ...value,
              cableado: withPatch(value.cableado, {
                distancia_inversor_pgd_m: v,
              }),
            })
          }
        />
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs text-gray-600">
            Descripción breve del lugar de instalación
          </Label>
          <Textarea
            value={value.cableado?.descripcion_lugar ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                cableado: withPatch(value.cableado, {
                  descripcion_lugar: e.target.value || undefined,
                }),
              })
            }
            rows={2}
          />
        </div>
      </FieldGroup>

      {/* Cargas instaladas (Anexo 1) */}
      <FieldGroup
        title="Inventario de cargas eléctricas"
        description="Electrodomésticos y equipos existentes en la vivienda"
      >
        <div className="sm:col-span-2 space-y-2">
          {cargas.map((carga, index) => {
            const totalCarga =
              carga.potencia_unitaria_kw != null && carga.cantidad
                ? Math.round(carga.potencia_unitaria_kw * carga.cantidad * 1000) /
                  1000
                : null;
            return (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end rounded-md border p-2"
              >
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs text-gray-600">Equipo</Label>
                  <Input
                    value={carga.descripcion}
                    onChange={(e) => {
                      const nuevas = [...cargas];
                      nuevas[index] = { ...carga, descripcion: e.target.value };
                      setCargas(nuevas);
                    }}
                    placeholder="Ej: Aire acondicionado 1Tn"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs text-gray-600">kW c/u</Label>
                  <Input
                    type="number"
                    value={carga.potencia_unitaria_kw ?? ""}
                    onChange={(e) => {
                      const nuevas = [...cargas];
                      nuevas[index] = {
                        ...carga,
                        potencia_unitaria_kw: parseNumberInput(e.target.value),
                      };
                      setCargas(nuevas);
                    }}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs text-gray-600">Cantidad</Label>
                  <Input
                    type="number"
                    value={carga.cantidad ?? ""}
                    onChange={(e) => {
                      const nuevas = [...cargas];
                      nuevas[index] = {
                        ...carga,
                        cantidad: parseNumberInput(e.target.value),
                      };
                      setCargas(nuevas);
                    }}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 text-xs text-gray-500">
                  Total: {totalCarga ?? "—"} kW
                </div>
                <label className="col-span-3 sm:col-span-1 flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={carga.es_vital === true}
                    onCheckedChange={(checked) => {
                      const nuevas = [...cargas];
                      nuevas[index] = { ...carga, es_vital: checked === true };
                      setCargas(nuevas);
                    }}
                  />
                  Vital
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="col-span-2 sm:col-span-1 text-red-600 hover:bg-red-50"
                  onClick={() => setCargas(cargas.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setCargas([...cargas, { descripcion: "" }])
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar equipo
          </Button>

          {cargas.length > 0 && (
            <p className="text-xs text-gray-500">
              Carga total instalada: <strong>{Math.round(cargaTotalKw * 1000) / 1000} kW</strong>
            </p>
          )}
        </div>
      </FieldGroup>

      {/* Aqui habia un campo de observaciones. Se quito porque hacia la misma
          funcion que la descripcion de la evidencia del formulario de la
          visita, y dos cajas de texto libre para lo mismo solo consiguen que lo
          escrito acabe repartido entre las dos. El campo sigue en el tipo: las
          visitas viejas lo tienen y se sigue mostrando en el detalle y en el
          informe. */}
    </div>
  );
}
