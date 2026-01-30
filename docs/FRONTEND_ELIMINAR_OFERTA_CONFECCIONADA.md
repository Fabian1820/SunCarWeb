# Frontend - Eliminar Oferta Confeccionada

## Endpoint Backend

```
DELETE /api/ofertas-confeccion/{oferta_id}
```

## Validaciones Backend

- ❌ No permite eliminar si tiene materiales reservados
- ✅ Limpia automáticamente la referencia en cliente/lead
- ✅ Elimina la oferta de la base de datos

---

## Implementación Frontend

### 1. Servicio API (ofertasConfeccionService.ts)

```typescript
// Eliminar oferta confeccionada
export const eliminarOfertaConfeccionada = async (ofertaId: string): Promise<ApiResponse> => {
  try {
    const response = await api.delete(`/ofertas-confeccion/${ofertaId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(error.response.data.detail || 'No se puede eliminar una oferta con materiales reservados');
    }
    if (error.response?.status === 404) {
      throw new Error('Oferta no encontrada');
    }
    throw new Error('Error al eliminar la oferta');
  }
};
```

---

### 2. Componente con Botón de Eliminar

```typescript
import { useState } from 'react';
import { eliminarOfertaConfeccionada } from '@/services/ofertasConfeccionService';
import { Trash2 } from 'lucide-react';

interface EliminarOfertaButtonProps {
  ofertaId: string;
  tieneReservas: boolean;
  onSuccess?: () => void;
}

export const EliminarOfertaButton = ({ 
  ofertaId, 
  tieneReservas,
  onSuccess 
}: EliminarOfertaButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEliminar = async () => {
    setLoading(true);
    try {
      await eliminarOfertaConfeccionada(ofertaId);
      toast.success('Oferta eliminada exitosamente');
      setShowConfirm(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={tieneReservas}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          ${tieneReservas 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-red-500 text-white hover:bg-red-600'
          }
        `}
        title={tieneReservas ? 'No se puede eliminar: tiene materiales reservados' : 'Eliminar oferta'}
      >
        <Trash2 size={18} />
        Eliminar
      </button>

      {/* Modal de Confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">¿Eliminar oferta?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. La oferta será eliminada y se limpiará 
              la referencia en el cliente o lead asociado.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
```

---

### 3. Uso en Lista de Ofertas

```typescript
import { EliminarOfertaButton } from '@/components/ofertas/EliminarOfertaButton';

export const ListaOfertas = () => {
  const [ofertas, setOfertas] = useState([]);

  const handleOfertaEliminada = () => {
    // Recargar lista de ofertas
    fetchOfertas();
  };

  return (
    <div className="space-y-4">
      {ofertas.map((oferta) => (
        <div key={oferta.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold">{oferta.nombre_oferta}</h3>
              <p className="text-sm text-gray-600">
                {oferta.cliente_numero || oferta.lead_id}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
                Ver
              </button>
              <button className="px-4 py-2 bg-green-500 text-white rounded-lg">
                Editar
              </button>
              <EliminarOfertaButton
                ofertaId={oferta.id}
                tieneReservas={oferta.materiales_reservados?.length > 0}
                onSuccess={handleOfertaEliminada}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### 4. Uso en Detalle de Oferta

```typescript
import { useRouter } from 'next/router';
import { EliminarOfertaButton } from '@/components/ofertas/EliminarOfertaButton';

export const DetalleOferta = ({ oferta }) => {
  const router = useRouter();

  const handleOfertaEliminada = () => {
    // Redirigir a la lista de ofertas
    router.push('/ofertas');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{oferta.nombre_oferta}</h1>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            Editar
          </button>
          <EliminarOfertaButton
            ofertaId={oferta.id}
            tieneReservas={oferta.materiales_reservados?.length > 0}
            onSuccess={handleOfertaEliminada}
          />
        </div>
      </div>

      {/* Resto del contenido */}
    </div>
  );
};
```

---

### 5. Con React Query (Opcional)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eliminarOfertaConfeccionada } from '@/services/ofertasConfeccionService';

export const useEliminarOferta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ofertaId: string) => eliminarOfertaConfeccionada(ofertaId),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['ofertas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Oferta eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });
};

// Uso en componente
export const OfertaCard = ({ oferta }) => {
  const eliminarMutation = useEliminarOferta();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEliminar = () => {
    eliminarMutation.mutate(oferta.id, {
      onSuccess: () => setShowConfirm(false)
    });
  };

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={oferta.materiales_reservados?.length > 0}
      >
        Eliminar
      </button>
      {/* Modal de confirmación */}
    </div>
  );
};
```

---

## Respuestas del Backend

### Éxito (200)
```json
{
  "success": true,
  "message": "Oferta eliminada exitosamente",
  "data": null
}
```

### Error - Tiene Reservas (400)
```json
{
  "detail": "No se puede eliminar una oferta con materiales reservados"
}
```

### Error - No Encontrada (404)
```json
{
  "detail": "Oferta no encontrada"
}
```

---

## Consideraciones UX

1. **Deshabilitar botón** si tiene materiales reservados
2. **Mostrar tooltip** explicando por qué está deshabilitado
3. **Confirmación obligatoria** antes de eliminar
4. **Feedback visual** durante la eliminación
5. **Redirección** después de eliminar (si estás en detalle)
6. **Actualizar listas** automáticamente

---

## Permisos Recomendados

```typescript
// Solo permitir eliminar a ciertos roles
const puedeEliminar = ['admin', 'gerente'].includes(user.rol);

<EliminarOfertaButton
  ofertaId={oferta.id}
  tieneReservas={oferta.materiales_reservados?.length > 0}
  onSuccess={handleOfertaEliminada}
  disabled={!puedeEliminar}
/>
```

---

## Checklist de Implementación

- [ ] Agregar función `eliminarOfertaConfeccionada` al servicio
- [ ] Crear componente `EliminarOfertaButton`
- [ ] Agregar modal de confirmación
- [ ] Implementar manejo de errores
- [ ] Deshabilitar si tiene reservas
- [ ] Agregar feedback visual (loading, toast)
- [ ] Actualizar lista después de eliminar
- [ ] Agregar permisos por rol
- [ ] Probar flujo completo
- [ ] Verificar limpieza en cliente/lead
