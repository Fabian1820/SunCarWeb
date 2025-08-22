import { useState, useEffect } from 'react';
import { ContactoService } from '@/lib/api-services';
import { Contacto, ContactoUpdateData } from '@/lib/contacto-types';

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

  useEffect(() => {
    fetchContactos();
  }, []);

  return {
    contactos,
    loading,
    error,
    fetchContactos,
    updateContacto,
  };
};
