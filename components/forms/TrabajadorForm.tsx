import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TrabajadorForm({ onSubmit, onCancel, loading }: {
  onSubmit: (data: { ci: string, nombre: string }) => void,
  onCancel: () => void,
  loading?: boolean
}) {
  const [ci, setCi] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ci.trim() || !nombre.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }
    onSubmit({ ci, nombre });
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
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>Guardar</Button>
      </div>
    </form>
  );
} 