# Guía Rápida de Pruebas - Sistema de Cumpleaños 🎂

## Prueba Rápida en 3 Pasos

### 1️⃣ Limpiar LocalStorage

Abre la consola del navegador (F12) y ejecuta:

```javascript
localStorage.removeItem('birthday_check_storage')
console.log('✅ LocalStorage limpiado')
```

### 2️⃣ Verificar Endpoint del Backend

En una terminal, ejecuta:

```bash
curl -H "Authorization: Bearer suncar-token-2025" \
  https://api.suncarsrl.com/api/trabajadores/cumpleanos/hoy
```

**Respuesta esperada (sin cumpleaños):**
```json
{
  "success": true,
  "message": "Se encontraron 0 trabajadores con cumpleaños hoy",
  "data": []
}
```

**Respuesta esperada (con cumpleaños):**
```json
{
  "success": true,
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

### 3️⃣ Recargar Dashboard

```javascript
location.reload()
```

**Resultado esperado:**
- Si hay cumpleaños: Verás la notificación animada con confeti 🎉
- Si no hay: No aparece nada (comportamiento normal)

---

## Simular Cumpleaños (Backend)

### Opción A: Crear Trabajador de Prueba

Crea un trabajador con CI que coincida con hoy:

**Fecha de hoy:** 23 de febrero

**CI requerido:** `AAMMDD...` → `XX0223...`

Ejemplos:
- `980223xxxx` → Nacido 23 Feb 1998
- `850223xxxx` → Nacido 23 Feb 1985
- `000223xxxx` → Nacido 23 Feb 2000

**Crear trabajador:**
```bash
curl -X POST https://api.suncarsrl.com/api/trabajadores/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer suncar-token-2025" \
  -d '{
    "ci": "980223xxxx",
    "nombre": "Juan Test Cumpleaños",
    "cargo": "Técnico de Pruebas"
  }'
```

### Opción B: Modificar Backend Temporalmente

Si tienes acceso al código del backend, crea un endpoint de prueba:

```python
@router.get("/cumpleanos/hoy/test", tags=["Trabajadores"])
def get_cumpleanos_test():
    """Endpoint de prueba que siempre retorna cumpleaños"""
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

Luego modifica temporalmente el servicio frontend:

```typescript
// lib/services/feats/worker/trabajador-service.ts
static async getCumpleanosHoy(): Promise<BirthdaysResponse> {
  // TEMPORAL - SOLO PARA PRUEBAS
  const response = await apiRequest<BirthdaysResponse>('/trabajadores/cumpleanos/hoy/test')
  return response
}
```

**IMPORTANTE:** Revertir este cambio después de las pruebas.

---

## Verificar Logs en Consola

Al cargar el dashboard, busca estos logs:

### Sin cumpleaños:
```
🎂 Verificando cumpleaños de hoy...
🎂 No hay cumpleaños hoy
```

### Con cumpleaños:
```
🎂 Verificando cumpleaños de hoy...
🎉 ¡2 cumpleaños hoy!
[
  { CI: "980523xxxxx", nombre: "Juan...", cargo: "..." },
  { CI: "850523xxxxx", nombre: "María...", cargo: "..." }
]
```

### Ya verificado hoy:
```
🎂 Ya se verificó cumpleaños hoy
```

---

## Inspeccionar LocalStorage

### Ver Estado Actual

```javascript
const storage = localStorage.getItem('birthday_check_storage')
console.log(JSON.parse(storage))
```

**Resultado esperado:**
```javascript
{
  lastCheckedDate: "2026-02-23",  // Fecha actual
  hasShownToday: true              // Ya se mostró
}
```

### Simular Día Anterior

```javascript
localStorage.setItem('birthday_check_storage', JSON.stringify({
  lastCheckedDate: "2026-02-22",  // Ayer
  hasShownToday: true
}))
console.log('✅ Simulando día anterior')
location.reload()
```

Esto forzará una nueva verificación.

### Simular Primera Vez

```javascript
localStorage.removeItem('birthday_check_storage')
console.log('✅ Simulando primera vez')
location.reload()
```

---

## Casos de Prueba

### ✅ Caso 1: Primera Carga (Hay Cumpleaños)

**Setup:**
```javascript
localStorage.removeItem('birthday_check_storage')
// Backend retorna 2 cumpleaños
```

**Resultado esperado:**
1. Se consulta el backend
2. Aparece notificación con confeti
3. Muestra 2 trabajadores
4. Al cerrar, guarda en localStorage:
   ```javascript
   { lastCheckedDate: "2026-02-23", hasShownToday: true }
   ```

### ✅ Caso 2: Segunda Carga Mismo Día

**Setup:**
```javascript
// localStorage ya tiene:
{ lastCheckedDate: "2026-02-23", hasShownToday: true }
```

**Resultado esperado:**
1. NO consulta el backend
2. NO muestra notificación
3. Log: "🎂 Ya se verificó cumpleaños hoy"

### ✅ Caso 3: Carga Día Siguiente

**Setup:**
```javascript
localStorage.setItem('birthday_check_storage', JSON.stringify({
  lastCheckedDate: "2026-02-22", // Ayer
  hasShownToday: true
}))
```

**Resultado esperado:**
1. Consulta el backend nuevamente
2. Si hay cumpleaños, muestra notificación
3. Actualiza localStorage con fecha de hoy

### ✅ Caso 4: No Hay Cumpleaños

**Setup:**
```javascript
localStorage.removeItem('birthday_check_storage')
// Backend retorna data: []
```

**Resultado esperado:**
1. Consulta el backend
2. NO muestra notificación
3. Guarda en localStorage:
   ```javascript
   { lastCheckedDate: "2026-02-23", hasShownToday: true }
   ```
4. Log: "🎂 No hay cumpleaños hoy"

---

## Verificar Confeti

### Confeti Se Lanza 3 Veces

La notificación lanza confeti automáticamente:
- **Inmediatamente** al aparecer
- **A los 3 segundos**
- **A los 6 segundos**

### Verificar Visualmente

1. La notificación debe aparecer con confeti inmediato
2. Esperar 3 segundos → segundo confeti
3. Esperar otros 3 segundos → tercer confeti

### Verificar en Consola

Si no ves confeti, verifica errores:

```javascript
// Prueba manual de confeti
import('canvas-confetti').then(module => {
  const confetti = module.default
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
})
```

---

## Resetear Todo

Para volver al estado inicial:

```javascript
// Limpiar localStorage
localStorage.removeItem('birthday_check_storage')

// Recargar página
location.reload()

console.log('✅ Sistema reseteado')
```

---

## Checklist de Pruebas

- [ ] ✅ Endpoint backend responde correctamente
- [ ] ✅ LocalStorage se guarda correctamente
- [ ] ✅ Primera carga muestra notificación (si hay cumpleaños)
- [ ] ✅ Segunda carga NO muestra notificación (mismo día)
- [ ] ✅ Día siguiente vuelve a verificar
- [ ] ✅ Confeti se lanza 3 veces
- [ ] ✅ Animaciones son suaves
- [ ] ✅ Botón de cerrar funciona
- [ ] ✅ Logs en consola son correctos
- [ ] ✅ No hay errores en consola
- [ ] ✅ Diseño responsive (móvil/desktop)

---

## Solución Rápida de Problemas

| Problema | Solución |
|----------|----------|
| Notificación no aparece | Limpiar localStorage y verificar backend |
| Aparece múltiples veces | Verificar que `markAsShown()` se llama al cerrar |
| Sin confeti | Verificar instalación de `canvas-confetti` |
| Error de red | Verificar token de autenticación |
| LocalStorage no se guarda | Verificar que el dominio permite localStorage |

---

**Documentación completa:** `docs/BIRTHDAY_SYSTEM.md`
