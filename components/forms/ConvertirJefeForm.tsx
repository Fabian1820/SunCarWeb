import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import type { Trabajador } from '@/lib/api-types';

export function ConvertirJefeForm({ onSubmit, onCancel, loading, trabajador, trabajadores }: {
  onSubmit: (data: { contrasena: string, integrantes: string[] }) => void,
  onCancel: () => void,
  loading?: boolean,
  trabajador: Trabajador,
  trabajadores: Trabajador[],
}) {
  const [contrasena, setContrasena] = useState('');
  const [integrantes, setIntegrantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contrasena.trim()) {
      setError('La contraseña es obligatoria');
      return;
    }
    onSubmit({ contrasena, integrantes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Trabajador</label>
        <div className="bg-gray-100 rounded px-2 py-1">{trabajador.nombre} ({trabajador.CI})</div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contraseña</label>
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"} 
            className="border px-2 py-1 rounded w-full pr-10" 
            value={contrasena} 
            onChange={e => setContrasena(e.target.value)} 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Integrantes (opcional)</label>
        <div className="border rounded p-3 max-h-48 overflow-y-auto">
          {trabajadores.filter(t => !t.tiene_contraseña && t.CI !== trabajador.CI).length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {trabajadores.filter(t => !t.tiene_contraseña && t.CI !== trabajador.CI).map(t => (
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
              No hay trabajadores disponibles para asignar
            </p>
          )}
        </div>
        {integrantes.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            Seleccionados: {integrantes.length} trabajador{integrantes.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>Convertir</Button>
      </div>
    </form>
  );
} 