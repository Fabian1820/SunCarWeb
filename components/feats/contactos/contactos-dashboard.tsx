"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/molecule/card';
import { Button } from '@/components/shared/atom/button';
import { Input } from '@/components/shared/molecule/input';
import { Label } from '@/components/shared/atom/label';
import { Loader } from '@/components/shared/atom/loader';
import { Alert, AlertDescription } from '@/components/shared/atom/alert';
import { useContactos } from '@/hooks/use-contactos';
import { Contacto } from '@/lib/contacto-types';
import { Phone, Mail, MapPin, Edit, Save, X, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ContactosDashboard() {
  const { contactos, loading, error, updateContacto } = useContactos();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Contacto | null>(null);

  const handleEdit = (contacto: Contacto) => {
    setEditingId(contacto.id);
    setEditForm({ ...contacto });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    try {
      await updateContacto(editForm.id, {
        telefono: editForm.telefono,
        correo: editForm.correo,
        direccion: editForm.direccion,
      });
      
      setEditingId(null);
      setEditForm(null);
      
      toast({
        title: "Contacto actualizado",
        description: "La información del contacto se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof Contacto, value: string) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
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
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Error de Conexión con el Backend</p>
              <p>{error}</p>
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  <strong>Posibles causas:</strong>
                </p>
                <ul className="text-sm text-red-600 mt-1 space-y-1">
                  <li>• El endpoint <code className="bg-red-100 px-1 rounded">/api/contactos/</code> no está implementado en el backend</li>
                  <li>• El servidor backend no está ejecutándose</li>
                  <li>• Problemas de autenticación (token inválido o expirado)</li>
                  <li>• Error de configuración en la URL del backend</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600">Gestiona la información de contacto de la empresa</p>
      </div>

      {contactos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay contactos registrados</h3>
            <p className="text-gray-600 text-center">
              No se encontró información de contacto en el sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {contactos.map((contacto) => (
            <Card key={contacto.id} className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <span>Información de Contacto</span>
                  </div>
                  {editingId !== contacto.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(contacto)}
                      className="flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Editar</span>
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  Datos de contacto de la empresa SunCar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingId === contacto.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="telefono" className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span>Teléfono</span>
                        </Label>
                        <Input
                          id="telefono"
                          value={editForm?.telefono || ''}
                          onChange={(e) => handleInputChange('telefono', e.target.value)}
                          placeholder="+593 99 123 4567"
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
                          value={editForm?.correo || ''}
                          onChange={(e) => handleInputChange('correo', e.target.value)}
                          placeholder="contacto@suncar.com"
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
                        value={editForm?.direccion || ''}
                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                        placeholder="Av. Amazonas N45-123, Quito, Ecuador"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex items-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                      </Button>
                      <Button
                        onClick={handleSave}
                        className="flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Guardar</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Phone className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Teléfono</p>
                          <p className="text-gray-900">{contacto.telefono}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Mail className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Correo Electrónico</p>
                          <p className="text-gray-900">{contacto.correo}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <MapPin className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Dirección</p>
                        <p className="text-gray-900">{contacto.direccion}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
