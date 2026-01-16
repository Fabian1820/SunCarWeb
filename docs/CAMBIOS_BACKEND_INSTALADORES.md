# Cambios Necesarios en el Backend - Módulo de Instaladores

## Problema
Los trabajadores creados desde el frontend (módulo de Gestión de Instaladores) no se muestran en la tabla porque el backend no está guardando el campo `is_brigadista: true` que envía el frontend.

## Solución
Modificar los endpoints de creación de trabajadores para que **acepten y guarden** el campo `is_brigadista` que el frontend ya está enviando.

---

## ✅ Frontend Ya Modificado

El frontend **YA ESTÁ ENVIANDO** `is_brigadista: true` en todos los requests de creación:

1. **Crear trabajador simple**: Envía `{ ci, nombre, is_brigadista: true }`
2. **Crear jefe de brigada**: Envía `{ ci, nombre, contrasena, integrantes, is_brigadista: true }`
3. **Convertir a jefe**: Envía `{ contrasena, integrantes, is_brigadista: true }`

---

## Cambios Requeridos en el Backend

### 1. Endpoint: POST /api/trabajadores/

**Archivo**: `backend/routes/trabajadores.py` (o similar)

**Cambio**: Aceptar el campo `is_brigadista` del body request y guardarlo en la base de datos.

#### Antes:
```python
@router.post("/")
async def crear_trabajador(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(None)
):
    # Crear trabajador
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        # ... otros campos
    }
    
    if contrasena:
        trabajador["contraseña"] = contrasena
    
    # Insertar en DB
    result = db.trabajadores.insert_one(trabajador)
```

#### Después:
```python
@router.post("/")
async def crear_trabajador(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(None),
    is_brigadista: bool = Body(True)  # ← NUEVO: Aceptar del frontend
):
    # Crear trabajador
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "is_brigadista": is_brigadista,  # ← NUEVO: Guardar en DB
        # ... otros campos
    }
    
    if contrasena:
        trabajador["contraseña"] = contrasena
    
    # Insertar en DB
    result = db.trabajadores.insert_one(trabajador)
```

---

### 2. Endpoint: POST /api/trabajadores/jefes_brigada

**Archivo**: `backend/routes/trabajadores.py` (o similar)

**Cambio**: Aceptar y guardar el campo `is_brigadista` que envía el frontend.

#### Antes:
```python
@router.post("/jefes_brigada")
async def crear_jefe_brigada(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(...),
    integrantes: List[str] = Body([])
):
    # Crear jefe
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "contraseña": contrasena,
        # ... otros campos
    }
    
    # Insertar en DB
    result = db.trabajadores.insert_one(trabajador)
```

#### Después:
```python
@router.post("/jefes_brigada")
async def crear_jefe_brigada(
    ci: str = Body(...),
    nombre: str = Body(...),
    contrasena: str = Body(...),
    integrantes: List[str] = Body([]),
    is_brigadista: bool = Body(True)  # ← NUEVO: Aceptar del frontend
):
    # Crear jefe
    trabajador = {
        "CI": ci,
        "nombre": nombre,
        "contraseña": contrasena,
        "is_brigadista": is_brigadista,  # ← NUEVO: Guardar en DB
        # ... otros campos
    }
    
    # Insertar en DB
    result = db.trabajadores.insert_one(trabajador)
```

---

### 3. Endpoint: POST /api/trabajadores/{ci}/convertir_jefe

**Archivo**: `backend/routes/trabajadores.py` (o similar)

**Cambio**: Aceptar y guardar el campo `is_brigadista` al convertir un trabajador a jefe.

#### Antes:
```python
@router.post("/{ci}/convertir_jefe")
async def convertir_trabajador_a_jefe(
    ci: str,
    contrasena: str = Body(...),
    integrantes: List[dict] = Body([])
):
    # Actualizar trabajador
    update_data = {
        "contraseña": contrasena
    }
    
    result = db.trabajadores.update_one(
        {"CI": ci},
        {"$set": update_data}
    )
```

#### Después:
```python
@router.post("/{ci}/convertir_jefe")
async def convertir_trabajador_a_jefe(
    ci: str,
    contrasena: str = Body(...),
    integrantes: List[dict] = Body([]),
    is_brigadista: bool = Body(True)  # ← NUEVO: Aceptar del frontend
):
    # Actualizar trabajador
    update_data = {
        "contraseña": contrasena,
        "is_brigadista": is_brigadista  # ← NUEVO: Guardar en DB
    }
    
    result = db.trabajadores.update_one(
        {"CI": ci},
        {"$set": update_data}
    )
```

---

## Alternativa: Migración de Datos Existentes

Si ya tienes trabajadores en la base de datos sin el campo `is_brigadista`, puedes ejecutar este script de migración:

```python
# Script de migración (ejecutar una sola vez)
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["suncar_db"]

# Actualizar todos los trabajadores existentes para que tengan is_brigadista: true
result = db.trabajadores.update_many(
    {"is_brigadista": {"$exists": False}},  # Solo los que no tienen el campo
    {"$set": {"is_brigadista": True}}
)

print(f"Trabajadores actualizados: {result.modified_count}")
```

---

## Validación

Después de hacer los cambios, verifica que:

1. **Crear trabajador simple**:
   ```bash
   curl -X POST "http://localhost:8000/api/trabajadores/" \
     -H "Content-Type: application/json" \
     -d '{
       "ci": "12345678",
       "nombre": "Juan Pérez"
     }'
   ```
   
   Debe crear un trabajador con `is_brigadista: true`

2. **Crear jefe de brigada**:
   ```bash
   curl -X POST "http://localhost:8000/api/trabajadores/jefes_brigada" \
     -H "Content-Type: application/json" \
     -d '{
       "ci": "87654321",
       "nombre": "María García",
       "contrasena": "password123",
       "integrantes": []
     }'
   ```
   
   Debe crear un jefe con `is_brigadista: true`

3. **Verificar en la base de datos**:
   ```javascript
   db.trabajadores.find({}, { CI: 1, nombre: 1, is_brigadista: 1 })
   ```
   
   Todos los trabajadores deben tener `is_brigadista: true`

---

## Impacto

- **Frontend**: No requiere cambios, ya está preparado para filtrar por `is_brigadista: true`
- **Backend**: Solo requiere agregar el campo en los endpoints de creación
- **Base de datos**: Puede requerir migración de datos existentes

---

## Notas

- El campo `is_brigadista` se usa para diferenciar entre trabajadores que son instaladores/brigadistas vs otros tipos de trabajadores (administrativos, etc.)
- Por defecto, todos los trabajadores creados desde el módulo de "Gestión de Instaladores" deben ser brigadistas
- Si en el futuro necesitas crear trabajadores NO brigadistas, puedes enviar `is_brigadista: false` en el body del request

---

**Fecha**: Enero 2026
**Módulo**: Gestión de Instaladores
**Prioridad**: Alta
