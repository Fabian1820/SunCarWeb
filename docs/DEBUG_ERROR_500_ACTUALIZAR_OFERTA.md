# Debug: Error 500 al Actualizar Oferta

## Problema Actual

Al intentar actualizar una oferta de confección (especialmente al cambiar el tipo de contacto), el backend responde con **Error 500**.

```
Failed to load resource: the server responded with a status of 500 (OF-20260219-009)
Error: Error al actualizar la oferta
```

## Causa Probable

El error 500 indica que hay un problema en el backend al procesar la actualización. Basándome en los cambios recientes para manejar el cambio de contactos, las causas más probables son:

### 1. Error en la Lógica de Limpieza de Contactos

El código que limpia los contactos anteriores podría estar causando un error:

```python
# En application/services/oferta_confeccion_service.py
# Método: actualizar_oferta_con_stock

# Detectar si viene algún campo de contacto en el update
campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
viene_contacto = any(campo in update_data for campo in campos_contacto)

if viene_contacto:
    # Limpiar TODOS los contactos anteriores primero
    oferta.cliente_numero = None
    oferta.lead_id = None
    oferta.nombre_lead_sin_agregar = None
    
    # Ahora establecer solo el nuevo contacto
    for campo in campos_contacto:
        if campo in update_data:
            setattr(oferta, campo, update_data[campo])
```

**Posibles problemas:**
- El modelo de la oferta no permite `None` en estos campos
- Hay una validación de base de datos que falla
- Hay una relación de clave foránea que no permite `None`
- El commit a la base de datos falla después de limpiar

### 2. Validación que Ocurre Antes de Limpiar

Si la validación de "solo un contacto" ocurre ANTES de limpiar los campos, seguirá fallando.

### 3. Error en el Modelo de Base de Datos

Los campos podrían estar definidos como `NOT NULL` en la base de datos.

## Cómo Debuggear el Backend

### Paso 1: Revisar los Logs del Backend

Busca en los logs del servidor Flask/Python el error completo. Deberías ver:

```
[ERROR] Traceback (most recent call last):
  File "...", line X, in actualizar_oferta_con_stock
    ...
```

El traceback te dirá exactamente qué línea está fallando.

### Paso 2: Verificar el Modelo de la Oferta

Revisa el modelo de `OfertaConfeccion` en tu backend:

```python
# Buscar en: application/models/oferta_confeccion.py (o similar)

class OfertaConfeccion(db.Model):
    # ...
    cliente_numero = db.Column(db.String, nullable=???)  # ¿Es nullable?
    lead_id = db.Column(db.String, nullable=???)         # ¿Es nullable?
    nombre_lead_sin_agregar = db.Column(db.String, nullable=???)  # ¿Es nullable?
```

**Si `nullable=False`**, ese es el problema. Necesitas cambiar a `nullable=True`.

### Paso 3: Verificar Restricciones de Base de Datos

Si usas PostgreSQL/MySQL, verifica las restricciones:

```sql
-- PostgreSQL
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'ofertas_confeccion' 
  AND column_name IN ('cliente_numero', 'lead_id', 'nombre_lead_sin_agregar');

-- MySQL
DESCRIBE ofertas_confeccion;
```

Si algún campo tiene `NOT NULL`, necesitas modificar la tabla:

```sql
ALTER TABLE ofertas_confeccion 
  ALTER COLUMN cliente_numero DROP NOT NULL,
  ALTER COLUMN lead_id DROP NOT NULL,
  ALTER COLUMN nombre_lead_sin_agregar DROP NOT NULL;
```

## Soluciones

### Solución 1: Hacer los Campos Nullable en el Modelo

```python
# En el modelo OfertaConfeccion
class OfertaConfeccion(db.Model):
    # ...
    cliente_numero = db.Column(db.String, nullable=True)
    lead_id = db.Column(db.String, nullable=True)
    nombre_lead_sin_agregar = db.Column(db.String, nullable=True)
```

Luego crear y aplicar una migración:

```bash
# Flask-Migrate
flask db migrate -m "Hacer campos de contacto nullable"
flask db upgrade

# O Alembic
alembic revision --autogenerate -m "Hacer campos de contacto nullable"
alembic upgrade head
```

### Solución 2: Usar Strings Vacíos en Lugar de None

Si no puedes cambiar el modelo, usa strings vacíos:

```python
if viene_contacto:
    # Limpiar TODOS los contactos anteriores primero
    oferta.cliente_numero = ""
    oferta.lead_id = ""
    oferta.nombre_lead_sin_agregar = ""
    
    # Ahora establecer solo el nuevo contacto
    for campo in campos_contacto:
        if campo in update_data:
            valor = update_data[campo]
            setattr(oferta, campo, valor if valor else "")
```

Y ajustar la validación para considerar strings vacíos:

```python
# Validar que solo haya un contacto (considerando strings vacíos como None)
contactos_activos = sum([
    bool(oferta.cliente_numero and oferta.cliente_numero.strip()),
    bool(oferta.lead_id and oferta.lead_id.strip()),
    bool(oferta.nombre_lead_sin_agregar and oferta.nombre_lead_sin_agregar.strip())
])

if oferta.tipo == 'personalizada' and contactos_activos != 1:
    raise ValueError("Una oferta personalizada debe tener exactamente un contacto")
```

### Solución 3: Verificar el Orden de Operaciones

Asegúrate de que la limpieza ocurre ANTES de cualquier validación:

```python
def actualizar_oferta_con_stock(oferta_id, update_data):
    oferta = OfertaConfeccion.query.get(oferta_id)
    
    # 1. PRIMERO: Limpiar contactos si viene uno nuevo
    campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
    viene_contacto = any(campo in update_data for campo in campos_contacto)
    
    if viene_contacto:
        oferta.cliente_numero = None  # o ""
        oferta.lead_id = None  # o ""
        oferta.nombre_lead_sin_agregar = None  # o ""
    
    # 2. SEGUNDO: Actualizar campos
    for campo, valor in update_data.items():
        if hasattr(oferta, campo):
            setattr(oferta, campo, valor)
    
    # 3. TERCERO: Validar
    if oferta.tipo == 'personalizada':
        contactos_activos = sum([
            bool(oferta.cliente_numero),
            bool(oferta.lead_id),
            bool(oferta.nombre_lead_sin_agregar)
        ])
        if contactos_activos != 1:
            raise ValueError("Una oferta personalizada debe tener exactamente un contacto")
    
    # 4. CUARTO: Guardar
    db.session.commit()
    
    return oferta
```

## Verificación

Después de aplicar la solución, prueba:

1. **Crear oferta con cliente** → Funciona ✓
2. **Cambiar de cliente a lead** → Debería funcionar ✓
3. **Cambiar de lead a cliente** → Debería funcionar ✓
4. **Cambiar a lead sin agregar** → Debería funcionar ✓

## Logs Útiles para Debuggear

Agrega estos logs en el backend:

```python
def actualizar_oferta_con_stock(oferta_id, update_data):
    print(f"🔍 Actualizando oferta {oferta_id}")
    print(f"📦 Update data: {update_data}")
    
    oferta = OfertaConfeccion.query.get(oferta_id)
    print(f"📋 Estado actual: cliente={oferta.cliente_numero}, lead={oferta.lead_id}, lead_sin_agregar={oferta.nombre_lead_sin_agregar}")
    
    campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
    viene_contacto = any(campo in update_data for campo in campos_contacto)
    print(f"🔄 Viene contacto nuevo: {viene_contacto}")
    
    if viene_contacto:
        print("🧹 Limpiando contactos anteriores...")
        oferta.cliente_numero = None
        oferta.lead_id = None
        oferta.nombre_lead_sin_agregar = None
        print(f"✅ Contactos limpiados: cliente={oferta.cliente_numero}, lead={oferta.lead_id}, lead_sin_agregar={oferta.nombre_lead_sin_agregar}")
    
    # ... resto del código
    
    print(f"💾 Guardando cambios...")
    try:
        db.session.commit()
        print("✅ Cambios guardados exitosamente")
    except Exception as e:
        print(f"❌ Error al guardar: {e}")
        raise
```

## Próximos Pasos

1. Revisa los logs del backend para ver el error exacto
2. Verifica si los campos son nullable en el modelo y la base de datos
3. Aplica la solución apropiada (preferiblemente Solución 1)
4. Prueba todos los casos de cambio de contacto
5. Reporta aquí los resultados
