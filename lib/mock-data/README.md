# Datos Mock para Atención al Cliente

Este directorio contiene datos de prueba para el módulo de atención al cliente mientras se desarrolla el backend.

## Archivos incluidos:

- `customer-service.ts` - Datos mock de mensajes y estadísticas
- `../mock-services/atencion-cliente-mock.ts` - Servicio mock que simula la API

## Cómo cambiar de datos mock a API real:

Cuando tengas el backend listo, sigue estos pasos:

### 1. Actualizar el hook principal

En `hooks/use-atencion-cliente.ts`, cambia estas líneas:

```typescript
// CAMBIAR DE:
import { AtencionClienteMockService as ServiceToUse } from '@/lib/mock-services/atencion-cliente-mock'

// A:
import { AtencionClienteService as ServiceToUse } from '@/lib/api-services'
```

### 2. Verificar que el servicio API real esté implementado

El servicio real ya está implementado en `lib/api-services.ts` con la clase `AtencionClienteService`. 

Asegúrate de que tu backend tenga estos endpoints:

- `GET /atencion-cliente/mensajes` - Obtener mensajes con filtros
- `GET /atencion-cliente/mensajes/:id` - Obtener mensaje específico
- `PUT /atencion-cliente/mensajes/:id/estado` - Actualizar estado
- `PUT /atencion-cliente/mensajes/:id/prioridad` - Actualizar prioridad
- `POST /atencion-cliente/mensajes/:id/respuestas` - Crear respuesta
- `GET /atencion-cliente/estadisticas` - Obtener estadísticas

### 3. Configurar la URL del backend

Asegúrate de que la variable `NEXT_PUBLIC_API_URL` en tu `.env.local` apunte a tu backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Datos de prueba incluidos:

- 8 mensajes de diferentes tipos (queja, consulta, sugerencia, reclamo)
- Diferentes estados (nuevo, en_proceso, respondido, cerrado)
- Diferentes prioridades (baja, media, alta, urgente)
- Respuestas públicas e internas de ejemplo
- Estadísticas calculadas dinámicamente

## Funcionalidades que funcionan con mock:

✅ Listar mensajes con filtros
✅ Ver detalles de mensaje
✅ Cambiar estado de mensaje
✅ Cambiar prioridad de mensaje
✅ Agregar respuestas públicas/internas
✅ Estadísticas en tiempo real
✅ Búsqueda y filtrado
✅ Persistencia durante la sesión

Los cambios se mantienen mientras la página esté abierta, pero se reinician al recargar.