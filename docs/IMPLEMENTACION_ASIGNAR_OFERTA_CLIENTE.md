# Implementación: Asignar Oferta Genérica a Cliente

## ✅ Implementación Completada

Se ha implementado exitosamente la funcionalidad para asignar ofertas genéricas aprobadas a clientes desde la tabla de gestión de clientes.

## 📦 Archivos Modificados/Creados

### 1. **Hook: `hooks/use-ofertas-confeccion.ts`**
   - ✅ Agregada función `fetchOfertasGenericasAprobadas()` - Obtiene ofertas genéricas aprobadas
   - ✅ Agregada función `asignarOfertaACliente()` - Asigna oferta a cliente
   - ✅ Exportadas ambas funciones en el return del hook

### 2. **Componente Nuevo: `components/feats/ofertas/asignar-oferta-generica-dialog.tsx`**
   - ✅ Modal para seleccionar ofertas genéricas aprobadas
   - ✅ Muestra lista de ofertas con detalles completos
   - ✅ Tarjetas visuales con información de cada oferta
   - ✅ Botón de asignar por cada oferta
   - ✅ Estados de carga y feedback visual
   - ✅ Formateo de precios según moneda

### 3. **Tabla de Clientes: `components/feats/customer-service/clients-table.tsx`**
   - ✅ Importado hook `useOfertasConfeccion`
   - ✅ Importado componente `AsignarOfertaGenericaDialog`
   - ✅ Agregados estados para el modal de asignación
   - ✅ Agregada función `openAsignarOfertaDialog()`
   - ✅ Agregada función `closeAsignarOfertaDialog()`
   - ✅ Agregada función `handleAsignarOferta()`
   - ✅ Agregado botón "Asignar Oferta" en columna de acciones (icono FileCheck, color púrpura)
   - ✅ Agregado modal al final del componente

## 🎯 Flujo de Funcionamiento

```
1. Usuario ve tabla de clientes
   ↓
2. Usuario hace clic en botón "Asignar Oferta" (icono FileCheck púrpura)
   ↓
3. Se abre modal con ofertas genéricas aprobadas
   ↓
4. Usuario selecciona una oferta
   ↓
5. Sistema llama al endpoint POST /ofertas/confeccion/asignar-a-cliente
   ↓
6. Backend duplica la oferta y la asigna al cliente
   ↓
7. Se muestra toast de éxito
   ↓
8. Se refresca la tabla de clientes
   ↓
9. Modal se cierra automáticamente
```

## 🎨 Características Visuales

### Botón en Tabla de Clientes
- **Icono**: FileCheck (documento con check)
- **Color**: Púrpura (`text-purple-600 hover:text-purple-700 hover:bg-purple-50`)
- **Posición**: Primera acción después del punto de prioridad
- **Tooltip**: "Asignar oferta genérica"

### Modal de Selección
- **Tamaño**: `max-w-4xl` (ancho grande para mostrar detalles)
- **Altura**: `max-h-[90vh]` con scroll
- **Diseño**: Tarjetas (Cards) con borde izquierdo naranja
- **Información mostrada**:
  - Número de oferta
  - Nombre automático (título principal)
  - Nombre completo (descripción)
  - Lista de items (primeros 5)
  - Badges: Moneda, Almacén, Estado
  - Precio final destacado
  - Botón de asignar

### Estados de Carga
- **Cargando ofertas**: Spinner con mensaje
- **Sin ofertas**: Mensaje informativo con icono
- **Asignando**: Botón con spinner y texto "Asignando..."

## 🔧 Funciones del Hook

### `fetchOfertasGenericasAprobadas()`
```typescript
// Obtiene ofertas genéricas con estado "aprobada_para_enviar"
const ofertas = await fetchOfertasGenericasAprobadas()
// Retorna: OfertaConfeccion[]
```

### `asignarOfertaACliente(ofertaGenericaId, clienteNumero)`
```typescript
// Asigna una oferta genérica a un cliente
const result = await asignarOfertaACliente(
  "6789abcd1234567890abcdef", // ID de oferta genérica
  "CL-20250205-001"            // Número de cliente
)
// Retorna: { success: boolean, ofertaNuevaId?: string, ofertaNueva?: any }
```

## 📡 Endpoint Utilizado

```http
POST /ofertas/confeccion/asignar-a-cliente
Content-Type: application/json

{
  "oferta_generica_id": "6789abcd1234567890abcdef",
  "cliente_numero": "CL-20250205-001"
}
```

### Response Exitoso
```json
{
  "success": true,
  "message": "Oferta genérica duplicada y asignada exitosamente a Juan Pérez",
  "oferta_original_id": "6789abcd1234567890abcdef",
  "oferta_nueva_id": "1234567890abcdef12345678",
  "oferta_nueva": { /* datos completos */ },
  "cliente_numero": "CL-20250205-001",
  "cliente_nombre": "Juan Pérez"
}
```

## ✨ Lo que Hace el Backend

1. **Valida** que la oferta existe y es genérica
2. **Valida** que la oferta está en estado "aprobada_para_enviar"
3. **Valida** que el cliente existe
4. **Duplica** la oferta completa con todos sus items
5. **Cambia** el tipo a "personalizada"
6. **Asigna** el cliente_numero
7. **Genera** nuevo número de oferta único
8. **Establece** estado "en_revision"
9. **Limpia** campos de lead
10. **Agrega** nota de duplicación

## 🎁 Características de la Nueva Oferta

### ✅ Se Duplica:
- Todos los items (materiales)
- Secciones personalizadas
- Elementos personalizados
- Componentes principales
- Nombres (automático y completo)
- Márgenes comerciales
- Descuentos
- Costos de transportación
- Configuración de pago
- Foto de portada
- Almacén

### ❌ NO Se Duplica:
- ID de la oferta (se genera nuevo)
- Número de oferta (se genera nuevo)
- Estado de reserva de materiales
- Fechas (se establecen nuevas)

### 🔄 Se Modifica:
- `tipo_oferta`: "generica" → "personalizada"
- `cliente_numero`: Se asigna el cliente
- `lead_id`: Se limpia (null)
- `nombre_lead_sin_agregar`: Se limpia (null)
- `estado`: "en_revision"
- `materiales_reservados`: false
- `notas`: Se agrega nota de duplicación

## 🧪 Testing

### Prueba Manual
1. Ir a `/clientes`
2. Buscar un cliente en la tabla
3. Hacer clic en el botón púrpura con icono FileCheck
4. Verificar que se abre el modal
5. Verificar que se muestran ofertas genéricas aprobadas
6. Seleccionar una oferta
7. Hacer clic en "Asignar"
8. Verificar toast de éxito
9. Verificar que el modal se cierra
10. Verificar que la tabla se refresca

### Casos de Prueba
- ✅ Cliente sin ofertas previas
- ✅ Cliente con ofertas existentes
- ✅ Sin ofertas genéricas aprobadas (mostrar mensaje)
- ✅ Error de red (mostrar toast de error)
- ✅ Cancelar modal (cerrar sin asignar)

## 📝 Notas Importantes

1. **Estado Inicial**: La nueva oferta se crea en estado "en_revision" para permitir revisión antes de enviarla al cliente.

2. **Sin Reserva**: La nueva oferta NO tiene materiales reservados automáticamente. Debe hacerse manualmente después.

3. **Número Único**: Se genera un nuevo número de oferta siguiendo el formato `OF-YYYYMMDD-XXX`.

4. **Auditoría**: Se agrega una nota automática indicando que la oferta fue duplicada.

5. **Refresh Automático**: Después de asignar, se dispara el evento `refreshClientsTable` para actualizar la lista.

## 🎯 Próximos Pasos (Opcional)

- [ ] Agregar filtro para mostrar solo clientes sin ofertas
- [ ] Agregar vista previa de la oferta antes de asignar
- [ ] Agregar opción de editar la oferta inmediatamente después de asignar
- [ ] Agregar historial de ofertas asignadas por cliente
- [ ] Agregar notificación al cliente cuando se le asigna una oferta

## 📚 Documentación Relacionada

- `docs/ASIGNAR_OFERTA_GENERICA_A_CLIENTE.md` - Documentación completa del endpoint
- `docs/QUICK_START_ASIGNAR_OFERTA.md` - Guía rápida de uso
- `docs/BACKEND_CONFECCION_OFERTAS_SPEC.md` - Especificación completa de ofertas

## ✅ Checklist de Implementación

- [x] Hook actualizado con funciones necesarias
- [x] Componente modal creado
- [x] Botón agregado en tabla de clientes
- [x] Estados y funciones agregadas
- [x] Modal integrado en el componente
- [x] Manejo de errores implementado
- [x] Feedback visual (toasts) implementado
- [x] Refresh automático de tabla
- [x] Sin errores de TypeScript
- [x] Documentación creada

## 🎉 Resultado Final

Los usuarios ahora pueden:
1. Ver la lista de clientes
2. Hacer clic en "Asignar Oferta" para cualquier cliente
3. Seleccionar una oferta genérica aprobada de una lista visual
4. Asignar la oferta con un solo clic
5. Ver confirmación de éxito
6. La oferta se duplica automáticamente y se asigna al cliente
7. La nueva oferta queda lista para revisión y edición

---

**Implementado por**: Kiro AI Assistant  
**Fecha**: 2025-02-05  
**Estado**: ✅ Completado y funcional
