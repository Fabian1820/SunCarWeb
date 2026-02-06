# Endpoint: Clientes con Ofertas Confeccionadas

## Resumen

Nuevo endpoint que retorna los números de clientes únicos que tienen ofertas confeccionadas (no null).

## Endpoint

```
GET /api/ofertas-confeccion/clientes-con-ofertas
```

## Autenticación

Requiere token JWT en el header:
```
Authorization: Bearer {token}
```

## Respuesta

### Exitosa (200)

```json
{
  "success": true,
  "message": "4 clientes encontrados con ofertas",
  "data": {
    "numeros_clientes": [
      "F0306127",
      "F0312113",
      "F0504136",
      "P090800231"
    ],
    "total": 4
  }
}
```

### Error (500)

```json
{
  "detail": "Error obteniendo números de clientes con ofertas: {mensaje}"
}
```

## Datos de Prueba

Según la prueba ejecutada:
- **Total ofertas confeccionadas**: 89
- **Ofertas con cliente_numero**: 89
- **Clientes únicos con ofertas**: 4
- **Distribución**:
  - Ofertas genéricas: 59
  - Ofertas personalizadas: 30

### Clientes encontrados:
1. **F0306127** - 3 ofertas
2. **F0312113** - 1 oferta
3. **F0504136** - 1 oferta
4. **P090800231** - 1 oferta

## Uso en Frontend

### JavaScript/TypeScript

```javascript
// Obtener clientes con ofertas
const response = await fetch('/api/ofertas-confeccion/clientes-con-ofertas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

if (data.success) {
  const numerosClientes = data.data.numeros_clientes;
  const total = data.data.total;
  
  console.log(`${total} clientes con ofertas:`, numerosClientes);
  
  // Filtrar clientes que tienen ofertas
  const clientesConOfertas = todosLosClientes.filter(
    cliente => numerosClientes.includes(cliente.numero)
  );
}
```

### React Example

```tsx
import { useState, useEffect } from 'react';

function ClientesConOfertas() {
  const [numerosClientes, setNumerosClientes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClientesConOfertas() {
      try {
        const response = await fetch('/api/ofertas-confeccion/clientes-con-ofertas', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setNumerosClientes(data.data.numeros_clientes);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClientesConOfertas();
  }, []);

  return (
    <div>
      <h2>Clientes con Ofertas: {numerosClientes.length}</h2>
      <ul>
        {numerosClientes.map(numero => (
          <li key={numero}>{numero}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Casos de Uso

1. **Filtrar clientes en listas**: Mostrar solo clientes que tienen ofertas confeccionadas
2. **Validación**: Verificar si un cliente tiene ofertas antes de realizar acciones
3. **Estadísticas**: Contar cuántos clientes tienen ofertas activas
4. **Búsqueda**: Autocompletar solo con clientes que tienen ofertas

## Implementación

### Archivos Modificados

1. **infrastucture/repositories/oferta_confeccion_repository.py**
   - Agregado método `get_numeros_clientes_con_ofertas()`
   - Usa `distinct()` de MongoDB para obtener valores únicos

2. **application/services/oferta_confeccion_service.py**
   - Agregado método `get_numeros_clientes_con_ofertas()`
   - Maneja la lógica de negocio y logging

3. **presentation/routers/oferta_confeccion_router.py**
   - Agregado endpoint GET `/clientes-con-ofertas`
   - Retorna respuesta estructurada con success, message y data

### Pruebas

- **Script de prueba**: `test_clientes_con_ofertas_endpoint.py`
- **Archivo HTTP**: `test/test_clientes_con_ofertas.http`
- **Resultado**: ✅ Todos los tests pasaron correctamente

## Notas Técnicas

- El endpoint usa `distinct()` de MongoDB para eficiencia
- Filtra valores `null` y strings vacíos
- No requiere paginación (lista pequeña de números)
- Retorna solo números de cliente, no objetos completos
- Es rápido y eficiente para grandes volúmenes de datos

## Relación con Cambios Anteriores

Este endpoint complementa los cambios realizados donde:
- Se eliminó el campo `oferta_personalizada_id` de clientes y leads
- La relación ahora es unidireccional: Oferta → Cliente
- Para saber qué clientes tienen ofertas, se consulta la colección de ofertas

## Próximos Pasos

El endpoint está listo para usar en el frontend. Puedes:
1. Integrarlo en las vistas de clientes
2. Usarlo para filtros y búsquedas
3. Combinarlo con otros endpoints para obtener detalles completos
