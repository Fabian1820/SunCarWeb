# Sistema de Notificaciones de Cumpleaños 🎂

## Descripción General

El sistema de notificaciones de cumpleaños muestra automáticamente una notificación animada con confeti cuando hay trabajadores que cumplen años en el día actual. La notificación aparece **una sola vez al día** por usuario.

## Características Principales

✅ **Verificación automática diaria** con el backend
✅ **Animación de confeti** múltiple para celebrar
✅ **Diseño atractivo** con gradientes y animaciones
✅ **Una notificación por día** por usuario
✅ **LocalStorage** para controlar la frecuencia de visualización
✅ **Información completa** del trabajador (nombre y cargo)

## Arquitectura

### 1. Endpoint del Backend

**Ruta:** `GET /api/trabajadores/cumpleanos/hoy`

**Respuesta:**
```typescript
{
  "success": boolean,
  "message": string,
  "data": [
    {
      "CI": string,
      "nombre": string,
      "cargo": string
    }
  ]
}
```

**Lógica:**
- Extrae día/mes de los primeros 6 dígitos del CI cubano (formato AAMMDD)
- Compara con la fecha actual del servidor
- Devuelve lista de trabajadores que cumplen años hoy

### 2. Tipos TypeScript

**Archivo:** `lib/types/feats/trabajador/birthday-types.ts`

```typescript
export interface TrabajadorBirthdayInfo {
  CI: string
  nombre: string
  cargo: string
}

export interface BirthdaysResponse {
  success: boolean
  message: string
  data: TrabajadorBirthdayInfo[]
}

export interface BirthdayCheckStorage {
  lastCheckedDate: string // YYYY-MM-DD
  hasShownToday: boolean
}
```

### 3. Servicio de API

**Archivo:** `lib/services/feats/worker/trabajador-service.ts`

**Método:** `TrabajadorService.getCumpleanosHoy()`

```typescript
static async getCumpleanosHoy(): Promise<BirthdaysResponse> {
  const response = await apiRequest<BirthdaysResponse>('/trabajadores/cumpleanos/hoy')
  return response
}
```

### 4. Hook Personalizado

**Archivo:** `hooks/use-birthday-check.ts`

**Funciones principales:**
- `getTodayDate()`: Obtiene fecha actual en formato YYYY-MM-DD
- `getStoredState()`: Lee estado del localStorage
- `saveStoredState()`: Guarda estado en localStorage
- `shouldCheckToday()`: Determina si debe verificar con el backend
- `markAsShown()`: Marca como mostrado hoy
- `checkBirthdays()`: Consulta el backend y actualiza estado

**Lógica de verificación diaria:**
```typescript
// Verifica si debe consultar el backend
const shouldCheckToday = (): boolean => {
  const stored = getStoredState()
  const today = getTodayDate()

  if (!stored) return true // Primera vez
  if (stored.lastCheckedDate !== today) return true // Día diferente
  if (stored.hasShownToday) return false // Ya se mostró hoy
  return true // Mismo día pero no se ha mostrado
}
```

**LocalStorage key:** `birthday_check_storage`

**Estructura guardada:**
```json
{
  "lastCheckedDate": "2026-02-23",
  "hasShownToday": true
}
```

### 5. Componente de Notificación

**Archivo:** `components/shared/molecule/birthday-notification.tsx`

**Características:**
- 🎉 **Confeti animado**: Lanza confeti múltiples veces (0s, 3s, 6s)
- 🎨 **Diseño atractivo**: Gradientes amarillo/naranja, bordes dorados
- 💫 **Animaciones suaves**: Entrada con escala/rotación, items con slide-in
- 📱 **Responsive**: Se adapta a diferentes tamaños de pantalla
- 🎂 **Íconos visuales**: Pastel animado, globos, emojis

**Librerías usadas:**
- `canvas-confetti`: Para efectos de confeti

**Estructura visual:**
```
┌─────────────────────────────────┐
│   🎂 Confeti animado           │
│                                 │
│   🍰 ¡Feliz Cumpleaños! 🎂    │
│                                 │
│   [Avatar] Juan Pérez          │
│            Técnico Solar       🎈│
│                                 │
│   [Avatar] María López         │
│            Administradora      🎈│
│                                 │
│   ¡Deséale un feliz cumpleaños!│
│                                 │
│   [ ¡Entendido! 🎉 ]          │
└─────────────────────────────────┘
```

### 6. Componente Contenedor

**Archivo:** `components/shared/molecule/birthday-checker.tsx`

**Función:**
- Usa el hook `useBirthdayCheck()`
- Renderiza `BirthdayNotification` cuando hay cumpleaños
- Llama `markAsShown()` al cerrar la notificación

### 7. Integración en Dashboard

**Archivo:** `app/page.tsx`

**Ubicación:** Después de los diálogos, antes del `<Toaster />`

```tsx
{/* Birthday Notification Checker */}
<BirthdayChecker />

<Toaster />
```

## Flujo de Funcionamiento

### Primera Carga del Día

```mermaid
Usuario abre dashboard
  ↓
BirthdayChecker se monta
  ↓
use-birthday-check ejecuta useEffect
  ↓
Verifica localStorage: ¿última fecha != hoy?
  ↓ SÍ
Llama TrabajadorService.getCumpleanosHoy()
  ↓
Backend responde con lista de cumpleaños
  ↓
¿Hay cumpleaños (data.length > 0)?
  ↓ SÍ
Guarda en localStorage: { lastCheckedDate: hoy, hasShownToday: false }
  ↓
Actualiza estado: shouldShow = true
  ↓
BirthdayNotification se renderiza
  ↓
Lanza confeti automáticamente (3 veces)
  ↓
Usuario cierra notificación
  ↓
Llama markAsShown()
  ↓
Actualiza localStorage: { lastCheckedDate: hoy, hasShownToday: true }
  ↓
Notificación desaparece
```

### Cargas Subsecuentes del Mismo Día

```mermaid
Usuario abre dashboard nuevamente
  ↓
BirthdayChecker se monta
  ↓
use-birthday-check ejecuta useEffect
  ↓
Verifica localStorage: ¿última fecha == hoy && hasShownToday == true?
  ↓ SÍ
shouldCheckToday() retorna false
  ↓
NO consulta el backend
  ↓
shouldShow permanece false
  ↓
BirthdayChecker retorna null (no renderiza nada)
```

### Próximo Día

```mermaid
Usuario abre dashboard al día siguiente
  ↓
localStorage tiene: { lastCheckedDate: "2026-02-23", hasShownToday: true }
  ↓
Fecha actual: "2026-02-24"
  ↓
shouldCheckToday() compara: "2026-02-23" !== "2026-02-24"
  ↓ DIFERENTE
Consulta backend nuevamente
  ↓
[Repite flujo desde inicio]
```

## Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install canvas-confetti @types/canvas-confetti --legacy-peer-deps
```

### 2. Archivos Creados

```
lib/
  types/feats/trabajador/
    ├── birthday-types.ts           # ✅ Tipos TypeScript
  services/feats/worker/
    ├── trabajador-service.ts       # ✅ Método getCumpleanosHoy()

hooks/
  ├── use-birthday-check.ts         # ✅ Hook personalizado

components/shared/molecule/
  ├── birthday-notification.tsx     # ✅ Componente de UI
  ├── birthday-checker.tsx          # ✅ Componente contenedor

app/
  ├── page.tsx                      # ✅ Dashboard (integración)
```

### 3. Backend

**Endpoint requerido:**
- `GET /api/trabajadores/cumpleanos/hoy`
- Autenticación: Bearer Token
- Retorna lista de trabajadores con cumpleaños

## Pruebas y Debugging

### Verificar Funcionamiento

1. **Abrir consola del navegador:**
   - Buscar logs: `🎂 Verificando cumpleaños de hoy...`
   - Si hay cumpleaños: `🎉 ¡X cumpleaños hoy!`
   - Si no hay: `🎂 No hay cumpleaños hoy`

2. **Verificar localStorage:**
   ```javascript
   // En consola del navegador:
   JSON.parse(localStorage.getItem('birthday_check_storage'))
   // Resultado esperado:
   // { lastCheckedDate: "2026-02-23", hasShownToday: true }
   ```

3. **Forzar re-verificación:**
   ```javascript
   // Borrar localStorage:
   localStorage.removeItem('birthday_check_storage')
   // Recargar página
   location.reload()
   ```

### Simular Cumpleaños (Backend)

Para probar, modifica temporalmente el endpoint del backend para retornar datos de prueba:

```python
# Temporal - Solo para pruebas
@router.get("/cumpleanos/hoy")
def get_cumpleanos_hoy_test():
    return {
        "success": True,
        "message": "Se encontraron 2 trabajadores con cumpleaños hoy",
        "data": [
            {
                "CI": "980523xxxxx",
                "nombre": "Juan Carlos Pérez García",
                "cargo": "Técnico Solar"
            },
            {
                "CI": "850523xxxxx",
                "nombre": "María González Rodríguez",
                "cargo": "Administradora"
            }
        ]
    }
```

## Personalización

### Cambiar Frecuencia de Confeti

**Archivo:** `components/shared/molecule/birthday-notification.tsx`

```typescript
// Líneas 26-27
confettiTimers.push(setTimeout(launchConfetti, 3000)) // Segundo confeti
confettiTimers.push(setTimeout(launchConfetti, 6000)) // Tercer confeti

// Cambiar a 5 y 10 segundos:
confettiTimers.push(setTimeout(launchConfetti, 5000))
confettiTimers.push(setTimeout(launchConfetti, 10000))
```

### Cambiar Colores

**Archivo:** `components/shared/molecule/birthday-notification.tsx`

```tsx
// Gradiente del card (línea 73):
className="... bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50"

// Cambiar a azul/morado:
className="... bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"

// Botón principal (línea 138):
className="... bg-gradient-to-r from-yellow-500 to-orange-500"

// Cambiar a verde:
className="... bg-gradient-to-r from-green-500 to-emerald-500"
```

### Cambiar Duración de Animación

**Archivo:** `components/shared/molecule/birthday-notification.tsx`

```typescript
// Duración de fade in/out (línea 15):
const showTimer = setTimeout(() => {
  setIsVisible(true)
}, 100) // 100ms

// Cambiar a 500ms para animación más lenta:
}, 500)

// Duración de fade out al cerrar (línea 67):
setTimeout(onClose, 300) // 300ms

// Cambiar a 600ms:
setTimeout(onClose, 600)
```

## Consideraciones de Rendimiento

### LocalStorage

- **Ventaja**: Persiste entre sesiones/tabs
- **Tamaño**: ~50 bytes por usuario (insignificante)
- **Privacidad**: Solo guarda fechas, no datos sensibles

### API Calls

- **Frecuencia**: Máximo 1 llamada por día por usuario
- **Impacto**: Mínimo (solo al primer acceso del día)
- **Caché**: LocalStorage evita llamadas redundantes

### Confeti

- **Librería**: `canvas-confetti` (ligera, ~20kb)
- **Rendimiento**: Canvas nativo del navegador
- **Cleanup**: Automático al desmontar componente

## Solución de Problemas

### La notificación no aparece

1. **Verificar backend:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://api.suncarsrl.com/api/trabajadores/cumpleanos/hoy
   ```

2. **Verificar localStorage:**
   - Si `hasShownToday: true`, borrar y recargar

3. **Verificar consola:**
   - Buscar errores de red o TypeScript

### La notificación aparece múltiples veces

1. **Verificar localStorage:**
   - Debe actualizarse correctamente al cerrar

2. **Verificar llamadas a `markAsShown()`:**
   - Debe llamarse al cerrar la notificación

### El confeti no aparece

1. **Verificar instalación:**
   ```bash
   npm list canvas-confetti
   ```

2. **Verificar import:**
   ```typescript
   import confetti from 'canvas-confetti'
   ```

3. **Verificar consola:**
   - Errores de Canvas API

## Mantenimiento

### Actualizar Backend

Si cambias la estructura de la respuesta del backend, actualiza:

1. `lib/types/feats/trabajador/birthday-types.ts`
2. `lib/services/feats/worker/trabajador-service.ts`

### Agregar Más Información

Para mostrar más datos del trabajador (ej: foto, edad):

1. **Backend**: Agregar campos a la respuesta
2. **Tipos**: Actualizar `TrabajadorBirthdayInfo`
3. **UI**: Modificar `birthday-notification.tsx`

Ejemplo:
```typescript
// birthday-types.ts
export interface TrabajadorBirthdayInfo {
  CI: string
  nombre: string
  cargo: string
  foto_url?: string  // Nuevo campo
  edad?: number      // Nuevo campo
}

// birthday-notification.tsx
<img src={birthday.foto_url} alt={birthday.nombre} />
<p>Cumple {birthday.edad} años</p>
```

## Referencias

- **canvas-confetti**: https://www.npmjs.com/package/canvas-confetti
- **React Hooks**: https://react.dev/reference/react
- **Next.js 15**: https://nextjs.org/docs
- **localStorage**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

**Última actualización:** 2026-02-23
**Versión:** 1.0.0
**Autor:** Claude Code (Anthropic)
