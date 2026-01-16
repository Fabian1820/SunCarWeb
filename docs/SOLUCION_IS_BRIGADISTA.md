# ✅ Solución: is_brigadista en Módulo de Instaladores

## Problema Resuelto

Los trabajadores creados desde el botón "Agregar Instalador" no aparecían en la tabla porque no tenían el campo `is_brigadista: true`.

## Causa Raíz

El endpoint `POST /api/trabajadores/` **NO guarda** el campo `is_brigadista` directamente. Este campo se actualiza mediante el endpoint de Recursos Humanos: `PUT /api/trabajadores/{ci}/rrhh`.

## Solución Implementada

Ahora, después de crear un trabajador, hacemos una llamada adicional al endpoint de RRHH para actualizar `is_brigadista: true`.

### Flujo de Creación

```typescript
// 1. Crear el trabajador
const trabajadorId = await TrabajadorService.crearTrabajador(ci, nombre, contrasena)

// 2. Actualizar is_brigadista usando endpoint de RRHH
await RecursosHumanosService.actualizarTrabajadorRRHH(ci, { is_brigadista: true })
```

### Archivos Modificados

#### 1. `app/trabajadores/page.tsx`
- Importado `RecursosHumanosService`
- Modificado `handleCreateWorker` para llamar al endpoint de RRHH después de crear el trabajador
- Se aplica a todos los modos: trabajador simple, trabajador con brigada, jefe sin integrantes, jefe con integrantes

#### 2. `lib/types/feats/recursos-humanos/recursos-humanos-types.ts`
- Agregado `is_brigadista?: boolean` al tipo `ActualizarTrabajadorRRHHRequest`

#### 3. `lib/services/feats/worker/trabajador-service.ts`
- Eliminado el envío de `is_brigadista` en los métodos (ya que el endpoint no lo acepta)
- El campo se actualiza mediante el endpoint de RRHH

---

## Cómo Funciona Ahora

### Crear Instalador Regular

```typescript
// Usuario crea instalador desde el botón
handleCreateWorker({ mode: 'trabajador', ci: '12345678', name: 'Juan Pérez' })

// Backend:
// 1. POST /api/trabajadores/ → Crea trabajador
// 2. PUT /api/trabajadores/12345678/rrhh → Actualiza { is_brigadista: true }
```

### Crear Jefe de Brigada

```typescript
// Usuario crea jefe de brigada
handleCreateWorker({ 
  mode: 'jefe', 
  ci: '87654321', 
  name: 'María García',
  password: 'password123'
})

// Backend:
// 1. POST /api/trabajadores/jefes_brigada → Crea jefe
// 2. PUT /api/trabajadores/87654321/rrhh → Actualiza { is_brigadista: true }
```

---

## Verificación

### 1. Crear un instalador de prueba
1. Ir a "Gestión de Instaladores"
2. Click en "Agregar Instalador"
3. Llenar formulario y crear

### 2. Verificar en MongoDB
```javascript
db.trabajadores.findOne({ CI: "12345678" })
```

**Debe mostrar:**
```json
{
  "_id": ObjectId("..."),
  "CI": "12345678",
  "nombre": "Juan Pérez",
  "is_brigadista": true  // ← AHORA SÍ EXISTE
}
```

### 3. Verificar en el frontend
- El instalador DEBE aparecer inmediatamente en la tabla
- El filtro por `is_brigadista: true` funciona correctamente

---

## Comparación con Recursos Humanos

Recursos Humanos usa **exactamente el mismo flujo**:

```typescript
// En hooks/use-recursos-humanos.ts
const crearTrabajador = async (data: CrearTrabajadorRRHHRequest) => {
  // 1. Crear trabajador
  const trabajador_id = await TrabajadorService.crearTrabajador(
    data.ci,
    data.nombre,
    data.contrasena
  )
  
  // 2. Actualizar datos de RRHH (incluyendo is_brigadista)
  const rrhhData: ActualizarTrabajadorRRHHRequest = {}
  if (data.cargo) rrhhData.cargo = data.cargo
  if (data.salario_fijo !== undefined) rrhhData.salario_fijo = data.salario_fijo
  // ... otros campos
  
  if (Object.keys(rrhhData).length > 0) {
    await RecursosHumanosService.actualizarTrabajadorRRHH(data.ci, rrhhData)
  }
}
```

---

## Endpoints Utilizados

### 1. POST /api/trabajadores/
Crea el trabajador básico con CI, nombre y contraseña opcional.

**Request:**
```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez",
  "contrasena": "password123"  // opcional
}
```

### 2. PUT /api/trabajadores/{ci}/rrhh
Actualiza campos adicionales del trabajador, incluyendo `is_brigadista`.

**Request:**
```json
{
  "is_brigadista": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Datos de RRHH actualizados para el trabajador con CI 12345678."
}
```

---

## Ventajas de Esta Solución

1. ✅ **Consistente**: Usa el mismo flujo que Recursos Humanos
2. ✅ **Sin cambios en el backend**: No requiere modificar endpoints existentes
3. ✅ **Funciona inmediatamente**: Los instaladores aparecen en la tabla al crearlos
4. ✅ **Mantenible**: Usa servicios y tipos ya existentes

---

## Notas Importantes

- El endpoint `POST /api/trabajadores/` **NO acepta** el campo `is_brigadista` directamente
- El campo `is_brigadista` se actualiza mediante `PUT /api/trabajadores/{ci}/rrhh`
- Este es el mismo patrón que usa Recursos Humanos para crear trabajadores
- No se requieren cambios en el backend

---

**Fecha**: Enero 2026  
**Estado**: ✅ Resuelto  
**Módulo**: Gestión de Instaladores
