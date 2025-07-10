import { useState } from 'react';
import { Button } from '@/components/shared/atom/button';
import type { Brigade } from '@/lib/brigade-types';
import type { Trabajador } from '@/lib/api-types';

export function AsignarBrigadaForm({ onSubmit, onCancel, loading, brigadas, trabajador }: {
  onSubmit: (data: { brigadaId: string }) => void,
  onCancel: () => void,
  loading?: boolean,
  brigadas: Brigade[],
  trabajador: Trabajador,
}) {
  const [brigadaId, setBrigadaId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!brigadaId) {
      setError('Debes seleccionar una brigada');
      return;
    }
    onSubmit({ brigadaId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Trabajador</label>
        <div className="bg-gray-100 rounded px-2 py-1">{trabajador.nombre} ({trabajador.CI})</div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Brigada</label>
        <select className="border px-2 py-1 rounded w-full" value={brigadaId} onChange={e => setBrigadaId(e.target.value)}>
          <option value="">Seleccionar brigada</option>
          {brigadas
            .filter(b => b.id && b.id.length > 0)
            .map((b, idx) => {
              const liderNombre = b.leader?.name || b.leader?.ci || '';
              const value = b.id;
              const key = value || idx;
              const shortId = value ? value.slice(0, 6) : '';
              return (
                <option key={key} value={value}>
                  {liderNombre} {shortId && `(${shortId})`}
                </option>
              );
            })}
        </select>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>Asignar</Button>
      </div>
    </form>
  );
} 