"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useToast } from "@/hooks/use-toast";
import { TrabajosDiariosService } from "@/lib/api-services";
import type {
  TrabajoDiarioArchivo,
  TrabajoDiarioMaterialResumen,
  TrabajoDiarioRegistro,
  TrabajoDiarioTipo,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

type MomentoKey = "inicio" | "fin";
type PendingPreview = { file: File; url: string };

interface TrabajoDiarioFormProps {
  value: TrabajoDiarioRegistro;
  onChange: (next: TrabajoDiarioRegistro) => void;
  materialesResumen?: TrabajoDiarioMaterialResumen[];
  onMaterialesResumenChange?: (next: TrabajoDiarioMaterialResumen[]) => void;
  onSubmit: () => void;
  onCloseDay?: () => void;
  submitLabel: string;
  showSubmitButton?: boolean;
  isSaving?: boolean;
  isClosing?: boolean;
}

const TIPOS_TRABAJO: TrabajoDiarioTipo[] = [
  "AVERIA",
  "INSTALACION NUEVA",
  "INSTALACION EN PROCESO",
];

const nowIso = () => new Date().toISOString();

const parseCantidadInput = (raw: string): number => {
  const normalized = String(raw ?? "")
    .trim()
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCantidadInput = (value: number): string => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (Number.isInteger(safe)) return String(safe);
  return String(safe).replace(".", ",");
};

const isMongoObjectId = (value: unknown) =>
  /^[a-f0-9]{24}$/i.test(String(value ?? "").trim());

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isCategoriaServicio = (categoriaRaw: unknown): boolean => {
  const categoria = normalizeText(categoriaRaw);
  return (
    categoria.includes("inversor") ||
    categoria.includes("panel") ||
    categoria.includes("bateria")
  );
};

const isMaterialServicioByNameCode = (nombreRaw: unknown, codigoRaw: unknown): boolean => {
  const nombre = normalizeText(nombreRaw);
  const codigo = normalizeText(codigoRaw);

  if (
    nombre.includes("inversor") ||
    codigo.includes("inv")
  ) {
    return true;
  }
  if (
    nombre.includes("panel") ||
    codigo.includes("pan")
  ) {
    return true;
  }
  if (
    nombre.includes("bateria") ||
    codigo.includes("bat")
  ) {
    return true;
  }

  return false;
};

export function TrabajoDiarioForm({
  value,
  onChange,
  materialesResumen = [],
  onMaterialesResumenChange,
  onSubmit,
  onCloseDay,
  submitLabel,
  showSubmitButton = true,
  isSaving = false,
  isClosing = false,
}: TrabajoDiarioFormProps) {
  const { toast } = useToast();
  const [pendingFiles, setPendingFiles] = useState<
    Record<MomentoKey, PendingPreview[]>
  >({
    inicio: [],
    fin: [],
  });
  const [fileInputVersion, setFileInputVersion] = useState<
    Record<MomentoKey, number>
  >({
    inicio: 0,
    fin: 0,
  });
  const [uploadingFiles, setUploadingFiles] = useState<
    Record<MomentoKey, boolean>
  >({
    inicio: false,
    fin: false,
  });
  useEffect(
    () => () => {
      (["inicio", "fin"] as MomentoKey[]).forEach((key) => {
        pendingFiles[key].forEach((entry) => {
          if (entry.url) URL.revokeObjectURL(entry.url);
        });
      });
    },
    [pendingFiles],
  );

  useEffect(() => {
    const fechaTrabajo = value.fecha_trabajo || "";
    if (!fechaTrabajo) return;
    const inicioFecha = value.inicio?.fecha || "";
    const finFecha = value.fin?.fecha || "";

    if (inicioFecha === fechaTrabajo && finFecha === fechaTrabajo) return;

    onChange({
      ...value,
      inicio: {
        ...(value.inicio || { archivos: [], comentario: "", fecha: "" }),
        fecha: fechaTrabajo,
      },
      fin: {
        ...(value.fin || { archivos: [], comentario: "", fecha: "" }),
        fecha: fechaTrabajo,
      },
    });
  }, [onChange, value]);

  const update = (patch: Partial<TrabajoDiarioRegistro>) => {
    onChange({ ...value, ...patch });
  };

  const updateMomento = (
    key: MomentoKey,
    patch: Partial<TrabajoDiarioRegistro[MomentoKey]>,
  ) => {
    const current = value[key] || { archivos: [], comentario: "", fecha: "" };
    update({
      [key]: {
        ...current,
        ...patch,
      },
    });
  };

  const inferArchivoTipo = (file: File): TrabajoDiarioArchivo["tipo"] =>
    file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : "imagen";

  const removeArchivo = (key: MomentoKey, index: number) => {
    const current = value[key] || { archivos: [], comentario: "", fecha: "" };
    const archivoToRemove = (current.archivos || [])[index];
    if (archivoToRemove?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(archivoToRemove.url);
    }
    updateMomento(key, {
      archivos: (current.archivos || []).filter((_, idx) => idx !== index),
    });
  };

  const handleUploadArchivo = async (key: MomentoKey) => {
    const entries = pendingFiles[key] || [];
    if (entries.length === 0) return;

    setUploadingFiles((prev) => ({ ...prev, [key]: true }));
    try {
      const current = value[key] || { archivos: [], comentario: "", fecha: "" };
      const uploadedArchivos: TrabajoDiarioArchivo[] = [];
      let invalidCount = 0;

      for (const entry of entries) {
        const file = entry.file;
        const isAllowed =
          file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          file.type.startsWith("audio/");
        if (!isAllowed) {
          invalidCount += 1;
          continue;
        }
        const uploaded = await TrabajosDiariosService.uploadArchivo(file);
        uploadedArchivos.push({
          id:
            uploaded.id ||
            `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: uploaded.url,
          tipo: uploaded.tipo || inferArchivoTipo(file),
          nombre: uploaded.nombre || file.name,
          tamano: Number.isFinite(uploaded.tamano) ? uploaded.tamano : file.size,
          mime_type:
            uploaded.mime_type || file.type || "application/octet-stream",
          created_at: uploaded.created_at || nowIso(),
        });
      }

      if (uploadedArchivos.length === 0) {
        throw new Error(
          invalidCount > 0
            ? "No se subieron archivos válidos (solo imagen, video o audio)."
            : "No se pudo subir ningún archivo.",
        );
      }

      updateMomento(key, {
        archivos: [...(current.archivos || []), ...uploadedArchivos],
      });
      entries.forEach((entry) => {
        if (entry.url) URL.revokeObjectURL(entry.url);
      });
      setPendingFiles((prev) => ({ ...prev, [key]: [] }));
      setFileInputVersion((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      toast({
        title: "Archivo agregado",
        description: `Se subieron ${uploadedArchivos.length} archivo(s) al ${key}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir el archivo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [key]: false }));
    }
  };

  const addMaterial = () => {
    update({
      materiales_utilizados: [
        ...(value.materiales_utilizados || []),
        {
          id_material: "",
          codigo_material: "",
          nombre: "",
          cantidad_utilizada: 0,
        },
      ],
    });
  };

  const removeMaterial = (index: number) => {
    update({
      materiales_utilizados: (value.materiales_utilizados || []).filter(
        (_, idx) => idx !== index,
      ),
    });
  };

  const updateMaterial = (
    index: number,
    patch: Partial<TrabajoDiarioRegistro["materiales_utilizados"][number]>,
  ) => {
    const next = [...(value.materiales_utilizados || [])];
    next[index] = { ...next[index], ...patch };
    update({ materiales_utilizados: next });
  };

  const isAveria = value.tipo_trabajo === "AVERIA";
  const isLocked = value.cierre_diario_confirmado === true;
  const lockLabel = value.cierre_diario_usuario_nombre
    ? `Cerrado por ${value.cierre_diario_usuario_nombre}`
    : "Trabajo diario cerrado";
  const isInstalacion =
    value.tipo_trabajo === "INSTALACION NUEVA" ||
    value.tipo_trabajo === "INSTALACION EN PROCESO";
  const instalacionTerminada = Boolean(value.instalacion_terminada);

  const syncMaterialesUtilizadosFromResumen = (
    rows: TrabajoDiarioMaterialResumen[],
  ) => {
    update({
      materiales_utilizados: rows
        .filter((m) => {
          const usada = Number(m.cantidad_usada_hoy || 0);
          const servicio = Number(m.cantidad_en_servicio || 0);
          return usada > 0 || servicio > 0 || m.en_servicio === true;
        })
        .map((m) => ({
          id_material: m.material_id,
          codigo_material: m.codigo_material,
          material_codigo: m.material_codigo || m.codigo_material,
          categoria: m.categoria,
          nombre: m.nombre,
          cantidad_utilizada: Math.max(0, Number(m.cantidad_usada_hoy || 0)),
          en_servicio: m.en_servicio === true,
          cantidad_en_servicio: Math.max(
            0,
            Math.min(
              Number(m.cantidad_usada_hoy || 0),
              Number(m.cantidad_en_servicio || 0),
            ),
          ),
        })),
    });
  };

  const equiposPrincipales = (materialesResumen || [])
    .map((material, index) => ({ material, index }))
    .filter(({ material }) => {
      if (material.es_equipo_principal === true) return true;
      if (isCategoriaServicio(material.categoria)) return true;
      return isMaterialServicioByNameCode(
        material.nombre,
        material.material_codigo || material.codigo_material || material.material_id,
      );
    });
  const materialesNoPrincipales = (materialesResumen || [])
    .map((material, index) => ({ material, index }))
    .filter(({ index }) => !equiposPrincipales.some((item) => item.index === index));

  const updateMaterialesResumen = (
    index: number,
    cantidadUsadaHoy: number,
  ) => {
    if (!onMaterialesResumenChange) return;
    const next = [...materialesResumen];
    const row = next[index];
    if (!row) return;
    const max = Math.max(0, Number(row.disponible_hoy || 0));
    const safeCantidad = Math.max(
      0,
      Math.min(max, Number.isFinite(cantidadUsadaHoy) ? cantidadUsadaHoy : 0),
    );
    const enServicioRaw = row.en_servicio === true;
    const cantidadEnServicioRaw = Math.max(
      0,
      Number(row.cantidad_en_servicio || 0),
    );
    const cantidadEnServicio = Math.min(safeCantidad, cantidadEnServicioRaw);
    next[index] = {
      ...row,
      cantidad_usada_hoy: safeCantidad,
      saldo_despues_de_hoy: max - safeCantidad,
      en_servicio: safeCantidad > 0 ? enServicioRaw : false,
      cantidad_en_servicio: safeCantidad > 0 ? cantidadEnServicio : 0,
    };
    onMaterialesResumenChange(next);
    syncMaterialesUtilizadosFromResumen(next);
  };

  const updateServicioMaterial = (
    index: number,
    patch: Partial<TrabajoDiarioMaterialResumen>,
  ) => {
    if (!onMaterialesResumenChange) return;
    const next = [...materialesResumen];
    const row = next[index];
    if (!row) return;
    const cantidadUsadaHoy = Math.max(
      0,
      Number(patch.cantidad_usada_hoy ?? row.cantidad_usada_hoy ?? 0),
    );
    const merged = { ...row, ...patch };
    const cantidadServicio = Math.max(
      0,
      Math.min(
        cantidadUsadaHoy,
        Number(merged.cantidad_en_servicio || 0),
      ),
    );
    next[index] = {
      ...merged,
      cantidad_usada_hoy: cantidadUsadaHoy,
      saldo_despues_de_hoy: Math.max(
        0,
        Number(merged.disponible_hoy || 0) - cantidadUsadaHoy,
      ),
      en_servicio:
        merged.en_servicio === true && cantidadUsadaHoy > 0 && cantidadServicio > 0,
      cantidad_en_servicio: cantidadServicio,
    };
    onMaterialesResumenChange(next);
    syncMaterialesUtilizadosFromResumen(next);
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (showSubmitButton) {
          onSubmit();
        }
      }}
    >
      {isLocked ? (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-emerald-800">{lockLabel}</p>
          </CardContent>
        </Card>
      ) : null}
      <fieldset
        disabled={isLocked || isClosing}
        className="space-y-3 disabled:opacity-75"
      >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Datos del trabajo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Tipo de trabajo</Label>
              <Select
                value={value.tipo_trabajo || ""}
                onValueChange={(val) =>
                  update({ tipo_trabajo: val as TrabajoDiarioTipo })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TRABAJO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isInstalacion ? (
            <div className="rounded-md border border-slate-200 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(value.instalacion_terminada)}
                  onCheckedChange={(checked) => {
                    const terminada = checked === true;
                    update({
                      instalacion_terminada: terminada,
                      queda_pendiente: terminada ? "" : value.queda_pendiente,
                    });
                  }}
                />
                Instalación terminada
              </label>
              {!instalacionTerminada ? (
                <div className="space-y-1.5">
                  <Label>Queda pendiente</Label>
                  <Textarea
                    value={value.queda_pendiente || ""}
                    onChange={(e) => update({ queda_pendiente: e.target.value })}
                  />
                </div>
              ) : null}

              <div className="space-y-2 rounded-md border border-slate-200 p-3 bg-slate-50">
                <p className="text-sm font-medium text-slate-800">
                  Equipos principales en servicio
                </p>
                {equiposPrincipales.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No hay inversores, paneles o baterías en los materiales de este trabajo.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border bg-white">
                    <table className="min-w-[920px] w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="text-left px-2 py-2">Código</th>
                          <th className="text-left px-2 py-2">Material</th>
                          <th className="text-right px-2 py-2">Cantidad total</th>
                          <th className="text-right px-2 py-2">Ya en servicio</th>
                          <th className="text-right px-2 py-2">En servicio hoy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposPrincipales.map(({ material, index }) => {
                          const limiteHoy = Math.max(
                            0,
                            Number(
                              material.disponible_hoy ??
                                material.cantidad_total_vales ??
                                material.cantidad_usada_hoy ??
                                0,
                            ),
                          );
                          const cantidadEnServicio = Math.max(
                            0,
                            Math.min(
                              limiteHoy,
                              Number(material.cantidad_en_servicio || 0),
                            ),
                          );
                          const yaEnServicioOferta = Math.max(
                            0,
                            Number(material.cantidad_en_servicio_actual_oferta || 0),
                          );
                          const codigo = material.material_codigo || material.codigo_material;
                          return (
                            <tr
                              key={`${material.material_id || codigo || material.nombre}-${index}`}
                              className="border-t align-middle"
                            >
                              <td className="px-2 py-2 text-slate-700">
                                {codigo || (isMongoObjectId(material.material_id) ? "Sin código" : material.material_id)}
                              </td>
                              <td className="px-2 py-2">
                                <p className="font-medium text-slate-800">{material.nombre}</p>
                                <p className="text-[11px] text-slate-500">
                                  {material.categoria || "Equipo principal"}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Código:{" "}
                                  {codigo || (isMongoObjectId(material.material_id) ? "Sin código" : material.material_id)}
                                </p>
                              </td>
                              <td className="px-2 py-2 text-right">
                                {Number(material.cantidad_total_vales || 0)}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {yaEnServicioOferta}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  max={limiteHoy}
                                  value={cantidadEnServicio}
                                  onChange={(e) => {
                                    const parsed = Number(e.target.value || 0);
                                    const safeCantidad = Math.max(
                                      0,
                                      Math.min(
                                        limiteHoy,
                                        Number.isFinite(parsed) ? parsed : 0,
                                      ),
                                    );
                                    updateServicioMaterial(index, {
                                      en_servicio: safeCantidad > 0,
                                      cantidad_usada_hoy: safeCantidad,
                                      cantidad_en_servicio: safeCantidad,
                                    });
                                  }}
                                  className="h-8 w-24 ml-auto text-right"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {!instalacionTerminada ? (
                  <p className="text-xs text-slate-500">
                    Si la instalación queda pendiente, marca solo los equipos realmente en servicio hoy.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Si la instalación terminó, al cerrar día el backend marcará equipos principales en servicio y estado del cliente automáticamente.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {(["inicio", "fin"] as MomentoKey[]).map((momento) => (
          <Card key={momento}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{momento}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Comentario</Label>
              <Textarea
                value={value[momento]?.comentario || ""}
                onChange={(e) =>
                  updateMomento(momento, { comentario: e.target.value })
                }
                placeholder={`Comentario de ${momento}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha de {momento}:{" "}
              {(value.fecha_trabajo || "").slice(0, 10) || "Sin definir"}
            </p>
            <div className="hidden">
              {/* Se mantiene sincronizado con fecha_trabajo por requerimiento */}
              <Input
                type="text"
                value={value[momento]?.fecha || value.fecha_trabajo || ""}
                onChange={() => undefined}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Archivos ({momento})</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    key={`${momento}-${fileInputVersion[momento]}`}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    disabled={uploadingFiles[momento]}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      if (files.length === 0) return;
                      const additions: PendingPreview[] = files.map((file) => ({
                        file,
                        url: URL.createObjectURL(file),
                      }));
                      setPendingFiles((prev) => ({
                        ...prev,
                        [momento]: [...prev[momento], ...additions],
                      }));
                    }}
                    className="max-w-[260px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pendingFiles[momento].length === 0 || uploadingFiles[momento]}
                    onClick={() => void handleUploadArchivo(momento)}
                  >
                    {uploadingFiles[momento] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Subir {pendingFiles[momento].length > 0
                          ? `(${pendingFiles[momento].length})`
                          : "archivo"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Acepta imágenes, videos y audios.</p>
              {pendingFiles[momento].length > 0 ? (
                <div className="rounded-md border p-3 bg-slate-50 space-y-2">
                  <p className="text-xs text-slate-600">
                    Seleccionados: {pendingFiles[momento].length}
                  </p>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {pendingFiles[momento].map((entry, idx) => (
                      <div key={`${entry.file.name}-${idx}`} className="rounded border bg-white p-2 space-y-1">
                        <p className="text-xs text-slate-700 truncate">{entry.file.name}</p>
                        {entry.file.type.startsWith("image/") ? (
                          <Image
                            src={entry.url}
                            alt="previsualización"
                            width={960}
                            height={540}
                            unoptimized
                            className="w-full max-h-36 object-contain rounded"
                          />
                        ) : entry.file.type.startsWith("video/") ? (
                          <video
                            controls
                            src={entry.url}
                            className="w-full max-h-36 object-contain rounded bg-black"
                          />
                        ) : entry.file.type.startsWith("audio/") ? (
                          <audio controls src={entry.url} className="w-full" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {(value[momento]?.archivos || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin archivos añadidos.
                </p>
              ) : (
                <div className="space-y-2">
                  {(value[momento]?.archivos || []).map((archivo, idx) => (
                    <div
                      key={archivo.id || `${momento}-${idx}`}
                      className="border rounded-md p-3 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {archivo.nombre || "Archivo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {archivo.tipo} • {archivo.mime_type || "--"} •{" "}
                            {Number.isFinite(archivo.tamano)
                              ? `${(archivo.tamano / (1024 * 1024)).toFixed(2)} MB`
                              : "--"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeArchivo(momento, idx)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Quitar
                        </Button>
                      </div>
                      <div className="rounded-md overflow-hidden border bg-slate-50">
                        {archivo.tipo === "video" ? (
                          <video
                            controls
                            src={archivo.url}
                            className="w-full max-h-64 object-contain bg-black"
                          />
                        ) : archivo.tipo === "audio" ? (
                          <audio
                            controls
                            src={archivo.url}
                            className="w-full p-4"
                          />
                        ) : (
                          <Image
                            src={archivo.url}
                            alt={archivo.nombre || "archivo"}
                            width={960}
                            height={540}
                            unoptimized
                            className="w-full max-h-64 object-contain"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAveria ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos de avería</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Problema encontrado</Label>
              <Textarea
                value={value.problema_encontrado || ""}
                onChange={(e) =>
                  update({ problema_encontrado: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Solución</Label>
              <Textarea
                value={value.solucion || ""}
                onChange={(e) => update({ solucion: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resto de materiales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {materialesResumen.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-2 py-2">Material</th>
                    <th className="text-right px-2 py-2">
                      Cantidad total en vales
                    </th>
                    <th className="text-right px-2 py-2">
                      Cantidad utilizada hasta ahora
                    </th>
                    <th className="text-right px-2 py-2">
                      Cantidad utilizada hoy
                    </th>
                    <th className="text-right px-2 py-2">
                      Queda disponible
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialesNoPrincipales.length === 0 ? (
                    <tr className="border-t">
                      <td
                        className="px-2 py-3 text-center text-slate-500"
                        colSpan={5}
                      >
                        No hay materiales no principales para este trabajo.
                      </td>
                    </tr>
                  ) : (
                    materialesNoPrincipales.map(({ material, index: idx }) => (
                    <tr
                      key={`${material.material_id}-${idx}`}
                      className="border-t align-middle"
                    >
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-800">
                          {material.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {material.material_codigo || material.codigo_material
                            ? material.material_codigo || material.codigo_material
                            : isMongoObjectId(material.material_id)
                              ? "Sin código"
                              : material.material_id}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(material.cantidad_total_vales || 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(
                          material.cantidad_usada_hasta_el_momento ??
                            material.cantidad_usada_hasta_ayer ??
                            0,
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateMaterialesResumen(
                                idx,
                                Number(material.cantidad_usada_hoy || 0) - 1,
                              )
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatCantidadInput(
                              Number(material.cantidad_usada_hoy || 0),
                            )}
                            onChange={(e) =>
                              updateMaterialesResumen(
                                idx,
                                parseCantidadInput(e.target.value),
                              )
                            }
                            className="h-8 w-24 text-right"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateMaterialesResumen(
                                idx,
                                Number(material.cantidad_usada_hoy || 0) + 1,
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {Number(material.saldo_despues_de_hoy || 0)}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaterial}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar material
                </Button>
              </div>
              {(value.materiales_utilizados || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin materiales registrados.
                </p>
              ) : (
                <div className="space-y-2">
                  {(value.materiales_utilizados || []).map((material, idx) => (
                    <div
                      key={`${material.id_material}-${idx}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded-md p-2"
                    >
                      <Input
                        className="md:col-span-3"
                        placeholder="Código material"
                        value={
                          material.codigo_material || material.id_material || ""
                        }
                        onChange={(e) =>
                          updateMaterial(idx, {
                            codigo_material: e.target.value,
                            id_material: material.id_material || e.target.value,
                          })
                        }
                      />
                      <Input
                        className="md:col-span-5"
                        placeholder="Nombre"
                        value={material.nombre || ""}
                        onChange={(e) =>
                          updateMaterial(idx, { nombre: e.target.value })
                        }
                      />
                      <Input
                        className="md:col-span-2"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cantidad"
                        value={
                          Number.isFinite(material.cantidad_utilizada)
                            ? material.cantidad_utilizada
                            : 0
                        }
                        onChange={(e) =>
                          updateMaterial(idx, {
                            cantidad_utilizada: Number(e.target.value || 0),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        className="md:col-span-2"
                        onClick={() => removeMaterial(idx)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        {onCloseDay ? (
          <Button
            type="button"
            variant="outline"
            disabled={isLocked || isSaving || isClosing}
            onClick={onCloseDay}
          >
            {isClosing ? "Cerrando..." : "Cerrar día"}
          </Button>
        ) : null}
        {showSubmitButton ? (
          <Button type="submit" disabled={isLocked || isSaving || isClosing}>
            {isSaving ? "Guardando..." : submitLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
