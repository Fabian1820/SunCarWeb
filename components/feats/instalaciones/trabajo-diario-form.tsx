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
import { ClienteService } from "@/lib/api-services";
import type {
  TrabajoDiarioArchivo,
  TrabajoDiarioMaterialResumen,
  TrabajoDiarioRegistro,
  TrabajoDiarioTipo,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

type MomentoKey = "inicio" | "fin";
type ServicioCategoria = "inversor" | "panel" | "bateria";

interface TrabajoDiarioFormProps {
  value: TrabajoDiarioRegistro;
  onChange: (next: TrabajoDiarioRegistro) => void;
  materialesResumen?: TrabajoDiarioMaterialResumen[];
  onMaterialesResumenChange?: (next: TrabajoDiarioMaterialResumen[]) => void;
  onSubmit: () => void;
  onCloseDay?: () => void;
  submitLabel: string;
  isSaving?: boolean;
  isClosing?: boolean;
}

const TIPOS_TRABAJO: TrabajoDiarioTipo[] = [
  "AVERIA",
  "INSTALACION NUEVA",
  "INSTALACION EN PROCESO",
];

const nowIso = () => new Date().toISOString();

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getServicioCategoria = (
  material: TrabajoDiarioRegistro["materiales_utilizados"][number],
): ServicioCategoria | null => {
  const nombre = normalizeText(material?.nombre);
  const codigo = normalizeText(material?.codigo_material || material?.id_material);

  if (
    nombre.includes("inversor") ||
    codigo.includes("inv")
  ) {
    return "inversor";
  }
  if (
    nombre.includes("panel") ||
    codigo.includes("pan")
  ) {
    return "panel";
  }
  if (
    nombre.includes("bateria") ||
    codigo.includes("bat")
  ) {
    return "bateria";
  }

  return null;
};

export function TrabajoDiarioForm({
  value,
  onChange,
  materialesResumen = [],
  onMaterialesResumenChange,
  onSubmit,
  onCloseDay,
  submitLabel,
  isSaving = false,
  isClosing = false,
}: TrabajoDiarioFormProps) {
  const { toast } = useToast();
  const [pendingFiles, setPendingFiles] = useState<
    Record<MomentoKey, File | null>
  >({
    inicio: null,
    fin: null,
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
    file.type.startsWith("video/") ? "video" : "imagen";

  const uploadTipoCliente =
    value.tipo_trabajo === "AVERIA" ? "averia" : "instalacion";

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
    const file = pendingFiles[key];
    if (!file) return;
    if (!value.cliente_numero) {
      toast({
        title: "Falta cliente",
        description:
          "Para subir archivos como en Clientes, el trabajo debe tener cliente número.",
        variant: "destructive",
      });
      return;
    }

    const isImageOrVideo =
      file.type.startsWith("image/") || file.type.startsWith("video/");
    if (!isImageOrVideo) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten imágenes o videos.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles((prev) => ({ ...prev, [key]: true }));
    try {
      await ClienteService.uploadFotoCliente(value.cliente_numero, {
        file,
        tipo: uploadTipoCliente,
      });

      let uploadedUrl = "";
      const currentUrls = new Set(
        (value[key]?.archivos || []).map((a) => a.url),
      );
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const fotos = await ClienteService.getFotosCliente(
          value.cliente_numero,
        );
        const candidates = [...(fotos || [])]
          .filter(
            (foto) => foto.tipo === uploadTipoCliente && Boolean(foto.url),
          )
          .sort((a, b) => {
            const aTime = new Date(a.fecha || 0).getTime();
            const bTime = new Date(b.fecha || 0).getTime();
            return bTime - aTime;
          });
        uploadedUrl =
          candidates.find((foto) => !currentUrls.has(foto.url))?.url ||
          candidates[0]?.url ||
          "";
        if (uploadedUrl) break;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      if (!uploadedUrl) {
        throw new Error("No se pudo obtener la URL del archivo subido.");
      }

      const current = value[key] || { archivos: [], comentario: "", fecha: "" };
      const nextArchivo: TrabajoDiarioArchivo = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: uploadedUrl,
        tipo: inferArchivoTipo(file),
        nombre: file.name,
        tamano: file.size,
        mime_type: file.type || "application/octet-stream",
        created_at: nowIso(),
      };

      updateMomento(key, {
        archivos: [...(current.archivos || []), nextArchivo],
      });
      setPendingFiles((prev) => ({ ...prev, [key]: null }));
      setFileInputVersion((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      toast({
        title: "Archivo agregado",
        description: `Se subió correctamente al ${key}.`,
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
  const materialesServicio = (value.materiales_utilizados || [])
    .map((material, index) => ({
      material,
      index,
      categoria: getServicioCategoria(material),
    }))
    .filter((item) => item.categoria !== null);

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
    next[index] = {
      ...row,
      cantidad_usada_hoy: safeCantidad,
      saldo_despues_de_hoy: max - safeCantidad,
    };
    onMaterialesResumenChange(next);
    update({
      materiales_utilizados: next
        .filter((m) => Number(m.cantidad_usada_hoy || 0) > 0)
        .map((m) => ({
          id_material: m.material_id,
          nombre: m.nombre,
          cantidad_utilizada: Number(m.cantidad_usada_hoy || 0),
        })),
    });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Fecha de trabajo</Label>
              <Input
                type="date"
                value={(value.fecha_trabajo || "").slice(0, 10)}
                onChange={(e) =>
                  update({
                    fecha_trabajo: e.target.value,
                    inicio: {
                      ...(value.inicio || {
                        archivos: [],
                        comentario: "",
                        fecha: "",
                      }),
                      fecha: e.target.value,
                    },
                    fin: {
                      ...(value.fin || {
                        archivos: [],
                        comentario: "",
                        fecha: "",
                      }),
                      fecha: e.target.value,
                    },
                  })
                }
              />
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

              {!instalacionTerminada ? (
                <div className="space-y-2 rounded-md border border-slate-200 p-3 bg-slate-50">
                  <p className="text-sm font-medium text-slate-800">
                    Equipos en servicio
                  </p>
                  {materialesServicio.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No hay inversores, paneles o baterías en los materiales de este trabajo.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {materialesServicio.map(({ material, index, categoria }) => {
                        const totalMaterial = Math.max(
                          0,
                          Number(material.cantidad_utilizada || 0),
                        );
                        const enServicio = material.en_servicio === true;
                        const cantidadEnServicio = Number(
                          material.cantidad_en_servicio || 0,
                        );
                        const categoriaLabel =
                          categoria === "inversor"
                            ? "Inversor"
                            : categoria === "panel"
                              ? "Panel"
                              : "Batería";

                        return (
                          <div
                            key={`${material.id_material || material.codigo_material || material.nombre}-${index}`}
                            className="rounded-md border bg-white p-2.5 space-y-2"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-medium text-slate-900">
                                {material.nombre || material.codigo_material || "Material"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {categoriaLabel} • Total: {totalMaterial}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={enServicio}
                                  onCheckedChange={(checked) => {
                                    const marcado = checked === true;
                                    updateMaterial(index, {
                                      en_servicio: marcado,
                                      cantidad_en_servicio: marcado
                                        ? Math.max(
                                            1,
                                            Math.min(
                                              totalMaterial,
                                              cantidadEnServicio > 0
                                                ? cantidadEnServicio
                                                : 1,
                                            ),
                                          )
                                        : 0,
                                    });
                                  }}
                                />
                                Marcado en servicio
                              </label>

                              {enServicio ? (
                                <div className="flex items-center gap-2 sm:ml-auto">
                                  <Label className="text-xs whitespace-nowrap">
                                    Cantidad en servicio
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    max={Math.max(1, totalMaterial)}
                                    value={
                                      cantidadEnServicio > 0 ? cantidadEnServicio : 1
                                    }
                                    onChange={(e) => {
                                      const parsed = Number(e.target.value || 1);
                                      const safeCantidad = Math.max(
                                        1,
                                        Math.min(
                                          Math.max(1, totalMaterial),
                                          Number.isFinite(parsed) ? parsed : 1,
                                        ),
                                      );
                                      updateMaterial(index, {
                                        en_servicio: true,
                                        cantidad_en_servicio: safeCantidad,
                                      });
                                    }}
                                    className="w-24"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
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
                    accept="image/*,video/*"
                    disabled={uploadingFiles[momento]}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setPendingFiles((prev) => ({ ...prev, [momento]: file }));
                    }}
                    className="max-w-[260px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!pendingFiles[momento] || uploadingFiles[momento]}
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
                        Subir archivo
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Acepta imágenes y videos.</p>
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
          <CardTitle className="text-sm">Materiales utilizados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {materialesResumen.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-2 py-2">Material</th>
                    <th className="text-right px-2 py-2">Total vales</th>
                    <th className="text-right px-2 py-2">Usada ayer</th>
                    <th className="text-right px-2 py-2">Usada hoy</th>
                    <th className="text-right px-2 py-2">Disponible hoy</th>
                    <th className="text-right px-2 py-2">Saldo después</th>
                  </tr>
                </thead>
                <tbody>
                  {materialesResumen.map((material, idx) => (
                    <tr
                      key={`${material.material_id}-${idx}`}
                      className="border-t align-middle"
                    >
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-800">
                          {material.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {material.material_id}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(material.cantidad_total_vales || 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(material.cantidad_usada_hasta_ayer || 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          max={Math.max(0, Number(material.disponible_hoy || 0))}
                          value={Number(material.cantidad_usada_hoy || 0)}
                          onChange={(e) =>
                            updateMaterialesResumen(
                              idx,
                              Number(e.target.value || 0),
                            )
                          }
                          className="h-8 w-24 ml-auto text-right"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        {Number(material.disponible_hoy || 0)}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {Number(material.saldo_despues_de_hoy || 0)}
                      </td>
                    </tr>
                  ))}
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
        <Button type="submit" disabled={isLocked || isSaving || isClosing}>
          {isSaving ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
