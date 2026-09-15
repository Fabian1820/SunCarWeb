import { useState } from 'react';
import { Button } from '@/components/shared/atom/button';
import { Crown, X } from 'lucide-react';
import type { Trabajador } from '@/lib/api-types';
import type { Brigade } from '@/lib/brigade-types';

export function ConvertirJefeForm({ onSubmit, onCancel, loading, trabajador, trabajadores, brigades = [] }: {
  onSubmit: (data: { integrantes: string[] }) => void,
  onCancel: () => void,
  loading?: boolean,
  trabajador: Trabajador,
  trabajadores: Trabajador[],
  brigades?: Brigade[],
}) {
  const [integrantes, setIntegrantes] = useState<string[]>([]);

  // CIs que ya pertenecen a alguna brigada (jefe o integrante) — no tiene sentido
  // ofrecerlos como integrantes de la brigada nueva de este jefe.
  const cisEnBrigada = new Set(
    brigades.flatMap((b) => [b.leader.ci, ...b.members.map((m) => m.ci)]),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ integrantes });
  };

  const candidatos = trabajadores.filter(t =>
    !t.es_jefe_brigada &&
    t.CI !== trabajador.CI &&
    (t.is_brigadista === true || t.is_brigadista === undefined) &&
    !cisEnBrigada.has(t.CI),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Trabajador</label>
        <div className="bg-gray-100 rounded px-2 py-1">{trabajador.nombre} ({trabajador.CI})</div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Integrantes (opcional)</label>
        <div className="border rounded p-3 max-h-48 overflow-y-auto">
          {candidatos.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {candidatos.map(t => (
                <label key={t.id || t.CI} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={integrantes.includes(t.CI)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIntegrantes([...integrantes, t.CI]);
                      } else {
                        setIntegrantes(integrantes.filter(ci => ci !== t.CI));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{t.nombre}</span>
                    <span className="text-gray-500 ml-1">({t.CI})</span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              No hay trabajadores brigadistas disponibles para asignar
            </p>
          )}
        </div>
        {integrantes.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Seleccionados: {integrantes.length} trabajador{integrantes.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="icon"
          className="w-10 sm:w-auto sm:px-4 touch-manipulation"
          title="Cancelar"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Cancelar</span>
          <span className="sr-only">Cancelar</span>
        </Button>
        <Button
          type="submit"
          disabled={loading}
          size="icon"
          className="w-10 sm:w-auto sm:px-4 touch-manipulation"
          title="Convertir"
          aria-label="Convertir"
        >
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Convertir</span>
          <span className="sr-only">Convertir</span>
        </Button>
      </div>
    </form>
  );
}
