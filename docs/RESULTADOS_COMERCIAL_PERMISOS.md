# Permisos en Resultados por Comercial

## Descripción

El módulo "Resultados por Comercial" implementa un sistema de permisos que restringe la visualización de montos de margen en las tarjetas de estadísticas según el usuario autenticado.

## Reglas de Permisos

### 1. Usuario Administrador
**Usuario**: Yanet Clara Rodríguez Quintana

**Permisos**:
- ✅ Puede ver el margen total en TODAS las tarjetas
- ✅ Puede ver todas las estadísticas sin restricciones

### 2. Comerciales
**Usuarios**: Cualquier otro comercial (ej: Gretel María Mojena Almenares)

**Permisos**:
- ✅ Puede ver el margen total SOLO en su propia tarjeta
- ⚠️ En las tarjetas de otros comerciales solo ve "Ofertas Cerradas"
- ⚠️ El margen total aparece como "Restringido" con icono de candado

## Implementación

### Código

```typescript
// Usuario con permisos completos
const ADMIN_USER = "Yanet Clara Rodríguez Quintana"
const canViewAllAmounts = user?.nombre === ADMIN_USER

// Función para verificar si el usuario puede ver el monto de una tarjeta
const canViewAmount = (comercial: string) => {
  if (canViewAllAmounts) return true
  return user?.nombre === comercial
}
```

### Visualización en Tarjetas

```typescript
{estadisticas.map((stat) => {
  const showAmount = canViewAmount(stat.comercial)
  
  return (
    <Card>
      {/* ... */}
      {showAmount ? (
        // Muestra el monto
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-green-600" />
          <span className="text-sm font-bold text-green-600">
            {formatCurrency(stat.total_margen)}
          </span>
        </div>
      ) : (
        // Muestra "Restringido"
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">
            Restringido
          </span>
        </div>
      )}
    </Card>
  )
})}
```

## Ejemplos Visuales

### Caso 1: Yanet Clara Rodríguez Quintana (Usuario Normal - Sin Restricciones)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 5         │
│ Margen Total: 💵 $10,200.00 │  │ Margen Total: 💵 $7,500.00  │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Gretel María Mojena A.      │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: 💵 $4,800.00  │  │ Margen Total: 💵 $3,200.00  │
└─────────────────────────────┘  └─────────────────────────────┘
```

**Resultado**: Ve todos los montos (no está en la lista de usuarios restringidos)

---

### Caso 2: Gretel María Mojena Almenares (Usuario Restringido)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 5         │
│ Margen Total: 🔒 Restringido│  │ Margen Total: 🔒 Restringido│
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Gretel María Mojena A.      │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: 💵 $4,800.00  │  │ Margen Total: 🔒 Restringido│
└─────────────────────────────┘  └─────────────────────────────┘
```

**Resultado**: Solo ve su propio monto (está en la lista de usuarios restringidos)

---

### Caso 3: Ariagna Carballo Gil (Usuario Restringido)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Ariagna Carballo Gil        │
│ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 4         │
│ Margen Total: 🔒 Restringido│  │ Margen Total: 💵 $6,200.00  │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Gretel María Mojena A.      │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: 🔒 Restringido│  │ Margen Total: 🔒 Restringido│
└─────────────────────────────┘  └─────────────────────────────┘
```

**Resultado**: Solo ve su propio monto (está en la lista de usuarios restringidos)

---

### Caso 4: Dashel Pinillos Zubiaur (Usuario Restringido)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Dashel Pinillos Zubiaur     │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 6         │  │ Ofertas Cerradas: 5         │
│ Margen Total: 💵 $8,500.00  │  │ Margen Total: 🔒 Restringido│
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Gretel María Mojena A.      │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: 🔒 Restringido│  │ Margen Total: 🔒 Restringido│
└─────────────────────────────┘  └─────────────────────────────┘
```

**Resultado**: Solo ve su propio monto (está en la lista de usuarios restringidos)

---

### Caso 5: Cualquier Otro Usuario (Sin Restricciones)

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 5         │
│ Margen Total: 💵 $10,200.00 │  │ Margen Total: 💵 $7,500.00  │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Gretel María Mojena A.      │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: 💵 $4,800.00  │  │ Margen Total: 💵 $3,200.00  │
└─────────────────────────────┘  └─────────────────────────────┘
```

**Resultado**: Ve todos los montos (no está en la lista de usuarios restringidos)

---

## Tabla de Permisos

| Usuario | Tarjeta Propia | Otras Tarjetas | Tarjeta "Sin asignar" |
|---------|----------------|----------------|----------------------|
| Gretel María Mojena Almenares | ✅ Monto visible | 🔒 Restringido | 🔒 Restringido |
| Ariagna Carballo Gil | ✅ Monto visible | 🔒 Restringido | 🔒 Restringido |
| Dashel Pinillos Zubiaur | ✅ Monto visible | 🔒 Restringido | 🔒 Restringido |
| Yanet Clara Rodríguez Quintana | ✅ Monto visible | ✅ Monto visible | ✅ Monto visible |
| Cualquier otro usuario | ✅ Monto visible | ✅ Monto visible | ✅ Monto visible |

## Datos Siempre Visibles

Independientemente del usuario, TODOS pueden ver:

1. ✅ Nombre del comercial en la tarjeta
2. ✅ Número de ofertas cerradas
3. ✅ Toda la tabla de ofertas (sin restricciones)
4. ✅ Filtros y búsqueda
5. ✅ Resumen de totales (en la parte inferior)

**Solo se restringe**: El monto de margen total en las tarjetas de estadísticas

## Flujo de Verificación

```
Usuario accede al módulo
         ↓
Se obtiene user.nombre del contexto de autenticación
         ↓
¿user.nombre está en RESTRICTED_USERS?
         ↓
    Sí  │  No
        │
        ↓
isRestrictedUser = true/false
         ↓
Para cada tarjeta:
  ¿canViewAmount(comercial)?
         ↓
  Si NO es restringido → Muestra monto
  Si ES restringido:
    ¿comercial === user.nombre?
         ↓
    Sí  │  No
        │
        ↓
  Muestra monto  │  Muestra "Restringido"
```

## Consideraciones Técnicas

### 1. Comparación de Nombres
La comparación se hace por nombre completo exacto:
```typescript
const RESTRICTED_USERS = [
  "Gretel María Mojena Almenares",
  "Ariagna Carballo Gil",
  "Dashel Pinillos Zubiaur"
]
const isRestrictedUser = RESTRICTED_USERS.includes(user?.nombre || "")
```

**Importante**: Los nombres deben coincidir exactamente (mayúsculas, espacios, acentos)

### 2. Usuario No Autenticado
Si no hay usuario autenticado (`user === null`):
- Todos los montos aparecen como "Restringido"
- Solo se muestran las ofertas cerradas

### 3. Tarjeta "Sin asignar"
Las ofertas sin comercial asignado:
- Usuarios restringidos ven "Restringido"
- Otros usuarios ven el monto completo

### 4. Tabla de Ofertas
La tabla NO tiene restricciones:
- Todos los usuarios ven todas las columnas
- Incluye columnas de margen, precio, etc.

## Modificar Permisos

### Agregar Otro Usuario Restringido

```typescript
const RESTRICTED_USERS = [
  "Gretel María Mojena Almenares",
  "Ariagna Carballo Gil",
  "Dashel Pinillos Zubiaur",
  "Nuevo Usuario Restringido"  // Agregar aquí
]
```

### Quitar Restricción de un Usuario

```typescript
// Simplemente remover de la lista
const RESTRICTED_USERS = [
  "Gretel María Mojena Almenares",
  "Ariagna Carballo Gil"
  // Dashel Pinillos Zubiaur removido
]
```

### Cambiar a Lógica Inversa (Lista de Permitidos)

```typescript
// En lugar de lista de restringidos, usar lista de permitidos
const ALLOWED_USERS = [
  "Yanet Clara Rodríguez Quintana",
  "Otro Usuario Admin"
]

const canViewAmount = (comercial: string) => {
  // Si está en la lista de permitidos, puede ver todo
  if (ALLOWED_USERS.includes(user?.nombre || "")) return true
  // Si no, solo ve su propio monto
  return user?.nombre === comercial
}
```

## Testing

### Casos de Prueba

1. **Login como Yanet (Usuario Normal)**
   - ✅ Verificar que ve todos los montos
   - ✅ Verificar que no hay iconos de candado

2. **Login como Gretel (Usuario Restringido)**
   - ✅ Verificar que solo ve su monto
   - ✅ Verificar que otras tarjetas muestran "Restringido"
   - ✅ Verificar icono de candado en tarjetas restringidas

3. **Login como Ariagna (Usuario Restringido)**
   - ✅ Verificar que solo ve su monto
   - ✅ Verificar restricciones en otras tarjetas

4. **Login como Dashel (Usuario Restringido)**
   - ✅ Verificar que solo ve su monto
   - ✅ Verificar restricciones en otras tarjetas

5. **Login como otro usuario (Usuario Normal)**
   - ✅ Verificar que ve todos los montos
   - ✅ Verificar que no hay restricciones

## Preguntas Frecuentes

**P: ¿Por qué la tabla no tiene restricciones?**
R: La restricción solo aplica a las tarjetas de estadísticas. La tabla muestra información detallada de cada oferta individual, no totales por comercial.

**P: ¿Puedo ver ofertas de otros comerciales?**
R: Sí, todos los usuarios pueden ver todas las ofertas en la tabla. Solo se restringe el monto total en las tarjetas.

**P: ¿Qué pasa si mi nombre no coincide exactamente?**
R: Si tu nombre en el sistema no coincide exactamente con el nombre del comercial en las ofertas, no podrás ver tu monto. Contacta al administrador para corregir el nombre.

**P: ¿Puedo filtrar por mi nombre?**
R: Sí, puedes usar el filtro de comercial para ver solo tus ofertas, independientemente de los permisos de visualización de montos.

**P: ¿El resumen de totales está restringido?**
R: No, el resumen en la parte inferior de la tabla es visible para todos los usuarios.

## Seguridad

### Nivel de Seguridad
- ✅ Frontend: Oculta visualmente los montos
- ⚠️ Backend: Los datos siguen llegando al frontend

**Nota**: Esta es una restricción de visualización en el frontend. Los datos completos siguen llegando desde el backend. Para seguridad completa, el backend debería filtrar los datos según el usuario.

### Recomendación para Producción
Implementar filtrado en el backend:
```python
# Backend (Python/FastAPI)
if user.nombre != "Yanet Clara Rodríguez Quintana":
    # Filtrar solo ofertas del comercial
    ofertas = ofertas.filter(contacto.comercial == user.nombre)
```

## Changelog

### v2.1.0 (2024-02-18) - Sistema de Permisos
- ✅ Implementado sistema de permisos por usuario
- ✅ Yanet puede ver todos los montos
- ✅ Comerciales solo ven su propio monto
- ✅ Icono de candado para montos restringidos
- ✅ Tabla sin restricciones

## Archivos Modificados

- `components/feats/reportes-comercial/resultados-comercial-table.tsx`
  - Agregado `useAuth` hook
  - Agregada lógica de permisos
  - Agregado icono `Lock`
  - Modificada visualización de tarjetas

## Resumen

✅ 3 usuarios restringidos: Gretel, Ariagna, Dashel  
✅ Usuarios restringidos solo ven su propio monto  
✅ Todos los demás usuarios ven todos los montos  
✅ Tarjetas restringidas muestran "Restringido" con candado  
✅ Tabla sin restricciones para todos  
✅ Filtros y búsqueda funcionan normalmente  

**El sistema de permisos está implementado y funcional.**
