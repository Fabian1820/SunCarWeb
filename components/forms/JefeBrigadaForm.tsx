import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Trabajador } from '@/lib/api-types';

export function JefeBrigadaForm({ onSubmit, onCancel, loading, trabajadores }: {
  onSubmit: (data: { ci: string, nombre: string, contrasena: string, integrantes: string[] }) => void,
  onCancel: () => void,
  loading?: boolean,
  trabajadores: Trabajador[],
}) {
  const [ci, setCi] = useState('');
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [integrantes, setIntegrantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ci.trim() || !nombre.trim() || !contrasena.trim()) {
      setError('CI, nombre y contraseña son obligatorios');
      return;
    }
    onSubmit({ ci, nombre, contrasena, integrantes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">CI</label>
        <input className="border px-2 py-1 rounded w-full" value={ci} onChange={e => setCi(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input className="border px-2 py-1 rounded w-full" value={nombre} onChange={e => setNombre(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <input type="password" className="border px-2 py-1 rounded w-full" value={contrasena} onChange={e => setContrasena(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Integrantes (opcional)</label>
        <select
          multiple
          className="border px-2 py-1 rounded w-full h-32"
          value={integrantes}
          onChange={e => setIntegrantes(Array.from(e.target.selectedOptions, o => o.value))}
        >
          {trabajadores.filter(t => !t.tiene_contraseña).map((t, idx) => (
            <option key={t.id || t.CI || idx} value={t.CI}>{t.nombre} ({t.CI})</option>
          ))}
        </select>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>Guardar</Button>
      </div>
    </form>
  );
} 