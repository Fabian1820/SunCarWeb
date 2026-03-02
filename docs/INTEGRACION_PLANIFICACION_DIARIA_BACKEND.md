# Integración de Planificación Diaria con Backend

## Resumen de Cambios

Se ha conectado el módulo de Planificación Diaria de Trabajos con el backend, reemplazando el almacenamiento en localStorage por llamadas a la API REST.

## Archivos Creados

### 1. `lib/services/feats/instalaciones/planificacion-diaria-service.ts`

Servicio completo para interactuar con la API de trabajos de operación y planificación diaria.

**Métodos de Trabajos de Operación:**
- `crearTrabajoOperacion()` - POST /api/trabajos-operacion/
- `obtenerTrabajoOperacion(trabajoId)` - GET /api/trabajos-operacion/{trabajo_id}
- `obtenerTodosTrabajos()` - GET /api/trabajos-operacion/
- `obtenerTrabajosPorContacto(contactoTipo, contactoId)` - GET /api/trabajos-operacion/contacto/{contacto_tipo}/{contacto_id}
- `obtenerTrabajosPorBrigada(brigadaId)` - GET /api/trabajos-operacion/brigada/{brigada_id}
- `actualizarTrabajoOperacion(trabajoId, trabajo)` - PUT /api/trabajos-operacion/{trabajo_id}
- `eliminarTrabajoOperacion(trabajoId)` - DELETE /api/trabajos-operacion/{trabajo_id}

**Métodos de Planificación Diaria:**
- `crearPlanificacionDiaria(planificacion)` - POST /api/planificacion-diaria/
- `obtenerPlanificacionDiaria(planificacionId)` - GET /api/planificacion-diaria/{planificacion_id}
- `obtenerPlanificacionPorFecha(fecha)` - GET /api/planificacion-diaria/fecha/{fecha}
- `obtenerTodasPlanificaciones()` - GET /api/planificacion-diaria/
- `obtenerPlanificacionesPorRango(fechaInicio, fechaFin)` - GET /api/planificacion-diaria/rango/
- `actualizarPlanificacionDiaria(planificacionId, planificacion)` - PUT /api/planificacion-diaria/{planificacion_id}
- `agregarTrabajoAPlanificacion(planificacionId, trabajoId)` - POST /api/planificacion-diaria/{planificacion_id}/trabajos/{trabajo_id}
- `eliminarTrabajoDePlanificacion(planificacionId, trabajoId)` - DELETE /api/planificacion-diaria/{planificacion_id}/trabajos/{trabajo_id}
- `eliminarPlanificacionDiaria(planificacionId)` - DELETE /api/planificacion-diaria/{planificacion_id}

## Funcionalidades Implementadas

### 1. Carga de Planificación
- Carga automática desde el backend al seleccionar una fecha
- Fallback a localStorage si el backend no está disponible
- Conversión automática de datos backend → frontend

### 2. Guardado de Planificación
- Validación de trabajos y asignaciones
- Creación de trabajos de operación individuales
- Creación/actualización de planificación diaria
- Backup automático en localStorage
- Apertura automática del diálogo de visualización

### 3. Visualización de Planificación
- Diálogo modal con resumen completo
- Agrupación por tipo de trabajo
- Información detallada de cada trabajo
- Botón "Ver planificación" en la sección "Planificación en curso"

### 4. Descarga de PDF
- Generación de HTML formateado
- Descarga automática del archivo HTML
- Apertura de ventana de impresión para guardar como PDF
- Diseño profesional con colores por tipo de trabajo
- Información completa: fecha, trabajos, asignaciones, comentarios

### 5. Eliminación de Planificación
- Elimina del backend si existe
- Limpia localStorage
- Resetea todos los estados

## Archivos Modificados

### 1. `components/feats/instalaciones/planificacion-diaria-trabajos-table.tsx`

**Cambios principales:**

1. **Importación del servicio:**
   ```typescript
   import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
   ```

2. **Nuevos estados:**
   - `planificacionId`: Almacena el ID de la planificación en el backend
   - `guardando`: Indica si se está guardando la planificación

3. **Función `useEffect` actualizada:**
   - Ahora intenta cargar la planificación desde el backend primero
   - Si no existe en el backend, intenta cargar desde localStorage como fallback
   - Maneja errores de red y convierte los datos del backend al formato local

4. **Función `guardarPlan` actualizada:**
   - Ahora es asíncrona (`async`)
   - Convierte los items del plan a formato de trabajos de operación del backend
   - Extrae el ID real de brigada/técnico (quita prefijos `brigada:` o `tecnico:`)
   - Crea o actualiza la planificación en el backend según si existe `planificacionId`
   - Mantiene el localStorage como backup
   - Muestra estado de "Guardando..." en el botón

5. **Función `nuevaPlanificacion` actualizada:**
   - Ahora es asíncrona (`async`)
   - Elimina la planificación del backend si existe
   - Limpia el localStorage
   - Resetea todos los estados incluyendo `planificacionId`

6. **Botón de guardar actualizado:**
   - Muestra "Guardando..." mientras se guarda
   - Se deshabilita durante el guardado

7. **Nueva función `descargarPlanificacionPDF`:**
   - Genera HTML formateado con la planificación
   - Descarga archivo HTML
   - Abre ventana de impresión para guardar como PDF
   - Incluye estilos CSS para impresión profesional

8. **Nuevo diálogo de visualización:**
   - Muestra resumen completo de la planificación
   - Agrupado por tipo de trabajo con badges de colores
   - Botón para descargar PDF
   - Se abre automáticamente después de guardar
   - También accesible desde botón "Ver planificación"

9. **Botón "Ver planificación":**
   - Agregado en la sección "Planificación en curso"
   - Solo visible cuando hay trabajos en la planificación
   - Abre el diálogo de visualización

## Flujo de Trabajo Recomendado (según API)

Según la documentación del backend, el flujo correcto es:

1. **Crear trabajos de operación individuales:**
   ```
   POST /api/trabajos-operacion/
   ```
   - Se crea un trabajo por cada item seleccionado
   - Cada trabajo obtiene un ID único del backend

2. **Crear planificación diaria con los trabajos:**
   ```
   POST /api/planificacion-diaria/
   ```
   - Se envía la fecha y el array de trabajos creados
   - Los trabajos ya tienen sus IDs asignados

3. **Consultar planificación del día:**
   ```
   GET /api/planificacion-diaria/fecha/2024-03-15
   ```

## Flujo de Datos

### Carga de Planificación
```
1. Usuario selecciona fecha
2. useEffect se dispara
3. Intenta cargar desde backend (GET /api/planificacion-diaria/fecha/{fecha})
4. Si existe:
   - Convierte trabajos del backend a formato local
   - Actualiza estados (planificacionId, items, asignaciones, etc.)
5. Si no existe en backend:
   - Intenta cargar desde localStorage (fallback)
6. Si hay error de red:
   - Carga desde localStorage (fallback)
```

### Guardado de Planificación
```
1. Usuario hace clic en "Guardar"
2. Valida que haya trabajos y asignaciones
3. PASO 1 - Crear trabajos de operación:
   - Por cada item en planEnCurso:
     a. Extrae contacto_id del uid
     b. Quita prefijos de brigada_id
     c. Crea objeto TrabajoOperacion
     d. POST /api/trabajos-operacion/ (crea el trabajo)
   - Espera a que todos los trabajos se creen (Promise.all)
4. PASO 2 - Crear/actualizar planificación:
   - Usa los trabajos creados (con sus IDs)
   - Si existe planificacionId:
     * PUT /api/planificacion-diaria/{planificacion_id}
   - Si no existe:
     * POST /api/planificacion-diaria/
5. Actualiza estados con respuesta del backend
6. Guarda en localStorage como backup
7. Muestra toast de éxito con cantidad de trabajos creados
8. Abre automáticamente el diálogo de visualización
9. Si hay error, muestra toast de error
```

### Visualización y Descarga de PDF
```
1. Usuario hace clic en "Ver planificación" o se abre automáticamente después de guardar
2. Se muestra diálogo modal con:
   - Resumen: total de trabajos, fecha de actualización
   - Trabajos agrupados por tipo con badges de colores
   - Detalles completos de cada trabajo
3. Usuario hace clic en "Descargar PDF":
   - Se genera HTML formateado con estilos CSS
   - Se descarga archivo HTML
   - Se abre ventana de impresión del navegador
   - Usuario puede guardar como PDF desde el diálogo de impresión
4. Muestra toast de confirmación
```

### Eliminación de Planificación
```
1. Usuario hace clic en "Nueva planificación"
2. Si existe planificacionId:
   - DELETE /api/planificacion-diaria/{planificacion_id}
3. Elimina del localStorage
4. Resetea todos los estados
5. Muestra toast de confirmación
```

## Mapeo de Datos

### Frontend → Backend

**PlanTrabajoItem → TrabajoOperacion:**
```typescript
{
  uid: "visita:cliente:C001",           // Se descompone
  tipo: "visita",                       → tipo_trabajo: "visita"
  brigadaId: "brigada:BR001",           → brigada_id: "BR001" (sin prefijo)
  comentario: "Llevar paneles",         → comentario: "Llevar paneles"
}
```

**Extracción de contacto del uid:**
```typescript
uid: "tipo:contactoTipo:contactoId"
// Ejemplo: "visita:cliente:C001"
parts = uid.split(":")
contacto_tipo = parts[1]  // "cliente"
contacto_id = parts[2]    // "C001"
```

### Backend → Frontend

**TrabajoOperacion → PlanTrabajoItem:**
```typescript
{
  tipo_trabajo: "visita",               → tipo: "visita"
  contacto_tipo: "cliente",             → Se usa para reconstruir uid
  contacto_id: "C001",                  → Se usa para reconstruir uid
  brigada_id: "BR001",                  → brigadaId: "brigada:BR001" (con prefijo)
  comentario: "Llevar paneles",         → comentario: "Llevar paneles"
}
```

## Compatibilidad con localStorage

El sistema mantiene compatibilidad con localStorage como:
- **Backup**: Cada guardado en backend también guarda en localStorage
- **Fallback**: Si el backend no está disponible, carga desde localStorage
- **Migración suave**: Planificaciones antiguas en localStorage siguen funcionando

## Manejo de Errores

1. **Error de red al cargar:**
   - Intenta cargar desde localStorage
   - No muestra error al usuario (fallback silencioso)

2. **Error al guardar:**
   - Muestra toast con mensaje de error
   - No guarda en localStorage si falla el backend
   - Mantiene el estado actual sin cambios

3. **Error al eliminar:**
   - Muestra toast con mensaje de error
   - No elimina del localStorage si falla el backend

## Tipos TypeScript

```typescript
interface TrabajoOperacion {
  id?: string;
  tipo_trabajo: string;
  contacto_tipo: "cliente" | "lead";
  contacto_id: string;
  oferta_id?: string;
  brigada_id: string;
  comentario?: string;
  created_at?: string;
  updated_at?: string;
}

interface PlanificacionDiaria {
  id?: string;
  fecha: string;
  trabajos: TrabajoOperacion[];
  created_at?: string;
  updated_at?: string;
}
```

## Próximos Pasos Sugeridos

1. **Migración de datos:**
   - Crear script para migrar planificaciones de localStorage al backend

2. **Sincronización:**
   - Implementar sincronización automática cada X minutos
   - Detectar cambios en otros dispositivos

3. **Optimizaciones:**
   - Implementar caché de planificaciones recientes
   - Agregar indicador de estado de sincronización

4. **Funcionalidades adicionales:**
   - Historial de cambios en planificaciones
   - Notificaciones a brigadas cuando se les asigna un trabajo
   - Vista de planificaciones por brigada

## Notas Importantes

- Los prefijos `brigada:` y `tecnico:` son solo para el frontend
- El backend solo recibe el ID sin prefijo en `brigada_id`
- El campo `oferta_id` no se está usando actualmente pero está disponible
- Las fechas se envían en formato ISO 8601: `YYYY-MM-DDTHH:mm:ss`
- El sistema es retrocompatible con planificaciones en localStorage

## Generación de PDF

### Características del PDF

1. **Formato HTML con CSS:**
   - Se genera un documento HTML completo con estilos embebidos
   - Diseño profesional con colores por tipo de trabajo
   - Optimizado para impresión (media queries)

2. **Contenido incluido:**
   - Título: "Planificación Diaria de Trabajos"
   - Fecha de la planificación
   - Total de trabajos
   - Última actualización
   - Trabajos agrupados por tipo con badges de colores
   - Detalles completos de cada trabajo:
     * Nombre del cliente/lead
     * Teléfono
     * Dirección
     * Descripción del trabajo
     * Brigada/técnico asignado
     * Comentarios (si existen)

3. **Colores por tipo de trabajo:**
   - Visitas: Naranja (#fed7aa)
   - Entrega de equipamiento: Azul (#bfdbfe)
   - Instalaciones nuevas: Verde (#a7f3d0)
   - Instalaciones en proceso: Púrpura (#ddd6fe)
   - Averías: Rojo (#fecaca)

4. **Proceso de descarga:**
   - Se descarga archivo HTML: `planificacion-YYYY-MM-DD.html`
   - Se abre ventana de impresión automáticamente
   - Usuario puede guardar como PDF desde el diálogo de impresión del navegador
   - Compatible con todos los navegadores modernos

### Uso del PDF

1. Hacer clic en "Ver planificación"
2. En el diálogo, hacer clic en "Descargar PDF"
3. Se descarga el archivo HTML y se abre la ventana de impresión
4. En el diálogo de impresión:
   - Seleccionar "Guardar como PDF" como destino
   - Ajustar configuración si es necesario
   - Hacer clic en "Guardar"
5. El PDF se guarda en la ubicación seleccionada
