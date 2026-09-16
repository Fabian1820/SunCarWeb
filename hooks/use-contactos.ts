import { useState, useEffect } from 'react';
import { ContactoService } from '@/lib/api-services';
import { Contacto, ContactoCreateData, ContactoUpdateData } from '@/lib/contacto-types';

export const useContactos = () => {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContactos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContactoService.getContactos();
      setContactos(data);
    } catch (err) {
      setError('Error al cargar los contactos');
      console.error('Error fetching contactos:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateContacto = async (id: string, data: ContactoUpdateData) => {
    try {
      const updatedContacto = await ContactoService.updateContacto(id, data);
      setContactos(prev => 
        prev.map(contacto => 
          contacto.id === id ? updatedContacto : contacto
        )
      );
      return updatedContacto;
    } catch (err) {
      setError('Error al actualizar el contacto');
      throw err;
    }
  };

  const createContacto = async (data: ContactoCreateData) => {
    try {
      const nuevo = await ContactoService.createContacto(data);
      // Se recarga en vez de insertar a mano: el backend asigna el id y
      // normaliza el codigo de provincia ('3' -> '03'), asi que la lista tiene
      // que venir de el o el selector no encontraria el contacto recien creado.
      await fetchContactos();
      return nuevo;
    } catch (err) {
      setError('Error al crear el contacto');
      throw err;
    }
  };

  useEffect(() => {
    fetchContactos();
  }, []);

  return {
    contactos,
    loading,
    error,
    fetchContactos,
    updateContacto,
    createContacto,
  };
};
