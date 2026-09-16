"use client"

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/molecule/card';
import { Button } from '@/components/shared/atom/button';
import { Input } from '@/components/shared/molecule/input';
import { Label } from '@/components/shared/atom/label';
import { Loader } from '@/components/shared/atom/loader';
import { Alert, AlertDescription } from '@/components/shared/atom/alert';
import { useContactos } from '@/hooks/use-contactos';
import { apiRequest } from '@/lib/api-config';
import { Contacto } from '@/lib/contacto-types';
import { Phone, Mail, MapPin, Edit, Save, X, User, Plus, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** Valor del selector para el contacto sin provincia. */
const NACIONAL = '__nacional__';

interface ProvinciaOpcion {
  codigo: string;
  nombre: string;
}

interface FormContacto {
  telefono: string;
  correo: string;
  direccion: string;
}

const FORM_VACIO: FormContacto = { telefono: '', correo: '', direccion: '' };

export default function ContactosDashboard() {
  const { contactos, loading, error, updateContacto, createContacto } = useContactos();
  const { toast } = useToast();

  const [seleccion, setSeleccion] = useState<string>(NACIONAL);
  const [provincias, setProvincias] = useState<ProvinciaOpcion[]>([]);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormContacto>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Las 16 provincias vienen del backend, no de una lista escrita a mano: es la
  // misma fuente que usa el resto del admin.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: ProvinciaOpcion[] }>(
          '/provincias/',
          { method: 'GET' },
        );
        if (cancelado) return;
        if (res?.success && Array.isArray(res.data)) {
          setProvincias(
            res.data
              .map((p) => ({ codigo: String(p.codigo), nombre: p.nombre }))
              .sort((a, b) => a.codigo.localeCompare(b.codigo)),
          );
        }
      } catch (e) {
        console.error('Error cargando provincias:', e);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  /** Contacto guardado para lo que está seleccionado, si existe. */
  const contactoActual = useMemo<Contacto | null>(() => {
    if (seleccion === NACIONAL) {
      return contactos.find((c) => !c.provincia_codigo) ?? null;
    }
    return contactos.find((c) => c.provincia_codigo === seleccion) ?? null;
  }, [contactos, seleccion]);

  const nombreSeleccion = seleccion === NACIONAL
    ? 'Nacional (respaldo)'
    : provincias.find((p) => p.codigo === seleccion)?.nombre ?? seleccion;

  /** Provincias que ya tienen contacto propio, para marcarlas en el selector. */
  const codigosConContacto = useMemo(
    () => new Set(contactos.map((c) => c.provincia_codigo).filter(Boolean) as string[]),
    [contactos],
  );

  // Al cambiar de provincia se sale del modo edición: si no, el formulario
  // abierto de una provincia se guardaría sobre la siguiente.
  useEffect(() => {
    setEditando(false);
    setForm(FORM_VACIO);
  }, [seleccion]);

  const empezarEdicion = () => {
    setForm(
      contactoActual
        ? {
            telefono: contactoActual.telefono,
            correo: contactoActual.correo,
            direccion: contactoActual.direccion,
          }
        : FORM_VACIO,
    );
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (contactoActual) {
        await updateContacto(contactoActual.id, {
          ...form,
          provincia_codigo: contactoActual.provincia_codigo ?? null,
          provincia_nombre: contactoActual.provincia_nombre ?? null,
        });
        toast({ title: 'Contacto actualizado', description: `Se guardó el contacto de ${nombreSeleccion}.` });
      } else {
        // No había contacto para esta provincia: editar equivale a crearlo.
        await createContacto({
          ...form,
          provincia_codigo: seleccion === NACIONAL ? null : seleccion,
          provincia_nombre: seleccion === NACIONAL ? null : nombreSeleccion,
        });
        toast({ title: 'Contacto creado', description: `${nombreSeleccion} ya tiene su propio contacto.` });
      }
      setEditando(false);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'No se pudo guardar el contacto.',
        variant: 'destructive',
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader label="Cargando información de contactos..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <p className="font-semibold">No se pudieron cargar los contactos</p>
          <p>{error}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const camposCompletos = form.telefono.trim() && form.correo.trim() && form.direccion.trim();

  return (
    <div className="space-y-5">
      {/* Selector. Se listan TODAS las provincias, tengan contacto o no: la que
          está vacía se rellena editándola, que es lo que la crea. */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Contacto de</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSeleccion(NACIONAL)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              seleccion === NACIONAL
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Nacional
          </button>
          {provincias.map((p) => (
            <button
              key={p.codigo}
              onClick={() => setSeleccion(p.codigo)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                seleccion === p.codigo
                  ? 'bg-blue-600 text-white'
                  : codigosConContacto.has(p.codigo)
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={codigosConContacto.has(p.codigo) ? 'Tiene contacto propio' : 'Sin contacto: usa el nacional'}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          En verde, las provincias con contacto propio. Las grises usan el nacional
          como respaldo, así que nunca se quedan sin número.
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>{nombreSeleccion}</span>
            </div>
            {!editando && (
              <Button variant="outline" size="sm" onClick={empezarEdicion} className="flex items-center space-x-2">
                {contactoActual ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{contactoActual ? 'Editar' : 'Agregar contacto'}</span>
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {seleccion === NACIONAL
              ? 'Es el contacto que ve el pie de página y la portada de la web, y el respaldo de toda provincia sin número propio. Conviene no dejarlo vacío.'
              : contactoActual
                ? 'Este es el contacto que se usa para esta provincia.'
                : 'Esta provincia todavía no tiene contacto propio: hoy usa el nacional. Al agregarlo, empezará a usar el suyo.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {editando ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>Teléfono</span>
                  </Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+53 5 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span>Correo Electrónico</span>
                  </Label>
                  <Input
                    id="correo"
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    placeholder="atencion_al_cliente@suncarsrl.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion" className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span>Dirección</span>
                </Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Calle, número, municipio, provincia"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setEditando(false)} disabled={guardando}
                        className="flex items-center space-x-2">
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </Button>
                <Button onClick={guardar} disabled={guardando || !camposCompletos}
                        className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>{guardando ? 'Guardando…' : 'Guardar'}</span>
                </Button>
              </div>
              {!camposCompletos && (
                <p className="text-xs text-gray-500">
                  El backend exige los tres campos: teléfono, correo y dirección.
                </p>
              )}
            </div>
          ) : contactoActual ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg"><Phone className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-gray-900">{contactoActual.telefono}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg"><Mail className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
                    <p className="text-gray-900">{contactoActual.correo}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
                <div className="p-2 bg-red-100 rounded-lg"><MapPin className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-gray-900">{contactoActual.direccion}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-600">
                {nombreSeleccion} no tiene contacto propio.
              </p>
              <Button variant="outline" size="sm" onClick={empezarEdicion} className="mt-3 flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Agregar contacto</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
