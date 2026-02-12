# ⚠️ URGENTE: Backend debe guardar is_brigadista

## El Problema

Los trabajadores creados desde el botón "Agregar Instalador" **NO aparecen en la tabla** porque el backend no está guardando el campo `is_brigadista: true`.

---

## ✅ Frontend (Ya está correcto)

El frontend **YA envía** `is_brigadista: true` en todos los requests de creación.

---

## ❌ Backend (Necesita corrección)

El backend **NO está guardando** este campo en la base de datos.

---

## 🔧 Solución: 3 Cambios en el Backend

### 1. POST /api/trabajadores/

```python
@router.post("/")
async def crear_trabajador(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(None),
    is_brigadista: bool = Body(True)  # ← AGREGAR
):
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "is_brigadista": is_brigadista,  # ← AGREGAR
    }
    
    if contrasena:
        trabajador["contraseña"] = contrasena
    
    result = db.trabajadores.insert_one(trabajador)
```

### 2. POST /api/trabajadores/jefes_brigada

```python
@router.post("/jefes_brigada")
async def crear_jefe_brigada(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(...),
    integrantes: List[str] = Body([]),
    is_brigadista: bool = Body(True)  # ← AGREGAR
):
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "contraseña": contrasena,
        "is_brigadista": is_brigadista,  # ← AGREGAR
    }
    
    result = db.trabajadores.insert_one(trabajador)
```

### 3. POST /api/trabajadores/{ci}/convertir_jefe

```python
@router.post("/{ci}/convertir_jefe")
async def convertir_trabajador_a_jefe(
    ci: str,
    contrasena: str = Body(...),
    integrantes: List[dict] = Body([]),
    is_brigadista: bool = Body(True)  # ← AGREGAR
):
    update_data = {
        "contraseña": contrasena,
        "is_brigadista": is_brigadista  # ← AGREGAR
    }
    
    result = db.trabajadores.update_one(
        {"CI": ci},
        {"$set": update_data}
    )
```

---

## ✅ Verificación

Después de hacer los cambios:

### 1. Crear un trabajador de prueba
```bash
curl -X POST "http://localhost:8000/api/trabajadores/" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "99999999",
    "nombre": "Test Trabajador",
    "is_brigadista": true
  }'
```

### 2. Verificar en MongoDB
```javascript
db.trabajadores.findOne({ CI: "99999999" })
```

**Debe mostrar:**
```json
{
  "_id": ObjectId("..."),
  "CI": "99999999",
  "nombre": "Test Trabajador",
  "is_brigadista": true  // ← ESTE CAMPO DEBE EXISTIR
}
```

### 3. Verificar en el frontend
- Ir a "Gestión de Instaladores"
- El trabajador "Test Trabajador" DEBE aparecer en la tabla

---

## 📝 Migración de Datos Existentes (Opcional)

Si ya tienes trabajadores sin el campo, ejecuta en MongoDB:

```javascript
// Marcar todos los trabajadores existentes como brigadistas
db.trabajadores.updateMany(
  { is_brigadista: { $exists: false } },
  { $set: { is_brigadista: true } }
)
```

---

## 🎯 Resumen

1. **Frontend**: ✅ Ya envía `is_brigadista: true`
2. **Backend**: ❌ NO lo guarda (necesita los 3 cambios arriba)
3. **Resultado**: Los trabajadores creados NO aparecen en la tabla

**Una vez corrijas el backend, todo funcionará correctamente.**

---

**Prioridad**: ALTA  
**Fecha**: Enero 2026  
**Módulo**: Gestión de Instaladores
