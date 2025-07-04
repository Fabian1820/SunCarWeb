import { useState, useEffect } from 'react';
import { BrigadaService, TrabajadorService } from '@/lib/api-services';
import type { Brigada, Trabajador } from '@/lib/api-types';

export function useBrigadasTrabajadores() {
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, t] = await Promise.all([
        BrigadaService.getAllBrigadas(),
        TrabajadorService.getAllTrabajadores(),
      ]);
      
      setBrigadas(b);
      setTrabajadores(t);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  return {
    brigadas,
    trabajadores,
    loading,
    error,
    refetch: fetchAll,
  };
} 