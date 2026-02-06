# FIX URGENTE: Error en Endpoint de Ofertas Genéricas Aprobadas

## 🔴 Problema

El endpoint `/api/ofertas/confeccion/genericas/aprobadas` está fallando con error 500:

```
Error: type object 'EstadoOfertaConfeccion' has no attribute 'APROBADA'
```

### Error en Frontend
```javascript
Error fetching ofertas genéricas aprobadas: 
Error: type object 'EstadoOfertaConfeccion' has no attribute 'APROBADA'
```

## 🔍 Causa Raíz

El backend está intentando acceder a un atributo `APROBADA` en el enum `EstadoOfertaConfeccion`, pero según la especificación, el estado correcto es **`aprobada_para_enviar`**.

### Estados Válidos Según Especificación

Según `BACKEND_CONFECCION_OFERTAS_SPEC.md`:

**Para Ofertas Genéricas:**
- `en_revision`: Oferta en proceso de revisión interna
- `aprobada_para_enviar`: Oferta aprobada, lista para usar

**Para Ofertas Personalizadas (todos los anteriores más):**
- `enviada_a_cliente`
- `confirmada_por_cliente`
- `reservada`

## 🔧 Solución Requerida en Backend

### Ubicación del Error

El error está en el endpoint que lista ofertas genéricas aprobadas. Probablemente en un archivo como:
- `routers/ofertas_confeccion.py` o similar
- Función que maneja `GET /ofertas/confeccion/genericas/aprobadas`

### Código Incorrecto (Actual)

```python
@router.get("/genericas/aprobadas")
async def listar_ofertas_genericas_aprobadas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ofertas = db.query(OfertaConfeccion).filter(
        OfertaConfeccion.tipo == "generica",
        OfertaConfeccion.estado == EstadoOfertaConfeccion.APROBADA  # ❌ INCORRECTO
    ).all()
    
    return ofertas
```

### Código Correcto (Requerido)

```python
@router.get("/genericas/aprobadas")
async def listar_ofertas_genericas_aprobadas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ofertas = db.query(OfertaConfeccion).filter(
        OfertaConfeccion.tipo == "generica",
        OfertaConfeccion.estado == "aprobada_para_enviar"  # ✅ CORRECTO
    ).all()
    
    return ofertas
```

### Alternativa con Enum (Si existe)

Si el enum `EstadoOfertaConfeccion` está definido correctamente:

```python
class EstadoOfertaConfeccion(str, Enum):
    EN_REVISION = "en_revision"
    APROBADA_PARA_ENVIAR = "aprobada_para_enviar"  # ✅ Debe existir
    ENVIADA_A_CLIENTE = "enviada_a_cliente"
    CONFIRMADA_POR_CLIENTE = "confirmada_por_cliente"
    RESERVADA = "reservada"
```

Entonces usar:

```python
ofertas = db.query(OfertaConfeccion).filter(
    OfertaConfeccion.tipo == "generica",
    OfertaConfeccion.estado == EstadoOfertaConfeccion.APROBADA_PARA_ENVIAR  # ✅ CORRECTO
).all()
```

## 📋 Checklist de Verificación Backend

1. **Verificar definición del Enum `EstadoOfertaConfeccion`**
   - [ ] Debe tener `APROBADA_PARA_ENVIAR` (no `APROBADA`)
   - [ ] El valor debe ser `"aprobada_para_enviar"`

2. **Actualizar endpoint `/genericas/aprobadas`**
   - [ ] Cambiar filtro de estado a `"aprobada_para_enviar"`
   - [ ] Probar que devuelve ofertas correctamente

3. **Verificar otros endpoints relacionados**
   - [ ] Endpoint de asignación: `/asignar-a-cliente`
   - [ ] Endpoint de cambio de estado: `/{id}/estado`
   - [ ] Cualquier otro que use estados de ofertas

4. **Validar transiciones de estado**
   - [ ] `en_revision` → `aprobada_para_enviar` ✅
   - [ ] `aprobada_para_enviar` → `enviada_a_cliente` ✅ (solo personalizada)

## 🧪 Pruebas Requeridas

### 1. Probar Endpoint Directamente

```bash
curl -X GET "http://localhost:8000/api/ofertas/confeccion/genericas/aprobadas" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta Esperada:**
```json
[
  {
    "id": "...",
    "numero_oferta": "OF-20250206-001",
    "tipo": "generica",
    "estado": "aprobada_para_enviar",
    "nombre_automatico": "...",
    "precio_final": 15000.0,
    ...
  }
]
```

### 2. Crear Oferta Genérica de Prueba

```bash
# 1. Crear oferta genérica
curl -X POST "http://localhost:8000/api/ofertas/confeccion/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_oferta": "generica",
    "estado": "en_revision",
    "almacen_id": "ALMACEN_ID",
    "items": [...]
  }'

# 2. Cambiar estado a aprobada_para_enviar
curl -X PATCH "http://localhost:8000/api/ofertas/confeccion/OFERTA_ID/estado" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "aprobada_para_enviar"
  }'

# 3. Listar ofertas genéricas aprobadas
curl -X GET "http://localhost:8000/api/ofertas/confeccion/genericas/aprobadas" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Probar Asignación a Cliente

```bash
curl -X POST "http://localhost:8000/api/ofertas/confeccion/asignar-a-cliente" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oferta_generica_id": "OFERTA_ID",
    "cliente_numero": "CL-20250206-001"
  }'
```

## 📝 Archivos Backend a Revisar

1. **Definición del Enum**
   - `models/oferta_confeccion.py` o similar
   - Buscar: `class EstadoOfertaConfeccion`

2. **Router de Ofertas**
   - `routers/ofertas_confeccion.py` o similar
   - Buscar: `@router.get("/genericas/aprobadas")`

3. **Validaciones**
   - Cualquier función que valide estados
   - Buscar: `EstadoOfertaConfeccion.APROBADA`

## 🔗 Referencias

- [Especificación Backend Confección](./BACKEND_CONFECCION_OFERTAS_SPEC.md)
- [Asignar Oferta a Cliente](./ASIGNAR_OFERTA_GENERICA_A_CLIENTE.md)
- [Quick Start Asignar Oferta](./QUICK_START_ASIGNAR_OFERTA.md)

## ⚠️ Impacto

Este error está bloqueando:
- ❌ Asignación de ofertas genéricas a clientes desde la tabla de gestión
- ❌ Visualización de ofertas genéricas aprobadas en el modal de selección
- ❌ Flujo completo de duplicación de ofertas genéricas

## ✅ Verificación de Fix

Una vez aplicado el fix, verificar:

1. **Frontend muestra ofertas correctamente**
   - Abrir tabla de clientes
   - Click en "Asignar Oferta"
   - Modal debe mostrar ofertas genéricas aprobadas

2. **Asignación funciona**
   - Seleccionar una oferta
   - Debe crear nueva oferta personalizada
   - Debe asignarla al cliente seleccionado

3. **No hay errores en consola**
   - No debe aparecer error 500
   - No debe aparecer error de atributo

---

**Prioridad:** 🔴 URGENTE - Bloqueante para funcionalidad de gestión de clientes
**Estimación:** 15-30 minutos
**Complejidad:** Baja - Solo cambio de nombre de atributo
