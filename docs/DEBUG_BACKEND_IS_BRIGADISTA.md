# URGENTE: Backend NO está guardando is_brigadista

## ⚠️ Problema Crítico

El backend **NO está guardando** el campo `is_brigadista: true` que el frontend envía correctamente.

**Resultado**: Los trabajadores creados desde el botón "Agregar Instalador" NO aparecen en la tabla porque no tienen `is_brigadista: true`.

## ✅ Frontend Está Correcto

El frontend **SÍ está enviando** el campo correctamente en todos los requests:

```typescript
// En lib/services/feats/worker/trabajador-service.ts

// 1. Crear trabajador
body: JSON.stringify({ ci, nombre, contrasena, is_brigadista: true })

// 2. Crear jefe de brigada  
body: JSON.stringify({ ci, nombre, contrasena, integrantes, is_brigadista: true })

// 3. Convertir a jefe
body: JSON.stringify({ contrasena, integrantes, is_brigadista: true })
```

## ❌ Backend NO Está Guardando el Campo

El backend necesita ser modificado **URGENTEMENTE** para aceptar y guardar este campo.

---

## 🔧 SOLUCIÓN: Modificar el Backend

Debes modificar **3 endpoints** en el backend para que acepten y guarden el campo `is_brigadista`.

### 1. Verificar qué está recibiendo el backend

Agrega logs en el backend para ver si está recibiendo el campo:

```python
@router.post("/")
async def crear_trabajador(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(None),
    is_brigadista: bool = Body(True)
):
    print(f"DEBUG - Recibido: ci={ci}, nombre={nombre}, is_brigadista={is_brigadista}")
    
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "is_brigadista": is_brigadista,  # ← Asegúrate de que esto se guarde
    }
    
    if contrasena:
        trabajador["contraseña"] = contrasena
    
    print(f"DEBUG - Guardando en DB: {trabajador}")
    result = db.trabajadores.insert_one(trabajador)
    print(f"DEBUG - Resultado: {result.inserted_id}")
```

### 2. Verificar en MongoDB

Después de crear un trabajador, verifica en MongoDB:

```javascript
// Ver todos los trabajadores con sus campos
db.trabajadores.find({}, { CI: 1, nombre: 1, is_brigadista: 1 }).pretty()

// Ver solo los que NO tienen is_brigadista
db.trabajadores.find({ is_brigadista: { $exists: false } }, { CI: 1, nombre: 1 })

// Ver solo los que tienen is_brigadista: true
db.trabajadores.find({ is_brigadista: true }, { CI: 1, nombre: 1 })
```

### 3. Verificar el request desde el frontend

Abre las DevTools del navegador (F12) → Network → Crea un trabajador → Busca el request a `/trabajadores/` → Verifica el Payload:

**Debería verse así:**
```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez",
  "is_brigadista": true
}
```

---

## Posibles Causas del Problema

### Causa 1: El backend no acepta el parámetro

**Síntoma**: El backend ignora el campo `is_brigadista` del request.

**Solución**: Agregar el parámetro en la función:
```python
is_brigadista: bool = Body(True)
```

### Causa 2: El backend no lo guarda en el documento

**Síntoma**: El backend recibe el campo pero no lo incluye en el documento que inserta.

**Solución**: Agregar el campo al diccionario:
```python
trabajador = {
    "CI": ci,
    "nombre": nombre,
    "is_brigadista": is_brigadista,  # ← Agregar esta línea
}
```

### Causa 3: El modelo Pydantic no incluye el campo

**Síntoma**: Si usas modelos Pydantic, el campo puede estar siendo filtrado.

**Solución**: Agregar el campo al modelo:
```python
class TrabajadorCreate(BaseModel):
    ci: str
    nombre: str
    contrasena: Optional[str] = None
    is_brigadista: bool = True  # ← Agregar esta línea
```

---

## Migración de Datos Existentes

Si ya tienes trabajadores sin el campo `is_brigadista`, ejecuta este script en MongoDB:

```javascript
// Marcar todos los trabajadores existentes como brigadistas
db.trabajadores.updateMany(
  { is_brigadista: { $exists: false } },
  { $set: { is_brigadista: true } }
)

// Verificar el resultado
db.trabajadores.find({}, { CI: 1, nombre: 1, is_brigadista: 1 }).pretty()
```

---

## Prueba Manual

### Paso 1: Crear un trabajador desde el frontend
1. Ir a "Gestión de Instaladores"
2. Click en "Agregar Instalador"
3. Llenar el formulario:
   - Nombre: "Test Trabajador"
   - CI: "99999999"
   - Rol: Instalador Regular
4. Click en "Crear Instalador"

### Paso 2: Verificar en MongoDB
```javascript
db.trabajadores.findOne({ CI: "99999999" })
```

**Resultado esperado:**
```json
{
  "_id": ObjectId("..."),
  "CI": "99999999",
  "nombre": "Test Trabajador",
  "is_brigadista": true,  // ← Este campo DEBE existir
  // ... otros campos
}
```

### Paso 3: Verificar en el frontend
1. Refrescar la página
2. El trabajador "Test Trabajador" DEBE aparecer en la tabla

---

## Checklist de Verificación

- [ ] El frontend envía `is_brigadista: true` en el request (verificar en Network tab)
- [ ] El backend tiene el parámetro `is_brigadista: bool = Body(True)` en la función
- [ ] El backend guarda el campo en el documento: `"is_brigadista": is_brigadista`
- [ ] MongoDB muestra el campo cuando consultas el trabajador
- [ ] El trabajador aparece en la tabla del frontend después de crearlo

---

## Solución Definitiva

Una vez que el backend esté guardando correctamente el campo `is_brigadista`, puedes:

### Opción 1: Mantener el filtro desactivado (ACTUAL)
Mostrar todos los trabajadores sin filtrar por `is_brigadista`. Esto es útil si quieres ver tanto instaladores como personal administrativo.

### Opción 2: Reactivar el filtro
Si solo quieres mostrar instaladores/brigadistas, restaura el filtro original:

```typescript
const filteredTrabajadores = Array.isArray(trabajadores) ? trabajadores.filter(w =>
  (w.is_brigadista === true)  // Solo brigadistas
  && (workerType === 'todos' ? true : workerType === 'jefes' ? w.tiene_contraseña : !w.tiene_contraseña)
  && (workerSearch === '' || w.nombre.toLowerCase().includes(workerSearch.toLowerCase()) || w.CI.includes(workerSearch))
) : [];
```

---

## Contacto

Si el problema persiste después de verificar todos los puntos:
1. Comparte los logs del backend
2. Comparte el resultado de la consulta en MongoDB
3. Comparte el payload del request desde Network tab

**Fecha**: Enero 2026
**Estado**: Solución temporal aplicada - Esperando corrección del backend
