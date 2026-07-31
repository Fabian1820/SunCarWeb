"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Loader2, LogOut, UploadCloud, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActualizacionesFelicityPublicService,
  FelicityUpdatesAuth,
} from "@/lib/services/feats/actualizaciones-felicity/actualizaciones-felicity-service";
import { MaterialBuscador } from "@/components/feats/actualizaciones-felicity/material-buscador";
import type { MaterialBusqueda } from "@/lib/types/feats/actualizaciones-felicity/actualizaciones-felicity-types";
import {
  IDIOMAS_ACTUALIZACIONES_FELICITY,
  TEXTOS_ACTUALIZACIONES_FELICITY,
  guardarIdioma,
  leerIdiomaGuardado,
  type IdiomaActualizacionesFelicity,
} from "@/lib/i18n/actualizaciones-felicity-i18n";

function SelectorIdioma({
  idioma,
  onChange,
}: {
  idioma: IdiomaActualizacionesFelicity;
  onChange: (i: IdiomaActualizacionesFelicity) => void;
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      {IDIOMAS_ACTUALIZACIONES_FELICITY.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium",
            idioma === opt.value ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LoginFelicity({
  t,
  onLogin,
}: {
  t: (typeof TEXTOS_ACTUALIZACIONES_FELICITY)["zh"];
  onLogin: () => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) return;
    setCargando(true);
    setError(null);
    const res = await ActualizacionesFelicityPublicService.login(usuario.trim(), password);
    setCargando(false);
    if (res.success) {
      onLogin();
    } else {
      setError(res.message || t.loginErrorGenerico);
    }
  };

  return (
    <Card className="max-w-sm w-full">
      <CardHeader>
        <CardTitle className="text-lg">{t.loginTitulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="usuario">{t.loginUsuario}</Label>
            <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.loginPassword}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={cargando || !usuario.trim() || !password}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t.loginBotonCargando}
              </>
            ) : (
              t.loginBoton
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FormularioSubida({
  t,
  onCerrarSesion,
}: {
  t: (typeof TEXTOS_ACTUALIZACIONES_FELICITY)["zh"];
  onCerrarSesion: () => void;
}) {
  const [material, setMaterial] = useState<MaterialBusqueda | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [configuracion, setConfiguracion] = useState("");
  const [version, setVersion] = useState("");
  const [notas, setNotas] = useState("");
  const [subidoPor, setSubidoPor] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const puedeEnviar =
    Boolean(material) && Number(cantidad) >= 1 && configuracion.trim().length > 0 && Boolean(archivo);

  const resetear = () => {
    setMaterial(null);
    setCantidad("1");
    setConfiguracion("");
    setVersion("");
    setNotas("");
    setArchivo(null);
    setExito(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar || !material || !archivo) {
      setError(t.formCamposObligatorios);
      return;
    }
    setSubiendo(true);
    setError(null);
    const res = await ActualizacionesFelicityPublicService.subir({
      material_codigo: material.id,
      material_descripcion: material.modelo,
      material_categoria: material.categoria,
      material_marca: material.marca_nombre,
      material_potencia_kw: material.potenciaKW,
      cantidad: Number(cantidad),
      configuracion: configuracion.trim(),
      version: version.trim() || undefined,
      notas: notas.trim() || undefined,
      subido_por: subidoPor.trim() || undefined,
      archivo,
    });
    setSubiendo(false);
    if (res.success) {
      setExito(true);
    } else {
      if (!FelicityUpdatesAuth.getToken()) {
        onCerrarSesion();
        return;
      }
      setError(res.message || t.formErrorGenerico);
    }
  };

  if (exito) {
    return (
      <Card className="max-w-lg w-full">
        <CardContent className="py-10 flex flex-col items-center text-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="font-medium text-gray-900">{t.formExitoTitulo}</p>
          <p className="text-sm text-gray-500">{t.formExitoMensaje}</p>
          <Button onClick={resetear} className="mt-2 bg-teal-600 hover:bg-teal-700">
            {t.formSubirOtra}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t.formTitulo}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCerrarSesion}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            {t.cerrarSesion}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.formTipoEquipoLabel}</Label>
            <MaterialBuscador
              value={material}
              onChange={setMaterial}
              placeholder={t.formTipoEquipoPlaceholder}
              sinResultadosLabel={t.formTipoEquipoSinResultados}
            />
            <p className="text-xs text-gray-400">{t.formTipoEquipoAyuda}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cantidad">{t.formCantidadLabel}</Label>
            <Input
              id="cantidad"
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <p className="text-xs text-gray-400">{t.formCantidadAyuda}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="configuracion">{t.formConfiguracionLabel}</Label>
            <Textarea
              id="configuracion"
              value={configuracion}
              onChange={(e) => setConfiguracion(e.target.value)}
              placeholder={t.formConfiguracionPlaceholder}
              className="min-h-[70px]"
            />
            <p className="text-xs text-gray-400">{t.formConfiguracionAyuda}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="version">{t.formVersionLabel}</Label>
              <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subido_por">{t.formSubidoPorLabel}</Label>
              <Input
                id="subido_por"
                value={subidoPor}
                onChange={(e) => setSubidoPor(e.target.value)}
                placeholder={t.formSubidoPorPlaceholder}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">{t.formNotasLabel}</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="min-h-[60px]" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archivo">{t.formArchivoLabel}</Label>
            <input
              id="archivo"
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={!puedeEnviar || subiendo} className="w-full bg-teal-600 hover:bg-teal-700">
            {subiendo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t.formSubmitBotonCargando}
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4 mr-2" />
                {t.formSubmitBoton}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ActualizacionesFelicityPublicPage() {
  const [idioma, setIdioma] = useState<IdiomaActualizacionesFelicity>("zh");
  const [autenticado, setAutenticado] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setIdioma(leerIdiomaGuardado());
    setAutenticado(Boolean(FelicityUpdatesAuth.getToken()));
    setListo(true);
  }, []);

  const cambiarIdioma = (i: IdiomaActualizacionesFelicity) => {
    setIdioma(i);
    guardarIdioma(i);
  };

  const cerrarSesion = () => {
    FelicityUpdatesAuth.clearToken();
    setAutenticado(false);
  };

  const t = TEXTOS_ACTUALIZACIONES_FELICITY[idioma];

  if (!listo) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t.tituloPagina}</h1>
          <p className="text-sm text-gray-500">{t.subtitulo}</p>
        </div>
        <SelectorIdioma idioma={idioma} onChange={cambiarIdioma} />
      </div>

      <div className="w-full flex justify-center">
        {autenticado ? (
          <FormularioSubida t={t} onCerrarSesion={cerrarSesion} />
        ) : (
          <LoginFelicity t={t} onLogin={() => setAutenticado(true)} />
        )}
      </div>
    </div>
  );
}
