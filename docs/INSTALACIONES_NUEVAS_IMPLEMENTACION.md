# Implementación de Instalaciones Nuevas con Endpoint Unificado

## Resumen

Se implementó la integración del endpoint `/api/pendientes-instalacion/` del backend para cargar datos de leads y clientes con estado "Pendiente de Instalación" en la página de Instalaciones Nuevas.

## Archivos Creados

### 1. Servicio de Instalaciones
**Archivo:** `lib/services/feats/instalaciones/instalaciones-service.ts`

Servicio que consume el endpoint del backend:
- `getPendientesInstalacion()`: Obtiene leads y clientes pendientes de instalación

**Tipos incluidos:**
- `OfertaInstalacion`: Estructura de ofertas
- `LeadPendienteInstalacion`: Estructura de leads pendientes
- `ClientePendienteInstalacion`: Estructura de clientes pendientes
- `PendientesInstalacionResponse`: Respuesta completa del endpoint

### 2. Tipos de Instalaciones
**Archivo:** `lib/types/feats/instalaciones/instalaciones-types.ts`

Define el tipo unificado `InstalacionNueva` que combina leads y clientes para mostrar en la tabla.

## Archivos Modificados

### 1. Página de Instalaciones Nuevas
**Archivo:** `app/instalaciones/nuevas/page.tsx`

**Cambios:**
- Reemplazó las llamadas a `LeadService.getLeads()` y `ClienteService.getClientes()` por `InstalacionesService.getPendientesInstalacion()`
- Ahora usa el endpoint unificado del backend que filtra automáticamente por estado "Pendiente de Instalación"
- Muestra un toast con el total de leads y clientes cargados
- Importa tipos desde el archivo centralizado

### 2. Tabla de Instalaciones Nuevas
**Archivo:** `components/feats/instalaciones/instalaciones-nuevas-table.tsx`

**Cambios:**
- Agregó columna "Falta" en la vista de escritorio
- Muestra el campo `falta_instalacion` para clientes (específico de clientes)
- Muestra el campo en la vista móvil también
- Importa tipos desde el archivo centralizado

## Características Implementadas

### 1. Endpoint Unificado
- Un solo endpoint devuelve tanto leads como clientes pendientes
- El backend filtra automáticamente por estado "Pendiente de Instalación"
- Incluye contadores: `total_leads`, `total_clientes`, `total_general`

### 2. Campo Especial: `falta_instalacion`
- Campo exclusivo de clientes
- Describe qué falta para completar la instalación
- Ejemplos: "Esperando entrega de paneles", "Pendiente de permisos"
- Se muestra en color naranja para destacar

### 3. Información Completa
Cada registro incluye:
- Datos básicos: nombre, teléfono, dirección
- Ofertas con detalles de equipos
- Estado actual
- Fecha de contacto
- Información de pago (comprobante, método, moneda)
- Para clientes: coordenadas, CI, fechas de instalación

### 4. Filtros Disponibles
- Búsqueda por texto (nombre, teléfono, dirección)
- Filtro por tipo (todos, leads, clientes)
- Filtro por rango de fechas

## Ventajas de la Implementación

1. **Rendimiento**: Una sola llamada al backend en lugar de dos
2. **Precisión**: El backend filtra exactamente por "Pendiente de Instalación"
3. **Mantenibilidad**: Lógica de filtrado centralizada en el backend
4. **Escalabilidad**: Fácil agregar más campos o filtros en el futuro
5. **Tipos seguros**: TypeScript con tipos completos para toda la estructura

## Flujo de Datos

```
Backend API
    ↓
/api/pendientes-instalacion/
    ↓
InstalacionesService.getPendientesInstalacion()
    ↓
Conversión a InstalacionNueva[]
    ↓
InstalacionesNuevasTable
    ↓
Renderizado con filtros
```

## Ejemplo de Uso

```typescript
// Obtener pendientes de instalación
const data = await InstalacionesService.getPendientesInstalacion()

console.log(`Total: ${data.total_general}`)
console.log(`Leads: ${data.total_leads}`)
console.log(`Clientes: ${data.total_clientes}`)

// Procesar leads
data.leads.forEach(lead => {
  console.log(`Lead: ${lead.nombre}`)
})

// Procesar clientes
data.clientes.forEach(cliente => {
  console.log(`Cliente: ${cliente.numero} - ${cliente.nombre}`)
  console.log(`Falta: ${cliente.falta_instalacion}`)
})
```

## Próximos Pasos Sugeridos

1. Agregar acciones en la tabla (ver detalles, editar, asignar brigada)
2. Implementar exportación a Excel/PDF
3. Agregar gráficos de estadísticas
4. Implementar notificaciones para instalaciones urgentes
5. Agregar filtro por provincia/municipio
6. Implementar vista de mapa con ubicaciones

## Notas Técnicas

- El endpoint requiere autenticación (Bearer Token)
- Los datos se ordenan por fecha de contacto (más recientes primero)
- El campo `falta_instalacion` es opcional y solo aplica a clientes
- Las ofertas pueden ser múltiples, pero típicamente solo una está aprobada y pagada
