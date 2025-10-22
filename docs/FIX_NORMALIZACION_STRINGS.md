# Fix: Normalización de Strings para Comparación de Cargos

## 🐛 Problema Identificado

El sistema estaba comparando strings de cargos de forma sensible a:
- ❌ Mayúsculas vs minúsculas
- ❌ Tildes/acentos
- ❌ Espacios extras
- ❌ Caracteres especiales

**Ejemplo del problema**:
```
Cargo en BD:     "Técnico en Gestión Comercial"
Cargo en código: "tecnico en gestion comercial"
Resultado:       ❌ NO COINCIDE (debería coincidir)
```

## ✅ Solución Implementada

### 1. Función de Normalización
**Archivo**: `lib/utils/string-utils.ts`

Se creó una función robusta que normaliza strings para comparación:

```typescript
normalizeString("Técnico en Gestión Comercial")
// Returns: "tecnicoengestioncomercial"

normalizeString("DIRECTOR   GENERAL")
// Returns: "directorgeneral"
```

**Proceso de normalización**:
1. Convierte a minúsculas
2. Descompone caracteres Unicode (separa letras de tildes)
3. Elimina marcas diacríticas (tildes, acentos)
4. Elimina caracteres especiales y espacios
5. Retorna string limpio

### 2. Funciones de Utilidad

#### `normalizeString(str: string): string`
Normaliza un string para comparación.

#### `compareStrings(str1: string, str2: string): boolean`
Compara dos strings ignorando mayúsculas, tildes y espacios.

```typescript
compareStrings("Técnico en Gestión Comercial", "tecnico en gestion comercial")
// Returns: true ✅
```

#### `containsString(haystack: string, needle: string): boolean`
Verifica si un string contiene otro (ignorando formato).

```typescript
containsString("Técnico en Gestión Comercial", "gestión")
// Returns: true ✅
```

### 3. Integración en AuthContext

**Archivo**: `contexts/auth-context.tsx`

**Antes**:
```typescript
const rol = user.rol.toLowerCase()
if (rol.includes('tecnico en gestion comercial')) {
  // ❌ No coincide con "Técnico en Gestión Comercial"
}
```

**Después**:
```typescript
const normalizedUserRole = normalizeString(user.rol)
const normalizedRoleName = normalizeString('Técnico en Gestión Comercial')

if (normalizedUserRole === normalizedRoleName) {
  // ✅ Coincide correctamente!
}
```

## 📊 Tabla de Normalización

| Cargo Original (BD) | Cargo Normalizado | Match |
|---------------------|-------------------|-------|
| Técnico en Gestión Comercial | tecnicoengestioncomercial | ✅ |
| TÉCNICO EN GESTIÓN COMERCIAL | tecnicoengestioncomercial | ✅ |
| tecnico en gestion comercial | tecnicoengestioncomercial | ✅ |
| Técnico   en   Gestión   Comercial | tecnicoengestioncomercial | ✅ |
| Director General | directorgeneral | ✅ |
| Subdirector(a) | subdirectora | ✅ |

## 🧪 Cómo Probar

### Opción 1: Test Visual (Consola del Navegador)

1. Abre DevTools (F12) en el navegador
2. En Console, ejecuta:

```javascript
// Ver normalización de tu cargo
const userData = JSON.parse(localStorage.getItem('user_data'))
console.log('Cargo original:', userData.rol)

// Simular normalización (copiar función)
function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

console.log('Cargo normalizado:', normalizeString(userData.rol))

// Probar comparaciones
const cargosConfig = [
  'Técnico en Gestión Comercial',
  'Director General',
  'Jefe de Operaciones'
]

console.table(cargosConfig.map(c => ({
  'Config': c,
  'Normalizado': normalizeString(c),
  'Match': normalizeString(c) === normalizeString(userData.rol) ? '✅' : '❌'
})))
```

### Opción 2: Test Automatizado (Node.js)

```bash
# Ejecutar archivo de test
node lib/utils/string-utils.test.ts

# O con ts-node
npx ts-node lib/utils/string-utils.test.ts
```

### Opción 3: Test en la Aplicación

1. **Login** con usuario que tenga cargo con tildes
   - Ejemplo: "Técnico en Gestión Comercial"

2. **Verificar dashboard**
   - Deberías ver: Leads, Clientes, Ofertas, Materiales
   - Si no ves módulos: hay problema de normalización

3. **Revisar consola**
   - Buscar logs de permisos
   - No debería haber warnings de acceso denegado

## 📝 Cargos Soportados

Todos los cargos ahora funcionan con **cualquier formato**:

### ✅ Formato 1: Con Tildes y Mayúsculas (BD Real)
```
✅ Técnico en Gestión Comercial
✅ Director General
✅ Subdirector(a)
✅ Especialista en Gestión Económica
✅ Especialista en Gestión de los Recursos Humanos
✅ Especialista en Gestión Comercial
✅ Especialista en Redes y Sistemas
✅ Jefe de Operaciones
```

### ✅ Formato 2: Sin Tildes, Minúsculas (Código)
```
✅ tecnico en gestion comercial
✅ director general
✅ subdirector
✅ especialista en gestion economica
✅ especialista en gestion de los recursos humanos
✅ especialista en gestion comercial
✅ especialista en redes y sistemas
✅ jefe de operaciones
```

### ✅ Formato 3: Mixto (También funciona)
```
✅ TÉCNICO EN GESTIÓN COMERCIAL
✅ Director   General
✅ Subdirector(a)
✅ TéCnIcO eN GeStIóN CoMeRcIaL
```

## 🔧 Configuración en Código

En `contexts/auth-context.tsx`, los roles están ahora escritos en formato legible:

```typescript
const rolePermissions: Record<string, string[]> = {
  // ✅ Ahora puedes usar cualquier formato
  'Técnico en Gestión Comercial': ['leads', 'clientes', 'ofertas', 'materiales'],
  'Director General': ['*'], // todos
  'Jefe de Operaciones': ['brigadas', 'trabajadores', 'materiales', 'clientes', 'ordenes-trabajo'],
  // ... etc
}
```

**Ventaja**: Más legible y coincide con formato de BD

## 🐛 Troubleshooting

### Problema: Usuario no ve módulos
**Causa**: Cargo de BD no coincide con ninguno en `rolePermissions`

**Solución**:
1. Ver cargo exacto en BD
2. Normalizar con función (ver test arriba)
3. Agregar a `rolePermissions` en formato legible:
   ```typescript
   'Cargo Exacto de BD': ['modulo1', 'modulo2'],
   ```

### Problema: Director no ve todos los módulos
**Causa**: Verificación de "director general" puede fallar

**Solución**: Ya implementada
```typescript
if (
  containsString(user.rol, 'director general') || 
  containsString(user.rol, 'subdirector')
) {
  return true // ✅ Acceso total
}
```

### Verificar Normalización en Tiempo Real

Agregar al componente para debugging:

```tsx
import { normalizeString } from "@/lib/utils/string-utils"

function Debug() {
  const { user } = useAuth()
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Debug Permisos:', {
      cargoOriginal: user?.rol,
      cargoNormalizado: normalizeString(user?.rol || '')
    })
  }
  
  return null
}
```

## ✅ Beneficios de esta Solución

1. **Robusto**: Maneja tildes, mayúsculas, espacios
2. **Legible**: Código más claro con cargos en formato natural
3. **Mantenible**: Un solo lugar para normalización
4. **Reutilizable**: Funciones exportadas para uso global
5. **Probado**: Tests incluidos para verificar

## 📚 Archivos Modificados

```
✅ lib/utils/string-utils.ts          - NUEVO: Funciones de normalización
✅ lib/utils/string-utils.test.ts     - NUEVO: Tests de normalización
✅ contexts/auth-context.tsx           - MODIFICADO: Usa normalización
✅ docs/FIX_NORMALIZACION_STRINGS.md  - NUEVO: Esta documentación
```

## 🚀 Próximos Pasos

1. **Probar con cargos reales de BD**
2. **Verificar que todos los usuarios ven sus módulos**
3. **Actualizar `rolePermissions` con formato de BD si es necesario**

## 📊 Impacto

- ✅ **Backwards Compatible**: Código antiguo sigue funcionando
- ✅ **Sin Breaking Changes**: No requiere migración de datos
- ✅ **Performance**: Normalización es muy rápida (O(n))
- ✅ **Escalable**: Fácil agregar nuevos cargos

---

**Implementado**: 2025-10-21  
**Issue**: Comparación de strings case-sensitive con tildes  
**Solución**: Normalización Unicode con funciones reutilizables  
**Estado**: ✅ COMPLETO
